// T8.5 RLS/함수 테스트: 관리자 함수(admin_*), 정지 사용자 쓰기 차단, 자동 숨김 재계산, 폐업 결정, 처리 이력과 탈퇴
// 마이그레이션: supabase/migrations/20261101180000_t8_5_admin_moderation.sql
//
// 실행: pnpm test:rls (RUN_RLS_TESTS=1). 평소 pnpm test에서는 건너뛴다. 이 마이그레이션이 클라우드 개발 DB에
// 적용되기 전(admin_log가 PGRST202)에도 자동으로 건너뛴다.
//
// 역할 (CLAUDE.md 10장 + T8.5): 관리자 = role admin 테스트 사용자 세션, 본인 = 비관리자 작성자 세션,
// 타인 = 다른 비관리자 세션, 비로그인 = 세션 없이 publishable 키만, 정지된 본인 = 정지된 사용자 세션.
// 단언은 전부 publishable 키 + 세션으로 한다. secret 키는 사용자 생성, 삭제, 관리자 role 지정(SQL 편집기 대신),
// 정지 끝 시각을 과거로 돌리기(시간 경과 흉내), 탈퇴 뒤 잔여 행 세기(account_residue)에만 쓴다.
//
// 핵심
// - 비관리자(본인, 타인)와 비로그인은 admin_* 함수를 하나도 부르지 못한다(42501).
// - 비공개로 바뀐 신고 글은 관리자 응답에도 body null + private_now(AC-FB-2, 안건 3).
// - 정지된 본인은 후기, 신고, 제보, 웨이팅, 투표방 만들기가 account_suspended로 거절된다. 로그인(본인 프로필 읽기)은 된다.
// - 관리자가 복구한 글은 신고 1건에 다시 숨겨지지 않는다(안건 9). 폐업 확인과 영업 중 두기가 place_stats.closed에 반영된다.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  adminPatch,
  adminRpc,
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

async function adminReady(e: RlsEnv): Promise<boolean> {
  // 함수가 없으면 PGRST202, 있으면 비로그인이라 권한 오류(42501)
  const r = await rpc(e, "admin_log", { p_limit: 1 });
  return r.error?.code !== "PGRST202" && r.status !== 404;
}

const ready =
  env !== null &&
  (await schemaReady(env, "reviews")) &&
  (await adminReady(env));

const PERMISSION_DENIED = "42501";
const CHECK_VIOLATION = "23514";

type ReportedRow = {
  target_type: "review" | "deal";
  target_id: string;
  place_id: string;
  body: string | null;
  private_now: boolean;
  auto_hidden: boolean;
  reasons: Record<string, number>;
  report_count: number;
  author_id: string;
  author_nickname: string | null;
};
type DecideRow = { action_id: string; target_type: string; target_id: string };
type LogRow = {
  id: string;
  action: string;
  target_id: string | null;
  target_user_id: string | null;
  reverted_at: string | null;
  undoable: boolean;
};
type UserRow = {
  kind: string;
  user_id: string;
  status: string;
  hidden_since_review: number;
  recent_items: { body: string | null; private_now: boolean }[];
};
type ClosureRow = { place_id: string; gone: number; closed_count: number };
type StatsRow = { place_id: string; closed_reports: number; closed: boolean };
type ResidueRow = {
  table_schema: string;
  table_name: string;
  on_delete: string;
  remaining: number;
};

