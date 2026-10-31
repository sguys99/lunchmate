// T6.7 RLS 테스트: reviews, review_reports, place_reports, place_deals, place_deal_checks, wait_reports
// + 보안 함수 place_stats, place_reviews, place_deals_list, register_deal, report_wait, my_daily_limits
// 마이그레이션: supabase/migrations/20261101120000_t6_5_reviews_reports_deals_waits.sql
//
// 실행: pnpm test:rls (RUN_RLS_TESTS=1). 평소 pnpm test에서는 건너뛴다. 이 마이그레이션이 클라우드 개발 DB에
// 적용되기 전(reviews가 PGRST205)에도 자동으로 건너뛴다.
//
// 역할 3가지 (CLAUDE.md 10장): 본인 = 작성자 세션, 타인 = 다른 테스트 사용자 세션, 비로그인 = 세션 없이 publishable 키만.
// 단언은 전부 publishable 키 + 세션으로 한다. secret 키는 사용자 생성, 삭제, 잔여 행 세기,
// 그리고 시간 경과 흉내(방문일, 제보 시각, 종료일을 과거로 돌리는 adminPatch)에만 쓴다.
//
// 핵심 AC
// - AC-FB-2: 비공개 후기의 글은 다른 사용자, 비로그인이 닿는 어떤 응답(테이블, place_reviews, place_stats,
//   place_deals_list)에도 없고, 가격, 👍, 태그는 집계에 들어간다.
// - AC-DEAL-1: 종료일이 지난 할인은 pg_cron 전에도 목록, 개수에 나오지 않는다.
// - AC-DEAL-3: 서로 다른 3명이 끝났어요를 누르면 바로 숨겨진다.
// - 일일 한도(MOD-05, DEAL-04)는 my_daily_limits로 남은 수를 읽고 그만큼 쓴 뒤 한 번 더가 거절되는지 본다.
//   테스트 사용자의 그날 한도를 소진하므로 같은 계정을 다시 쓰지 않는다(매 실행 새 사용자).
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  adminCount,
  adminPatch,
  createTestUser,
  deleteAuthUser,
  loadRlsEnv,
  newRunId,
  rest,
  rpc,
  schemaReady,
  type RlsEnv,
  type TestUser,
} from "./harness";

const env = loadRlsEnv();
const ready = env !== null && (await schemaReady(env, "reviews"));

const PERMISSION_DENIED = "42501";
const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";

type Row = Record<string, unknown>;
type ReviewRow = {
  id: string;
  user_id: string;
  visit_id: string;
  place_id: string;
  rating: "up" | "down";
  price_krw: number | null;
  tags: string[];
  body: string | null;
  is_public: boolean;
  hidden_at: string | null;
  hidden_reason: string | null;
};
type StatsRow = {
  place_id: string;
  price_count: number;
  price_median: number | null;
  price_points: number[];
  thumbs_up: number;
  thumbs_down: number;
  top_tags: { tag: string; count: number }[];
  closed_reports: number;
  closed: boolean;
  wait_level: "now" | "short" | "long" | null;
  wait_reported_at: string | null;
  wait_minutes_ago: number | null;
  deal_count: number;
};
type PublicReview = {
  id: string;
  nickname: string | null;
  visit_month: number;
  rating: string;
  body: string;
  is_mine: boolean;
  reported_by_me: boolean;
};
type DealResult = {
  deal_id: string | null;
  merged_with: string | null;
  ends_on: string | null;
};
type DealListRow = {
  id: string;
  source: string;
  type: string;
  content: string;
  ends_on: string;
  still_count: number;
  ended_count: number;
  my_answer: string | null;
  is_mine: boolean;
};
type WaitResult = {
  accepted: boolean;
  report_id: string | null;
  reported_at: string;
  retry_at: string;
};
type LimitRow = {
  bucket: "reviews" | "reports" | "deals";
  used: number;
  limit_count: number;
  remaining: number;
};

function kstDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

const minutesAgo = (m: number) =>
  new Date(Date.now() - m * 60_000).toISOString();