describe.skipIf(!ready)(
  "T8.5 관리자 함수와 정지 (관리자, 본인, 타인, 비로그인, 정지된 본인)",
  { timeout: 90_000 },
  () => {
    const e = env as RlsEnv;
    const runId = newRunId();
    const placeBase = `7${String(Date.now()).slice(-9)}${String(Math.floor(Math.random() * 90) + 10)}`;
    const place = (n: number) => `${placeBase}${String(n).padStart(3, "0")}`;
    const SECRET = `비공개전환 ${runId}`;
    const PUBLIC = `신고된공개 ${runId}`;

    let admin: TestUser;
    let a: TestUser; // 작성자(본인)
    let b: TestUser; // 타인, 신고자
    let c: TestUser;
    let d: TestUser;
    let f: TestUser; // 복구 뒤 새 신고자
    let s: TestUser; // 정지될 사용자
    const created: string[] = [];

    let reviewPublic = "";
    let reviewPrivate = "";
    let sReview = "";

    async function visit(user: TestUser, placeId: string) {
      const r = await rest<{ id: string }[]>(e, "visits", {
        method: "POST",
        token: user.token,
        body: { place_id: placeId, meal: "lunch", source: "rec" },
      });
      expect(r.error).toBeNull();
      return r.data?.[0]?.id ?? "";
    }

    async function review(user: TestUser, placeId: string, body: string) {
      const v = await visit(user, placeId);
      const r = await rest<{ id: string }[]>(e, "reviews", {
        method: "POST",
        token: user.token,
        body: { visit_id: v, rating: "down", body, is_public: true },
      });
      expect(r.error).toBeNull();
      return r.data?.[0]?.id ?? "";
    }

    async function report(user: TestUser, reviewId: string, reason = "spam") {
      return rest(e, "review_reports", {
        method: "POST",
        token: user.token,
        body: { target_type: "review", review_id: reviewId, reason },
      });
    }

    async function myReview(user: TestUser, id: string) {
      const r = await rest<
        { hidden_at: string | null; hidden_reason: string | null }[]
      >(e, `reviews?id=eq.${id}&select=hidden_at,hidden_reason`, {
        token: user.token,
      });
      expect(r.error).toBeNull();
      return r.data?.[0];
    }

    async function queue() {
      const r = await rpc<ReportedRow[]>(
        e,
        "admin_reported_items",
        {},
        admin.token,
      );
      expect(r.error).toBeNull();
      return r.data ?? [];
    }

    async function stats(placeId: string) {
      const r = await rpc<StatsRow[]>(e, "place_stats", {
        p_place_ids: [placeId],
      });
      expect(r.error).toBeNull();
      return r.data?.[0];
    }

    beforeAll(async () => {
      [admin, a, b, c, d, f, s] = await Promise.all([
        createTestUser(e, runId, "adm"),
        createTestUser(e, runId, "a"),
        createTestUser(e, runId, "b"),
        createTestUser(e, runId, "c"),
        createTestUser(e, runId, "d"),
        createTestUser(e, runId, "f"),
        createTestUser(e, runId, "s"),
      ]);
      created.push(admin.id, a.id, b.id, c.id, d.id, f.id, s.id);
      // 관리자 지정은 SQL 편집기에서만 한다(PRD Q9). 테스트는 secret 키로 같은 일을 한다(준비 전용)
      await adminPatch(e, "profiles", `user_id=eq.${admin.id}`, {
        role: "admin",
      });

      reviewPublic = await review(a, place(1), PUBLIC);
      reviewPrivate = await review(a, place(2), SECRET);
      for (const u of [b, c, d]) {
        expect((await report(u, reviewPublic)).error).toBeNull();
      }
      expect((await report(b, reviewPrivate, "abuse")).error).toBeNull();
      // 신고 뒤 작성자가 나만 보기로 바꾼다
      const p = await rest(e, `reviews?id=eq.${reviewPrivate}`, {
        method: "PATCH",
        token: a.token,
        body: { is_public: false },
      });
      expect(p.error).toBeNull();
      sReview = await review(s, place(5), `정지될글 ${runId}`);
    }, 90_000);

    afterAll(async () => {
      await Promise.all(created.map((id) => deleteAuthUser(e, id)));
    }, 60_000);

    describe("권한: 관리자 함수는 관리자만", () => {
      const calls: [string, Record<string, unknown>][] = [
        ["admin_reported_items", {}],
        ["admin_closures", {}],
        ["admin_users", {}],
        ["admin_log", { p_limit: 5 }],
        [
          "admin_decide_item",
          {
            p_target_type: "review",
            p_target_id: "00000000-0000-0000-0000-000000000000",
            p_result: "restore",
          },
        ],
        ["admin_decide_closure", { p_place_id: "1", p_result: "dismiss" }],
        [
          "admin_set_suspension",
          {
            p_user_id: "00000000-0000-0000-0000-000000000000",
            p_status: "active",
          },
        ],
        [
          "admin_clear_user",
          { p_user_id: "00000000-0000-0000-0000-000000000000" },
        ],
        ["admin_undo", { p_action_ids: ["00000000-0000-0000-0000-000000000000"] }],
      ];

      it("본인(비관리자 작성자), 타인, 비로그인은 모두 거절된다", async () => {
        for (const [name, args] of calls) {
          for (const token of [a.token, b.token, undefined]) {
            const r = await rpc(e, name, args, token);
            expect(r.data, name).toBeNull();
            expect(r.error?.code, name).toBe(PERMISSION_DENIED);
          }
        }
      });

      it("place_moderation은 누구도 직접 읽거나 쓰지 못한다", async () => {
        for (const token of [admin.token, a.token, undefined]) {
          const r = await rest(e, "place_moderation?select=place_id", {
            token,
          });
          expect(r.error?.code).toBe(PERMISSION_DENIED);
          const w = await rest(e, "place_moderation", {
            method: "POST",
            token,
            body: { place_id: place(9), closed_status: "confirmed" },
          });
          expect(w.error?.code).toBe(PERMISSION_DENIED);
        }
      });

      it("본인도 정지 열과 role은 바꿀 수 없다(열 권한)", async () => {
        for (const body of [
          { status: "active" },
          { suspended_until: null },
          { suspended_reason: "other" },
          { role: "admin" },
        ]) {
          const r = await rest(e, `profiles?user_id=eq.${a.id}`, {
            method: "PATCH",
            token: a.token,
            body,
          });
          expect(r.error?.code).toBe(PERMISSION_DENIED);
        }
      });
    });

    describe("신고 큐와 비공개 전환 글 (AC-FB-2, 안건 3)", () => {
      it("관리자 큐: 자동 숨김 글은 앞에, 공개 글 body가 보인다", async () => {
        const rows = await queue();
        const pub = rows.find((r) => r.target_id === reviewPublic);
        expect(pub).toMatchObject({
          target_type: "review",
          body: PUBLIC,
          private_now: false,
          auto_hidden: true,
          report_count: 3,
          author_id: a.id,
        });
        expect(pub?.reasons).toEqual({ spam: 3 });
      });

      it("신고 뒤 비공개로 바뀐 글은 body null + private_now. 어떤 관리자 응답에도 글이 없다", async () => {
        const rows = await queue();
        const priv = rows.find((r) => r.target_id === reviewPrivate);
        expect(priv).toMatchObject({ body: null, private_now: true });

        const users = await rpc<UserRow[]>(
          e,
          "admin_users",
          { p_query: a.nickname },
          admin.token,
        );
        expect(users.error).toBeNull();
        const log = await rpc(e, "admin_log", { p_limit: 500 }, admin.token);
        for (const payload of [rows, users.data, log.data]) {
          expect(JSON.stringify(payload)).not.toContain(SECRET);
        }
        const mine = users.data?.find((u) => u.user_id === a.id);
        expect(mine?.recent_items.some((i) => i.private_now && i.body === null)).toBe(true);
      });
    });

    describe("숨김 확정, 되돌리기, 복구 (안건 8, 9)", () => {
      let hideAction = "";

      it("숨김 확정: hidden_reason이 admin이 되고 큐에서 빠진다", async () => {
        const r = await rpc<DecideRow[]>(
          e,
          "admin_decide_item",
          {
            p_target_type: "review",
            p_target_id: reviewPublic,
            p_result: "hide",
            p_reason: "spam",
          },
          admin.token,
        );
        expect(r.error).toBeNull();
        expect(r.data).toHaveLength(1);
        hideAction = r.data?.[0]?.action_id ?? "";
        expect((await myReview(a, reviewPublic))?.hidden_reason).toBe("admin");
        expect((await queue()).some((x) => x.target_id === reviewPublic)).toBe(
          false,
        );
      });

      it("사유 없는 숨김과 모르는 결과는 거절한다", async () => {
        for (const args of [
          { p_result: "hide" },
          { p_result: "hide", p_reason: "nope" },
          { p_result: "delete" },
        ]) {
          const r = await rpc(
            e,
            "admin_decide_item",
            {
              p_target_type: "review",
              p_target_id: reviewPublic,
              ...args,
            },
            admin.token,
          );
          expect(r.error?.code).toBe(CHECK_VIOLATION);
        }
      });

      it("처리 이력에 남고 되돌리면 자동 숨김(검토 대기)으로 돌아간다", async () => {
        const log = await rpc<LogRow[]>(e, "admin_log", { p_limit: 50 }, admin.token);
        const row = log.data?.find((l) => l.id === hideAction);
        expect(row).toMatchObject({
          action: "review_hide",
          target_id: reviewPublic,
          target_user_id: a.id,
          undoable: true,
        });
        const u = await rpc<number>(
          e,
          "admin_undo",
          { p_action_ids: [hideAction] },
          admin.token,
        );
        expect(u.error).toBeNull();
        expect(u.data).toBe(1);
        expect((await myReview(a, reviewPublic))?.hidden_reason).toBe("reports");
        // 같은 처리는 두 번 되돌리지 않는다
        const again = await rpc(
          e,
          "admin_undo",
          { p_action_ids: [hideAction] },
          admin.token,
        );
        expect(again.error?.message).toContain("moderation_undo_unavailable");
      });

      it("복구한 글은 그 뒤 신고 1건으로 다시 숨겨지지 않는다(이전 신고는 세지 않음)", async () => {
        const r = await rpc(
          e,
          "admin_decide_item",
          {
            p_target_type: "review",
            p_target_id: reviewPublic,
            p_result: "restore",
          },
          admin.token,
        );
        expect(r.error).toBeNull();
        expect((await myReview(a, reviewPublic))?.hidden_at).toBeNull();
        expect((await report(f, reviewPublic)).error).toBeNull();
        expect((await myReview(a, reviewPublic))?.hidden_at).toBeNull();
        // 새 신고 1건이라 큐에는 다시 "신고 접수"로 들어온다
        const row = (await queue()).find((x) => x.target_id === reviewPublic);
        expect(row).toMatchObject({ auto_hidden: false, report_count: 1 });
      });
    });

    describe("폐업 결정 (MOD-03, 안건 11)", () => {
      const P = () => place(3);

      beforeAll(async () => {
        for (const u of [b, c, d]) {
          const r = await rest(e, "place_reports", {
            method: "POST",
            token: u.token,
            body: { place_id: P(), kind: "closed", detail: { closed: "gone" } },
          });
          expect(r.error).toBeNull();
        }
      });

      it("3명이면 추천 제외, 큐에 보인다", async () => {
        expect(await stats(P())).toMatchObject({ closed_reports: 3, closed: true });
        const r = await rpc<ClosureRow[]>(e, "admin_closures", {}, admin.token);
        expect(r.data?.find((x) => x.place_id === P())).toMatchObject({
          gone: 3,
          closed_count: 3,
        });
      });

      it("영업 중으로 두면 지금까지의 제보는 세지 않는다", async () => {
        const r = await rpc(
          e,
          "admin_decide_closure",
          { p_place_id: P(), p_result: "dismiss" },
          admin.token,
        );
        expect(r.error).toBeNull();
        expect(await stats(P())).toMatchObject({ closed_reports: 0, closed: false });
        const q = await rpc<ClosureRow[]>(e, "admin_closures", {}, admin.token);
        expect(q.data?.some((x) => x.place_id === P())).toBe(false);
      });

      it("폐업 확인은 제보 수와 상관없이 추천 제외, 되돌리면 앞 결정으로", async () => {
        const r = await rpc<string>(
          e,
          "admin_decide_closure",
          { p_place_id: P(), p_result: "confirm" },
          admin.token,
        );
        expect(r.error).toBeNull();
        expect((await stats(P()))?.closed).toBe(true);
        const u = await rpc(e, "admin_undo", { p_action_ids: [r.data] }, admin.token);
        expect(u.error).toBeNull();
        expect((await stats(P()))?.closed).toBe(false);
      });
    });

    describe("정지 (안건 6, 7): 쓰기 차단 + 공개 후기 숨김, 로그인 허용", () => {
      it("관리자 자신과 다른 관리자는 정지할 수 없다", async () => {
        const r = await rpc(
          e,
          "admin_set_suspension",
          { p_user_id: admin.id, p_status: "suspended" },
          admin.token,
        );
        expect(r.error?.message).toContain("moderation_admin_target");
      });

      it("7일 정지: 본인 프로필에 상태와 끝 시각이 보이고 공개 후기가 목록에서 빠진다", async () => {
        const before = await rpc<{ id: string }[]>(
          e,
          "place_reviews",
          { p_place_id: place(5) },
          b.token,
        );
        expect(before.data?.some((x) => x.id === sReview)).toBe(true);

        const r = await rpc(
          e,
          "admin_set_suspension",
          {
            p_user_id: s.id,
            p_status: "suspended",
            p_duration: "d7",
            p_reason: "spam",
          },
          admin.token,
        );
        expect(r.error).toBeNull();

        const me = await rest<
          {
            status: string;
            suspended_until: string | null;
            suspended_reason: string;
          }[]
        >(
          e,
          `profiles?user_id=eq.${s.id}&select=status,suspended_until,suspended_reason`,
          { token: s.token },
        );
        expect(me.error).toBeNull();
        expect(me.data?.[0]).toMatchObject({
          status: "suspended",
          suspended_reason: "spam",
        });
        const until = Date.parse(me.data?.[0]?.suspended_until ?? "");
        expect(until - Date.now()).toBeGreaterThan(6.9 * 86_400_000);

        const after = await rpc<{ id: string }[]>(
          e,
          "place_reviews",
          { p_place_id: place(5) },
          b.token,
        );
        expect(after.data?.some((x) => x.id === sReview)).toBe(false);
      });

      it("정지된 본인의 후기, 신고, 제보, 웨이팅, 투표방 만들기는 account_suspended", async () => {
        const v = await visit(s, place(6));
        const attempts = [
          await rest(e, "reviews", {
            method: "POST",
            token: s.token,
            body: { visit_id: v, rating: "up" },
          }),
          await rest(e, `reviews?id=eq.${sReview}`, {
            method: "PATCH",
            token: s.token,
            body: { rating: "up" },
          }),
          await report(s, reviewPublic),
          await rest(e, "place_reports", {
            method: "POST",
            token: s.token,
            body: { place_id: place(6), kind: "closed", detail: {} },
          }),
          await rpc(
            e,
            "report_wait",
            { p_place_id: place(6), p_level: "now" },
            s.token,
          ),
          await rpc(
            e,
            "create_poll",
            {
              p_kind: "lunch",
              p_title: "test_정지",
              p_closes_at: new Date(Date.now() + 30 * 60_000).toISOString(),
              p_multi: false,
              p_place_ids: [place(7), place(8)],
              p_place_urls: [],
              p_anchor_lat: 37.5665,
              p_anchor_lng: 126.978,
              p_radius_m: 800,
            },
            s.token,
          ),
        ];
        for (const r of attempts) {
          expect(r.error?.message).toContain("account_suspended");
        }
      });

      it("다른 사용자(타인)의 쓰기는 영향이 없다", async () => {
        expect((await report(b, sReview, "abuse")).error).toBeNull();
      });

      it("정지 끝 시각이 지나면 크론 전이라도 다시 쓸 수 있다", async () => {
        await adminPatch(e, "profiles", `user_id=eq.${s.id}`, {
          suspended_until: new Date(Date.now() - 60_000).toISOString(),
        });
        const r = await rpc(
          e,
          "report_wait",
          { p_place_id: place(6), p_level: "now" },
          s.token,
        );
        expect(r.error).toBeNull();
      });

      it("해제하면 active, 처리 이력에 정지와 해제가 남는다", async () => {
        const again = await rpc(
          e,
          "admin_set_suspension",
          {
            p_user_id: s.id,
            p_status: "suspended",
            p_duration: "indefinite",
            p_reason: "other",
          },
          admin.token,
        );
        expect(again.error).toBeNull();
        const off = await rpc(
          e,
          "admin_set_suspension",
          { p_user_id: s.id, p_status: "active" },
          admin.token,
        );
        expect(off.error).toBeNull();
        const log = await rpc<LogRow[]>(e, "admin_log", { p_limit: 50 }, admin.token);
        const mine = (log.data ?? []).filter((l) => l.target_user_id === s.id);
        expect(mine.map((l) => l.action)).toEqual(
          expect.arrayContaining(["user_suspend", "user_unsuspend"]),
        );
      });
    });

    describe("같은 작성자 일괄 숨김 (D-19 조합 2)", () => {
      it("p_include_author면 같은 작성자의 다른 검토 대기 글도 함께 숨긴다", async () => {
        const second = await review(c, place(10), `두번째 ${runId}`);
        const first = await review(c, place(11), `첫번째 ${runId}`);
        expect((await report(b, first)).error).toBeNull();
        expect((await report(b, second)).error).toBeNull();
        const r = await rpc<DecideRow[]>(
          e,
          "admin_decide_item",
          {
            p_target_type: "review",
            p_target_id: first,
            p_result: "hide",
            p_reason: "spam",
            p_include_author: true,
          },
          admin.token,
        );
        expect(r.error).toBeNull();
        expect(r.data?.map((x) => x.target_id).sort()).toEqual(
          [first, second].sort(),
        );
        expect((await myReview(c, second))?.hidden_reason).toBe("admin");
      });
    });

    describe("탈퇴 (PRD 11.4, 안건 5)", () => {
      it("작성자가 탈퇴하면 이력의 사용자 id와 글 id는 null, 남은 행은 0", async () => {
        await deleteAuthUser(e, a.id);
        const residue = await adminRpc<ResidueRow[]>(e, "account_residue", {
          p_user_id: a.id,
        });
        expect(residue.error).toBeNull();
        const rows = residue.data ?? [];
        const names = rows.map((r) => `${r.table_schema}.${r.table_name}`);
        expect(names).toEqual(
          expect.arrayContaining([
            "private.moderation_actions",
            "public.place_moderation",
          ]),
        );
        for (const r of rows) {
          expect(r.remaining, `${r.table_schema}.${r.table_name}`).toBe(0);
          expect(["cascade", "set null"]).toContain(r.on_delete);
        }
        const log = await rpc<LogRow[]>(e, "admin_log", { p_limit: 500 }, admin.token);
        expect(
          (log.data ?? []).some(
            (l) => l.target_id === reviewPublic || l.target_user_id === a.id,
          ),
        ).toBe(false);
      });
    });
  },
);