describe.skipIf(!ready)(
  "T6.5~T6.7 후기, 신고, 제보, 할인, 웨이팅 RLS (본인, 타인, 비로그인)",
  { timeout: 60_000 },
  () => {
    const e = env as RlsEnv;
    const runId = newRunId();
    // 집계는 place_id 단위로 모두가 공유하므로 실행마다 겹치지 않는 장소 id를 쓴다
    const placeBase = `9${String(Date.now()).slice(-9)}${String(Math.floor(Math.random() * 90) + 10)}`;
    const place = (n: number) => `${placeBase}${String(n).padStart(3, "0")}`;
    // 비공개 후기 글. 어떤 다른 사람 응답에도 이 문자열이 나오면 실패한다(AC-FB-2)
    const SECRET = `비공개글 ${runId}`;
    const PUBLIC = `공개글 ${runId}`;

    let a: TestUser;
    let b: TestUser;
    let c: TestUser;
    let d: TestUser;
    const created: string[] = [];

    const P_REVIEW = place(1);
    const P_OLD = place(2);
    const P_DEAL = place(3);
    const P_EXPIRE = place(4);
    const P_DEAL_REPORT = place(5);
    const P_WAIT = place(6);
    const P_CLOSED = place(7);

    let aVisitId = "";
    let aReviewId = "";
    let bReviewId = "";

    async function visit(user: TestUser, placeId: string, source = "rec") {
      const r = await rest<{ id: string }[]>(e, "visits", {
        method: "POST",
        token: user.token,
        body: { place_id: placeId, meal: "lunch", source },
      });
      expect(r.error).toBeNull();
      return r.data?.[0]?.id ?? "";
    }

    async function stats(placeIds: string[], token?: string) {
      const r = await rpc<StatsRow[]>(
        e,
        "place_stats",
        { p_place_ids: placeIds },
        token,
      );
      expect(r.error).toBeNull();
      return r.data ?? [];
    }

    async function publicReviews(placeId: string, token: string) {
      const r = await rpc<PublicReview[]>(
        e,
        "place_reviews",
        { p_place_id: placeId, p_limit: 20 },
        token,
      );
      expect(r.error).toBeNull();
      return r.data ?? [];
    }

    async function dealList(placeId: string, token?: string) {
      const r = await rpc<DealListRow[]>(
        e,
        "place_deals_list",
        { p_place_id: placeId },
        token,
      );
      expect(r.error).toBeNull();
      return r.data ?? [];
    }

    async function registerDeal(user: TestUser, args: Record<string, unknown>) {
      return rpc<DealResult[]>(e, "register_deal", args, user.token);
    }

    async function limits(user: TestUser) {
      const r = await rpc<LimitRow[]>(e, "my_daily_limits", {}, user.token);
      expect(r.error).toBeNull();
      return r.data ?? [];
    }

    beforeAll(async () => {
      [a, b, c, d] = await Promise.all([
        createTestUser(e, runId, "a"),
        createTestUser(e, runId, "b"),
        createTestUser(e, runId, "c"),
        createTestUser(e, runId, "d"),
      ]);
      created.push(a.id, b.id, c.id, d.id);
    }, 60_000);

    afterAll(async () => {
      await Promise.all(created.map((id) => deleteAuthUser(e, id)));
    }, 60_000);

    // ── reviews ───────────────────────────────────────────────
    describe("reviews", () => {
      it("본인은 방문에 비공개 후기를 남긴다. place_id, 태그 정리, 방문 상태는 서버가 정한다", async () => {
        aVisitId = await visit(a, P_REVIEW);
        const r = await rest<ReviewRow[]>(e, "reviews", {
          method: "POST",
          token: a.token,
          body: {
            visit_id: aVisitId,
            rating: "up",
            price_krw: 9000,
            tags: ["quiet", "solo_ok", "quiet"],
            body: SECRET,
            is_public: false,
          },
        });
        expect(r.error).toBeNull();
        const row = r.data?.[0];
        expect(row).toMatchObject({
          user_id: a.id,
          place_id: P_REVIEW,
          tags: ["quiet", "solo_ok"],
          body: SECRET,
          is_public: false,
          hidden_at: null,
        });
        aReviewId = row?.id ?? "";
        const v = await rest<{ status: string }[]>(
          e,
          `visits?id=eq.${aVisitId}&select=status`,
          { token: a.token },
        );
        expect(v.data?.[0]?.status).toBe("visited");
      });

      it("한 방문에 후기는 하나", async () => {
        const r = await rest(e, "reviews", {
          method: "POST",
          token: a.token,
          body: { visit_id: aVisitId, rating: "down" },
        });
        expect(r.error?.code).toBe(UNIQUE_VIOLATION);
      });

      it("범위 밖 가격, 목록 밖 태그, 100자 넘는 글은 거절한다", async () => {
        const v = await visit(a, place(20));
        for (const extra of [
          { price_krw: 500 },
          { price_krw: 100_001 },
          { tags: ["delicious"] },
          { body: "가".repeat(101) },
          { body: "" },
          { rating: "meh" },
        ]) {
          const r = await rest(e, "reviews", {
            method: "POST",
            token: a.token,
            body: { visit_id: v, rating: "up", ...extra },
          });
          expect(r.error?.code).toBe(CHECK_VIOLATION);
        }
      });

      it("본인도 place_id, 숨김 값은 넣거나 바꿀 수 없다(열 권한)", async () => {
        const ins = await rest(e, "reviews", {
          method: "POST",
          token: a.token,
          body: { visit_id: aVisitId, rating: "up", place_id: place(99) },
        });
        expect(ins.error?.code).toBe(PERMISSION_DENIED);
        for (const body of [
          { hidden_at: new Date().toISOString() },
          { place_id: place(99) },
          { visit_id: aVisitId },
        ]) {
          const r = await rest(e, `reviews?id=eq.${aReviewId}`, {
            method: "PATCH",
            token: a.token,
            body,
          });
          expect(r.error?.code).toBe(PERMISSION_DENIED);
        }
      });

      it("방문일 포함 14일까지는 남기고, 15일 지난 방문은 거절한다(늦은 답)", async () => {
        const v = await visit(a, P_OLD);
        await adminPatch(e, "visits", `id=eq.${v}`, {
          visited_on: kstDate(-15),
        });
        const old = await rest(e, "reviews", {
          method: "POST",
          token: a.token,
          body: { visit_id: v, rating: "up" },
        });
        expect(old.error?.code).toBe(CHECK_VIOLATION);
        expect(old.error?.message).toContain("reviews_visit_too_old");

        await adminPatch(e, "visits", `id=eq.${v}`, {
          visited_on: kstDate(-14),
        });
        const ok = await rest<ReviewRow[]>(e, "reviews", {
          method: "POST",
          token: a.token,
          body: { visit_id: v, rating: "up" },
        });
        expect(ok.error).toBeNull();
      });

      it("타인은 A의 방문에 후기를 남길 수 없고, A의 후기를 읽거나 고치거나 지우지 못한다", async () => {
        const ins = await rest(e, "reviews", {
          method: "POST",
          token: b.token,
          body: { visit_id: aVisitId, rating: "down" },
        });
        expect(ins.error?.code).toBe(CHECK_VIOLATION);
        expect(ins.error?.message).toContain("reviews_visit_not_found");

        const read = await rest<ReviewRow[]>(e, `reviews?select=*`, {
          token: b.token,
        });
        expect(read.data).toEqual([]);
        const byId = await rest<ReviewRow[]>(
          e,
          `reviews?id=eq.${aReviewId}&select=*`,
          { token: b.token },
        );
        expect(byId.data).toEqual([]);
        const patch = await rest<ReviewRow[]>(e, `reviews?id=eq.${aReviewId}`, {
          method: "PATCH",
          token: b.token,
          body: { is_public: true },
        });
        expect(patch.data).toEqual([]);
        const del = await rest<ReviewRow[]>(e, `reviews?id=eq.${aReviewId}`, {
          method: "DELETE",
          token: b.token,
        });
        expect(del.data).toEqual([]);
      });

      it("비로그인은 reviews 권한이 없다", async () => {
        expect((await rest(e, "reviews?select=*")).error?.code).toBe(
          PERMISSION_DENIED,
        );
        const ins = await rest(e, "reviews", {
          method: "POST",
          body: { visit_id: aVisitId, rating: "up" },
        });
        expect(ins.error?.code).toBe(PERMISSION_DENIED);
      });

      it("상세에서 쓴 후기: source detail 방문을 만들고 공개 후기를 남긴다 (FB-06)", async () => {
        const v = await visit(b, P_REVIEW, "detail");
        const r = await rest<ReviewRow[]>(e, "reviews", {
          method: "POST",
          token: b.token,
          body: {
            visit_id: v,
            rating: "down",
            price_krw: 12000,
            tags: ["big_portion"],
            body: PUBLIC,
          },
        });
        expect(r.error).toBeNull();
        expect(r.data?.[0]?.is_public).toBe(true);
        bReviewId = r.data?.[0]?.id ?? "";
      });
    });

    // ── AC-FB-2 ───────────────────────────────────────────────
    describe("AC-FB-2 비공개 후기 글은 어떤 응답에도 없고, 숫자는 집계에 들어간다", () => {
      it("place_stats(타인, 비로그인): A의 비공개 가격, 👍, 태그는 들어가고 글은 없다", async () => {
        for (const token of [b.token, undefined]) {
          const rows = await stats([P_REVIEW], token);
          expect(JSON.stringify(rows)).not.toContain(SECRET);
          expect(rows[0]).toMatchObject({
            place_id: P_REVIEW,
            thumbs_up: 1,
            thumbs_down: 1,
            price_count: 2,
            price_points: [9000, 12000],
            price_median: 10500,
          });
          const tags = rows[0]?.top_tags.map((t) => t.tag) ?? [];
          expect(tags).toEqual(
            expect.arrayContaining(["quiet", "solo_ok", "big_portion"]),
          );
          // 작성자 정보 없음
          expect(Object.keys(rows[0] ?? {})).not.toContain("user_id");
        }
      });

      it("place_reviews(타인): 공개 후기만, 닉네임과 방문 월만. 비공개 글은 없다", async () => {
        const rows = await publicReviews(P_REVIEW, a.token);
        expect(JSON.stringify(rows)).not.toContain(SECRET);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
          nickname: b.nickname,
          rating: "down",
          body: PUBLIC,
          is_mine: false,
          reported_by_me: false,
          visit_month: Number(kstDate().slice(5, 7)),
        });
        expect(Object.keys(rows[0] ?? {})).not.toContain("user_id");
        const asB = await publicReviews(P_REVIEW, b.token);
        expect(JSON.stringify(asB)).not.toContain(SECRET);
        expect(asB[0]?.is_mine).toBe(true);
      });

      it("place_reviews는 비로그인이 부를 수 없다(닉네임 노출 기준, public_profiles와 같음)", async () => {
        const r = await rpc(e, "place_reviews", { p_place_id: P_REVIEW });
        expect(r.error?.code).toBe(PERMISSION_DENIED);
      });

      it("place_deals_list, reviews 테이블(타인)에도 없다", async () => {
        expect(JSON.stringify(await dealList(P_REVIEW, b.token))).not.toContain(
          SECRET,
        );
        const t = await rest(e, `reviews?select=*&place_id=eq.${P_REVIEW}`, {
          token: b.token,
        });
        expect(JSON.stringify(t.data)).not.toContain(SECRET);
      });

      it("본인은 자기 비공개 글을 읽고, 공개로 바꾸면 그때만 남에게 보인다 (FB-07)", async () => {
        const mine = await rest<ReviewRow[]>(
          e,
          `reviews?id=eq.${aReviewId}&select=body`,
          { token: a.token },
        );
        expect(mine.data?.[0]?.body).toBe(SECRET);

        await rest(e, `reviews?id=eq.${aReviewId}`, {
          method: "PATCH",
          token: a.token,
          body: { is_public: true },
        });
        expect(
          JSON.stringify(await publicReviews(P_REVIEW, b.token)),
        ).toContain(SECRET);
        await rest(e, `reviews?id=eq.${aReviewId}`, {
          method: "PATCH",
          token: a.token,
          body: { is_public: false },
        });
        expect(
          JSON.stringify(await publicReviews(P_REVIEW, b.token)),
        ).not.toContain(SECRET);
      });
    });

    // ── review_reports ────────────────────────────────────────
    describe("review_reports (후기 신고, MOD-01, MOD-02)", () => {
      it("비공개 후기는 신고 대상이 아니다(존재를 알리지 않는 같은 오류)", async () => {
        const r = await rest(e, "review_reports", {
          method: "POST",
          token: b.token,
          body: { target_type: "review", review_id: aReviewId, reason: "spam" },
        });
        expect(r.error?.code).toBe(CHECK_VIOLATION);
        expect(r.error?.message).toContain("report_target_unavailable");
      });

      it("자기 후기는 신고할 수 없고, 후기에 할인 사유는 쓸 수 없다", async () => {
        const own = await rest(e, "review_reports", {
          method: "POST",
          token: b.token,
          body: { target_type: "review", review_id: bReviewId, reason: "spam" },
        });
        expect(own.error?.message).toContain("report_own_target");
        const wrong = await rest(e, "review_reports", {
          method: "POST",
          token: a.token,
          body: {
            target_type: "review",
            review_id: bReviewId,
            reason: "ad_false",
          },
        });
        expect(wrong.error?.code).toBe(CHECK_VIOLATION);
      });

      it("신고하면 나에게 reported_by_me로 표시되고, 같은 후기는 두 번 신고할 수 없다", async () => {
        const r = await rest(e, "review_reports", {
          method: "POST",
          token: a.token,
          body: { target_type: "review", review_id: bReviewId, reason: "spam" },
        });
        expect(r.error).toBeNull();
        const list = await publicReviews(P_REVIEW, a.token);
        expect(list.find((x) => x.id === bReviewId)?.reported_by_me).toBe(true);
        const dup = await rest(e, "review_reports", {
          method: "POST",
          token: a.token,
          body: {
            target_type: "review",
            review_id: bReviewId,
            reason: "false",
          },
        });
        expect(dup.error?.code).toBe(UNIQUE_VIOLATION);
      });

      it("신고는 신고자만 읽는다. 타인은 [], 비로그인은 권한 없음. 취소(삭제)는 없다", async () => {
        const mine = await rest<Row[]>(e, "review_reports?select=*", {
          token: a.token,
        });
        expect(mine.data).toHaveLength(1);
        const other = await rest<Row[]>(
          e,
          `review_reports?select=*&user_id=eq.${a.id}`,
          { token: b.token },
        );
        expect(other.data).toEqual([]);
        expect((await rest(e, "review_reports?select=*")).error?.code).toBe(
          PERMISSION_DENIED,
        );
        const del = await rest(e, `review_reports?user_id=eq.${a.id}`, {
          method: "DELETE",
          token: a.token,
        });
        expect(del.error?.code).toBe(PERMISSION_DENIED);
      });

      it("서로 다른 3명이 신고하면 숨겨져 공개 목록과 집계에서 빠지고, 작성자는 숨김 사유를 본다", async () => {
        for (const [user, reason] of [
          [c, "abuse"],
          [d, "other"],
        ] as const) {
          const r = await rest(e, "review_reports", {
            method: "POST",
            token: user.token,
            body: {
              target_type: "review",
              review_id: bReviewId,
              reason,
              ...(reason === "other" ? { note: "확인 부탁" } : {}),
            },
          });
          expect(r.error).toBeNull();
        }
        const list = await publicReviews(P_REVIEW, a.token);
        expect(list.find((x) => x.id === bReviewId)).toBeUndefined();
        const s = (await stats([P_REVIEW]))[0];
        expect(s).toMatchObject({ thumbs_down: 0, price_points: [9000] });
        const own = await rest<ReviewRow[]>(
          e,
          `reviews?id=eq.${bReviewId}&select=hidden_reason,body`,
          { token: b.token },
        );
        expect(own.data?.[0]).toMatchObject({
          hidden_reason: "reports",
          body: PUBLIC,
        });
      });
    });

    // ── place_deals, place_deal_checks ────────────────────────
    describe("place_deals (DEAL-01~04)", () => {
      let aDealId = "";
      let bDealId = "";

      it("등록은 함수로만. 종료일 기본 7일, 테이블 직접 삽입은 권한 없음", async () => {
        const r = await registerDeal(a, {
          p_place_id: P_DEAL,
          p_type: "lunch_special",
          p_content: "순대국 정식 9천 원",
        });
        expect(r.error).toBeNull();
        expect(r.data?.[0]).toMatchObject({
          merged_with: null,
          ends_on: kstDate(7),
        });
        aDealId = r.data?.[0]?.deal_id ?? "";
        const direct = await rest(e, "place_deals", {
          method: "POST",
          token: a.token,
          body: {
            user_id: a.id,
            place_id: P_DEAL,
            type: "discount",
            content: "x",
            starts_on: kstDate(),
            ends_on: kstDate(1),
          },
        });
        expect(direct.error?.code).toBe(PERMISSION_DENIED);
      });

      it("같은 식당 같은 유형은 병합: 새 행 없이 merged_with를 돌려준다 (안건 2)", async () => {
        const r = await registerDeal(b, {
          p_place_id: P_DEAL,
          p_type: "lunch_special",
          p_content: "다른 말로 같은 특선",
        });
        expect(r.data?.[0]).toMatchObject({
          deal_id: null,
          merged_with: aDealId,
        });
        expect(await dealList(P_DEAL)).toHaveLength(1);
      });

      it("목록(비로그인 포함)은 작성자 id 없이 출처, 확인 수만. 테이블은 작성자만 읽는다", async () => {
        const list = await dealList(P_DEAL);
        expect(list[0]).toMatchObject({
          id: aDealId,
          source: "user",
          type: "lunch_special",
          still_count: 0,
          ended_count: 0,
          my_answer: null,
          is_mine: false,
        });
        expect(Object.keys(list[0] ?? {})).not.toContain("user_id");
        expect((await dealList(P_DEAL, a.token))[0]?.is_mine).toBe(true);
        const other = await rest<Row[]>(
          e,
          `place_deals?select=*&id=eq.${aDealId}`,
          { token: b.token },
        );
        expect(other.data).toEqual([]);
        expect((await rest(e, "place_deals?select=*")).error?.code).toBe(
          PERMISSION_DENIED,
        );
        const patch = await rest(e, `place_deals?id=eq.${aDealId}`, {
          method: "PATCH",
          token: a.token,
          body: { status: "active" },
        });
        expect(patch.error?.code).toBe(PERMISSION_DENIED);
      });

      it("다른 내용이라 새로 남기기: 기존은 superseded로 숨기고 새 제보만 보인다 (안건 3)", async () => {
        const r = await registerDeal(b, {
          p_place_id: P_DEAL,
          p_type: "lunch_special",
          p_content: "새 특선 1만 원",
          p_days: 31,
          p_slots: ["lunch", "lunch"],
          p_replace: true,
        });
        expect(r.error).toBeNull();
        bDealId = r.data?.[0]?.deal_id ?? "";
        expect(bDealId).not.toBe("");
        const list = await dealList(P_DEAL);
        expect(list.map((x) => x.id)).toEqual([bDealId]);
        const old = await rest<{ status: string; hidden_reason: string }[]>(
          e,
          `place_deals?id=eq.${aDealId}&select=status,hidden_reason`,
          { token: a.token },
        );
        expect(old.data?.[0]).toEqual({
          status: "hidden",
          hidden_reason: "superseded",
        });
      });

      it("종료일 30일 초과, 과거 종료일, 60자 초과 내용은 거절한다", async () => {
        for (const args of [
          { p_ends_on: kstDate(31) },
          { p_ends_on: kstDate(-1) },
          { p_content: "가".repeat(61) },
        ]) {
          const r = await registerDeal(a, {
            p_place_id: P_DEAL,
            p_type: "discount",
            p_content: "포장 할인",
            ...args,
          });
          expect(r.error?.code).toBe(CHECK_VIOLATION);
        }
      });

      it("비로그인은 등록할 수 없다", async () => {
        const r = await rpc(e, "register_deal", {
          p_place_id: P_DEAL,
          p_type: "event",
          p_content: "x",
        });
        expect(r.error?.code).toBe(PERMISSION_DENIED);
      });

      it("아직 해요/끝났어요: 1인 1응답, 되돌리기는 삭제, 남의 응답은 개수로만 (DEAL-03)", async () => {
        const ins = await rest(e, "place_deal_checks", {
          method: "POST",
          token: a.token,
          body: { deal_id: bDealId, answer: "still" },
        });
        expect(ins.error).toBeNull();
        const dup = await rest(e, "place_deal_checks", {
          method: "POST",
          token: a.token,
          body: { deal_id: bDealId, answer: "ended" },
        });
        expect(dup.error?.code).toBe(UNIQUE_VIOLATION);
        expect((await dealList(P_DEAL, a.token))[0]).toMatchObject({
          still_count: 1,
          my_answer: "still",
        });
        const other = await rest<Row[]>(
          e,
          `place_deal_checks?select=*&user_id=eq.${a.id}`,
          { token: c.token },
        );
        expect(other.data).toEqual([]);
        expect((await rest(e, "place_deal_checks?select=*")).error?.code).toBe(
          PERMISSION_DENIED,
        );
        const undo = await rest<Row[]>(
          e,
          `place_deal_checks?deal_id=eq.${bDealId}`,
          { method: "DELETE", token: a.token },
        );
        expect(undo.data).toHaveLength(1);
      });

      it("AC-DEAL-3: 서로 다른 3명이 끝났어요를 누르면 바로 숨겨진다", async () => {
        for (const user of [a, c]) {
          const r = await rest(e, "place_deal_checks", {
            method: "POST",
            token: user.token,
            body: { deal_id: bDealId, answer: "ended" },
          });
          expect(r.error).toBeNull();
        }
        // 아직 해요는 끝났어요 수를 깎지 않는다
        await rest(e, "place_deal_checks", {
          method: "POST",
          token: d.token,
          body: { deal_id: bDealId, answer: "still" },
        });
        expect(await dealList(P_DEAL)).toHaveLength(1);
        // 응답 바꾸기(수정)로 세 번째 끝났어요
        const change = await rest(
          e,
          `place_deal_checks?deal_id=eq.${bDealId}`,
          { method: "PATCH", token: d.token, body: { answer: "ended" } },
        );
        expect(change.error).toBeNull();
        expect(await dealList(P_DEAL)).toEqual([]);
        expect((await stats([P_DEAL]))[0]?.deal_count).toBe(0);
        const own = await rest<{ hidden_reason: string }[]>(
          e,
          `place_deals?id=eq.${bDealId}&select=hidden_reason`,
          { token: b.token },
        );
        expect(own.data?.[0]?.hidden_reason).toBe("ended_checks");
        const late = await rest(e, "place_deal_checks", {
          method: "POST",
          token: b.token,
          body: { deal_id: bDealId, answer: "still" },
        });
        expect(late.error?.message).toContain("deal_not_open");
      });

      it("AC-DEAL-1: 종료일이 지난 할인은 pg_cron 전에도 목록과 개수에 없고, 같은 키로 새로 등록된다", async () => {
        const r = await registerDeal(c, {
          p_place_id: P_EXPIRE,
          p_type: "event",
          p_content: "오픈 기념 음료 무료",
        });
        const id = r.data?.[0]?.deal_id ?? "";
        expect((await stats([P_EXPIRE]))[0]?.deal_count).toBe(1);
        await adminPatch(e, "place_deals", `id=eq.${id}`, {
          starts_on: kstDate(-5),
          ends_on: kstDate(-1),
        });
        expect(await dealList(P_EXPIRE)).toEqual([]);
        expect(await dealList(P_EXPIRE, c.token)).toEqual([]);
        expect((await stats([P_EXPIRE]))[0]?.deal_count).toBe(0);
        const again = await registerDeal(d, {
          p_place_id: P_EXPIRE,
          p_type: "event",
          p_content: "새 이벤트",
        });
        expect(again.data?.[0]?.merged_with).toBeNull();
        expect(again.data?.[0]?.deal_id).toBeTruthy();
      });

      it("할인 신고: 광고성/허위 사유, 3명이면 숨김 (DEAL-04, MOD-02)", async () => {
        const r = await registerDeal(a, {
          p_place_id: P_DEAL_REPORT,
          p_type: "other",
          p_content: "사장님께 연락하면 할인",
        });
        const id = r.data?.[0]?.deal_id ?? "";
        const badReason = await rest(e, "review_reports", {
          method: "POST",
          token: b.token,
          body: { target_type: "deal", deal_id: id, reason: "spam" },
        });
        expect(badReason.error?.code).toBe(CHECK_VIOLATION);
        for (const user of [b, c, d]) {
          const rr = await rest(e, "review_reports", {
            method: "POST",
            token: user.token,
            body: { target_type: "deal", deal_id: id, reason: "ad_false" },
          });
          expect(rr.error).toBeNull();
        }
        expect(await dealList(P_DEAL_REPORT)).toEqual([]);
      });
    });

    // ── wait_reports ──────────────────────────────────────────
    describe("wait_reports (PLACE-07, 안건 8)", () => {
      let firstId = "";

      it("한 탭 제보, 30분 안 같은 식당은 거절하고 retry_at을 돌려준다", async () => {
        const first = await rpc<WaitResult[]>(
          e,
          "report_wait",
          { p_place_id: P_WAIT, p_level: "long" },
          a.token,
        );
        expect(first.error).toBeNull();
        expect(first.data?.[0]?.accepted).toBe(true);
        firstId = first.data?.[0]?.report_id ?? "";
        const again = await rpc<WaitResult[]>(
          e,
          "report_wait",
          { p_place_id: P_WAIT, p_level: "now" },
          a.token,
        );
        const row = again.data?.[0];
        expect(row?.accepted).toBe(false);
        expect(row?.report_id).toBeNull();
        expect(
          new Date(row?.retry_at ?? 0).getTime() -
            new Date(row?.reported_at ?? 0).getTime(),
        ).toBe(30 * 60_000);
      });

      it("타인, 비로그인은 최신 1건 요약(수준, 몇 분 전)만 보고 행은 못 읽는다", async () => {
        for (const token of [b.token, undefined]) {
          const s = (await stats([P_WAIT], token))[0];
          expect(s?.wait_level).toBe("long");
          expect(s?.wait_minutes_ago).toBeLessThanOrEqual(1);
          expect(Object.keys(s ?? {})).not.toContain("user_id");
        }
        const rows = await rest<Row[]>(
          e,
          `wait_reports?select=*&place_id=eq.${P_WAIT}`,
          { token: b.token },
        );
        expect(rows.data).toEqual([]);
        expect((await rest(e, "wait_reports?select=*")).error?.code).toBe(
          PERMISSION_DENIED,
        );
        const anonReport = await rpc(e, "report_wait", {
          p_place_id: P_WAIT,
          p_level: "now",
        });
        expect(anonReport.error?.code).toBe(PERMISSION_DENIED);
        const direct = await rest(e, "wait_reports", {
          method: "POST",
          token: b.token,
          body: { user_id: b.id, place_id: P_WAIT, level: "now" },
        });
        expect(direct.error?.code).toBe(PERMISSION_DENIED);
      });

      it("2분 안 되돌리기는 행을 지우고 제한도 풀린다. 타인은 지우지 못한다", async () => {
        const other = await rest<Row[]>(e, `wait_reports?id=eq.${firstId}`, {
          method: "DELETE",
          token: b.token,
        });
        expect(other.data).toEqual([]);
        const undo = await rest<Row[]>(e, `wait_reports?id=eq.${firstId}`, {
          method: "DELETE",
          token: a.token,
        });
        expect(undo.data).toHaveLength(1);
        const again = await rpc<WaitResult[]>(
          e,
          "report_wait",
          { p_place_id: P_WAIT, p_level: "short" },
          a.token,
        );
        expect(again.data?.[0]?.accepted).toBe(true);
        firstId = again.data?.[0]?.report_id ?? "";
      });

      it("2분이 지나면 되돌릴 수 없다", async () => {
        await adminPatch(e, "wait_reports", `id=eq.${firstId}`, {
          created_at: minutesAgo(3),
        });
        const late = await rest<Row[]>(e, `wait_reports?id=eq.${firstId}`, {
          method: "DELETE",
          token: a.token,
        });
        expect(late.data).toEqual([]);
      });

      it("30분 지난 제보는 요약에서 빠지고, 다시 제보할 수 있다", async () => {
        await adminPatch(e, "wait_reports", `id=eq.${firstId}`, {
          created_at: minutesAgo(31),
        });
        expect((await stats([P_WAIT]))[0]?.wait_level).toBeNull();
        const again = await rpc<WaitResult[]>(
          e,
          "report_wait",
          { p_place_id: P_WAIT, p_level: "now" },
          a.token,
        );
        expect(again.data?.[0]?.accepted).toBe(true);
        expect((await stats([P_WAIT]))[0]?.wait_level).toBe("now");
      });
    });

    // ── place_reports ─────────────────────────────────────────
    describe("place_reports (PLACE-05, MOD-03)", () => {
      it("문 닫았어요 서로 다른 3명이면 closed. '오늘만 쉬어요'는 세지 않는다", async () => {
        for (const [user, detail] of [
          [a, { closed: "gone" }],
          [b, {}],
          [c, { closed: "today" }],
        ] as const) {
          const r = await rest(e, "place_reports", {
            method: "POST",
            token: user.token,
            body: { place_id: P_CLOSED, kind: "closed", detail },
          });
          expect(r.error).toBeNull();
        }
        expect((await stats([P_CLOSED]))[0]).toMatchObject({
          closed_reports: 2,
          closed: false,
        });
        await rest(e, "place_reports", {
          method: "POST",
          token: d.token,
          body: {
            place_id: P_CLOSED,
            kind: "closed",
            detail: { closed: "moved" },
          },
        });
        expect((await stats([P_CLOSED]))[0]).toMatchObject({
          closed_reports: 3,
          closed: true,
        });
      });

      it("같은 식당 같은 종류는 하루 1회, 세부는 칩과 숫자 형식만", async () => {
        const dup = await rest(e, "place_reports", {
          method: "POST",
          token: a.token,
          body: { place_id: P_CLOSED, kind: "closed" },
        });
        expect(dup.error?.code).toBe(UNIQUE_VIOLATION);
        for (const body of [
          { kind: "price", detail: { price_krw: "만 원" } },
          { kind: "price", detail: { price_krw: 500 } },
          { kind: "info", detail: { fields: ["name", "memo"] } },
          { kind: "info", detail: { note: "자유 글" } },
          { kind: "closed", detail: { closed: "forever" } },
          { kind: "hours", detail: {} },
        ]) {
          const r = await rest(e, "place_reports", {
            method: "POST",
            token: a.token,
            body: { place_id: P_CLOSED, ...body },
          });
          expect(r.error?.code).toBe(CHECK_VIOLATION);
        }
      });

      it("가격이 달라요 숫자는 가격 집계에 들어가지 않는다 (안건 9)", async () => {
        const r = await rest(e, "place_reports", {
          method: "POST",
          token: a.token,
          body: {
            place_id: P_CLOSED,
            kind: "price",
            detail: { price_krw: 11000 },
          },
        });
        expect(r.error).toBeNull();
        expect((await stats([P_CLOSED]))[0]?.price_count).toBe(0);
      });

      it("제보는 본인만 읽고, 타인은 [], 비로그인은 권한 없음. 남의 이름으로 넣을 수 없다", async () => {
        const mine = await rest<Row[]>(
          e,
          `place_reports?select=*&place_id=eq.${P_CLOSED}`,
          { token: a.token },
        );
        expect(mine.data?.every((x) => x.user_id === a.id)).toBe(true);
        const other = await rest<Row[]>(
          e,
          `place_reports?select=*&user_id=eq.${a.id}`,
          { token: b.token },
        );
        expect(other.data).toEqual([]);
        expect((await rest(e, "place_reports?select=*")).error?.code).toBe(
          PERMISSION_DENIED,
        );
        const forge = await rest(e, "place_reports", {
          method: "POST",
          token: b.token,
          body: { user_id: a.id, place_id: place(30), kind: "info" },
        });
        expect(forge.error).not.toBeNull();
      });
    });

    // ── place_stats 입력 ──────────────────────────────────────
    describe("place_stats 입력", () => {
      it("요청한 id마다 한 행(없으면 0), 60곳 넘으면 거절", async () => {
        const rows = await stats([place(50), place(51), place(50)]);
        expect(rows).toHaveLength(2);
        expect(rows[0]).toMatchObject({
          thumbs_up: 0,
          price_count: 0,
          closed: false,
          wait_level: null,
          deal_count: 0,
        });
        const many = Array.from({ length: 61 }, (_, i) => place(100 + i));
        const r = await rpc(e, "place_stats", { p_place_ids: many });
        expect(r.error?.code).toBe(CHECK_VIOLATION);
      });
    });

    // ── 일일 한도 ─────────────────────────────────────────────
    describe("일일 한도 (MOD-05, DEAL-04)", () => {
      it("비로그인은 한도를 조회할 수 없다", async () => {
        expect((await rpc(e, "my_daily_limits", {})).error?.code).toBe(
          PERMISSION_DENIED,
        );
      });

      it("할인 제보 하루 10건. 병합은 세지 않는다", async () => {
        const before = (await limits(b)).find((x) => x.bucket === "deals");
        expect(before?.limit_count).toBe(10);
        const remaining = before?.remaining ?? 0;
        for (let i = 0; i < remaining; i += 1) {
          const r = await registerDeal(b, {
            p_place_id: place(200 + i),
            p_type: "other",
            p_content: "한도 확인",
          });
          expect(r.error).toBeNull();
        }
        const merged = await registerDeal(b, {
          p_place_id: place(200),
          p_type: "other",
          p_content: "같은 키",
        });
        expect(merged.data?.[0]?.merged_with).toBeTruthy();
        const over = await registerDeal(b, {
          p_place_id: place(299),
          p_type: "other",
          p_content: "한도 초과",
        });
        expect(over.error?.code).toBe(CHECK_VIOLATION);
        expect(over.error?.message).toContain("deals_daily_limit_exceeded");
      });

      it("신고와 정보 제보는 합쳐 하루 30건", async () => {
        const before = (await limits(c)).find((x) => x.bucket === "reports");
        expect(before?.limit_count).toBe(30);
        const remaining = before?.remaining ?? 0;
        for (let i = 0; i < remaining; i += 1) {
          const r = await rest(e, "place_reports", {
            method: "POST",
            token: c.token,
            body: { place_id: place(300 + i), kind: "info" },
          });
          expect(r.error).toBeNull();
        }
        const over = await rest(e, "place_reports", {
          method: "POST",
          token: c.token,
          body: { place_id: place(399), kind: "info" },
        });
        expect(over.error?.message).toContain("reports_daily_limit_exceeded");
      });

      it("후기 하루 20건. 지웠다 다시 써도 한도는 돌아오지 않는다", async () => {
        const v = await visit(d, place(400));
        const before = (await limits(d)).find((x) => x.bucket === "reviews");
        expect(before?.limit_count).toBe(20);
        const remaining = before?.remaining ?? 0;
        for (let i = 0; i < remaining; i += 1) {
          const r = await rest(e, "reviews", {
            method: "POST",
            token: d.token,
            body: { visit_id: v, rating: "up" },
          });
          expect(r.error).toBeNull();
          await rest(e, `reviews?visit_id=eq.${v}`, {
            method: "DELETE",
            token: d.token,
          });
        }
        const over = await rest(e, "reviews", {
          method: "POST",
          token: d.token,
          body: { visit_id: v, rating: "up" },
        });
        expect(over.error?.message).toContain("reviews_daily_limit_exceeded");
      }, 120_000);
    });

    // ── 탈퇴 ─────────────────────────────────────────────────
    describe("탈퇴 cascade (PRD 11.4, T6.27 범위)", () => {
      it("auth 사용자를 지우면 후기, 신고, 제보, 할인, 확인, 웨이팅이 모두 사라지고 집계에서도 빠진다", async () => {
        const x = await createTestUser(e, runId, "x");
        created.push(x.id);
        const P = place(500);
        const v = await visit(x, P);
        await rest(e, "reviews", {
          method: "POST",
          token: x.token,
          body: {
            visit_id: v,
            rating: "up",
            price_krw: 8000,
            is_public: false,
          },
        });
        const deal = await registerDeal(x, {
          p_place_id: P,
          p_type: "discount",
          p_content: "포장 할인",
        });
        const dealId = deal.data?.[0]?.deal_id ?? "";
        await rest(e, "place_deal_checks", {
          method: "POST",
          token: x.token,
          body: { deal_id: dealId, answer: "still" },
        });
        await rpc(e, "report_wait", { p_place_id: P, p_level: "now" }, x.token);
        await rest(e, "place_reports", {
          method: "POST",
          token: x.token,
          body: { place_id: P, kind: "info" },
        });
        const other = await registerDeal(a, {
          p_place_id: place(501),
          p_type: "event",
          p_content: "신고 대상",
        });
        const report = await rest(e, "review_reports", {
          method: "POST",
          token: x.token,
          body: {
            target_type: "deal",
            deal_id: other.data?.[0]?.deal_id,
            reason: "ad_false",
          },
        });
        expect(report.error).toBeNull();
        expect((await stats([P]))[0]).toMatchObject({
          thumbs_up: 1,
          price_count: 1,
          deal_count: 1,
        });

        await deleteAuthUser(e, x.id);
        for (const table of [
          "reviews",
          "place_deals",
          "place_deal_checks",
          "wait_reports",
          "place_reports",
          "review_reports",
          "visits",
        ]) {
          expect(await adminCount(e, table, x.id)).toBe(0);
        }
        expect((await stats([P]))[0]).toMatchObject({
          thumbs_up: 0,
          price_count: 0,
          deal_count: 0,
          wait_level: null,
        });
      });
    });
  },
);
