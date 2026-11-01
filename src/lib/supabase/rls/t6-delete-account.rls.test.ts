// T6.27 탈퇴 삭제 범위 (PRD 11.4, tasks S9). 앱 탈퇴 경로(deleteAccount + adminDeleter, /auth/delete-account와 같은 함수)로
// 지운 뒤 6단계 테이블과 private.daily_usage에 남은 행이 없는지, 남의 행에 걸린 것은 어떻게 되는지 본다.
//
// 실행: pnpm test:rls (RUN_RLS_TESTS=1). 평소 pnpm test에서는 건너뛴다.
// 마이그레이션 20261101130000_t6_26_cron_cleanup_t6_27_account_residue.sql(account_residue 함수)이 클라우드 개발 DB에
// 적용되기 전에는 자동으로 건너뛴다(PGRST202).
//
// secret 키는 사용자 생성, 삭제와 잔여 행 세기(account_residue: auth.users를 참조하는 모든 외래 키를 카탈로그로 찾는다)에만 쓴다.
// 남의 행이 어떻게 되었는지는 그 사람의 세션(publishable 키)으로 확인한다.
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminDeleter, deleteAccount } from "@/features/auth/delete-account";
import {
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

type Residue = {
  table_schema: string;
  table_name: string;
  column_name: string;
  on_delete: string;
  remaining: number;
};

const env = loadRlsEnv();

async function residueReady(e: RlsEnv): Promise<boolean> {
  const r = await adminRpc(e, "account_residue", {
    p_user_id: "00000000-0000-0000-0000-000000000000",
  });
  return r.error === null;
}

const ready =
  env !== null &&
  (await schemaReady(env, "reviews")) &&
  (await residueReady(env));

// 6단계까지 auth.users를 참조하는 테이블. account_residue가 이 목록을 모두 찾아야 한다(누락 = 카탈로그 질의 오류)
const EXPECTED = [
  "private.daily_usage",
  "public.avoid_rules",
  "public.blocklist",
  "public.favorites",
  "public.offices",
  "public.place_deal_checks",
  "public.place_deals",
  "public.place_reports",
  "public.preferences",
  "public.profiles",
  "public.review_reports",
  "public.reviews",
  "public.visits",
  "public.wait_reports",
];

describe.skipIf(!ready)(
  "T6.27 탈퇴하면 6단계 기록이 모두 지워지고 집계에서 빠진다 (PRD 11.4)",
  { timeout: 120_000 },
  () => {
    const e = env as RlsEnv;
    const runId = newRunId();
    const placeBase = `8${String(Date.now()).slice(-9)}${String(Math.floor(Math.random() * 90) + 10)}`;
    const place = (n: number) => `${placeBase}${String(n).padStart(3, "0")}`;
    const created: string[] = [];
    let x: TestUser; // 탈퇴하는 사람
    let a: TestUser;
    let b: TestUser;
    let c: TestUser;

    beforeAll(async () => {
      [x, a, b, c] = await Promise.all([
        createTestUser(e, runId, "dx"),
        createTestUser(e, runId, "da"),
        createTestUser(e, runId, "db"),
        createTestUser(e, runId, "dc"),
      ]);
      created.push(x.id, a.id, b.id, c.id);
    }, 60_000);

    afterAll(async () => {
      await Promise.all(created.map((id) => deleteAuthUser(e, id)));
    }, 60_000);

    // 방문은 (사용자, 날짜, 끼니, 장소)마다 하나라서 같은 장소 후기 두 건은 끼니를 나눈다
    async function visit(user: TestUser, placeId: string, meal = "lunch") {
      const r = await rest<{ id: string }[]>(e, "visits", {
        method: "POST",
        token: user.token,
        body: { place_id: placeId, meal, source: "rec" },
      });
      expect(r.error).toBeNull();
      return r.data?.[0]?.id ?? "";
    }

    async function review(
      user: TestUser,
      placeId: string,
      body: Record<string, unknown>,
      meal = "lunch",
    ) {
      const v = await visit(user, placeId, meal);
      const r = await rest<{ id: string }[]>(e, "reviews", {
        method: "POST",
        token: user.token,
        body: { visit_id: v, ...body },
      });
      expect(r.error).toBeNull();
      return r.data?.[0]?.id ?? "";
    }

    async function deal(user: TestUser, placeId: string, type: string) {
      const r = await rpc<{ deal_id: string | null }[]>(
        e,
        "register_deal",
        { p_place_id: placeId, p_type: type, p_content: `테스트 ${runId}` },
        user.token,
      );
      expect(r.error).toBeNull();
      return r.data?.[0]?.deal_id ?? "";
    }

    async function post(user: TestUser, table: string, body: unknown) {
      const r = await rest(e, table, {
        method: "POST",
        token: user.token,
        body,
      });
      expect(r.error).toBeNull();
    }

    async function residue(userId: string) {
      const r = await adminRpc<Residue[]>(e, "account_residue", {
        p_user_id: userId,
      });
      expect(r.error).toBeNull();
      return r.data ?? [];
    }

    async function stats(placeId: string) {
      const r = await rpc<
        {
          thumbs_up: number;
          thumbs_down: number;
          price_count: number;
          deal_count: number;
          closed_reports: number;
          wait_level: string | null;
        }[]
      >(e, "place_stats", { p_place_ids: [placeId] });
      expect(r.error).toBeNull();
      return r.data?.[0];
    }

    it("앱 탈퇴 경로로 지우면 모든 auth.users 참조 테이블이 0행이고, 남의 응답은 함께 빠지며, 이미 적용된 숨김은 유지된다", async () => {
      const P_X = place(1); // 탈퇴자의 후기, 할인, 웨이팅, 정보 제보
      const P_A = place(2); // 남(a)의 공개 후기, 할인
      const P_H = place(3); // 3명 신고로 숨겨질 a의 후기

      // ── 탈퇴자 x의 기록 ──
      await review(x, P_X, { rating: "up", price_krw: 8000, is_public: false });
      const xPublic = await review(
        x,
        P_X,
        {
          rating: "down",
          price_krw: 9000,
          body: `공개 ${runId}`,
        },
        "dinner",
      );
      const xDeal = await deal(x, P_X, "discount");
      await rpc(e, "report_wait", { p_place_id: P_X, p_level: "long" }, x.token);
      await post(x, "place_reports", { place_id: P_X, kind: "closed" });

      // ── 남의 기록에 x가 남긴 응답 ──
      const aDeal = await deal(a, P_A, "event");
      const aHidden = await review(a, P_H, {
        rating: "up",
        body: `숨김 대상 ${runId}`,
      });
      await post(x, "place_deal_checks", { deal_id: aDeal, answer: "still" });
      await post(x, "review_reports", {
        target_type: "deal",
        deal_id: aDeal,
        reason: "ad_false",
      });
      for (const [user, reason] of [
        [x, "spam"],
        [b, "abuse"],
        [c, "false"],
      ] as const) {
        await post(user, "review_reports", {
          target_type: "review",
          review_id: aHidden,
          reason,
        });
      }

      // ── x의 기록에 남이 남긴 응답 ──
      await post(b, "place_deal_checks", { deal_id: xDeal, answer: "ended" });
      await post(b, "review_reports", {
        target_type: "review",
        review_id: xPublic,
        reason: "spam",
      });

      // 지우기 전: x의 행이 실제로 있고(daily_usage 포함), 집계에 들어가 있다
      const before = await residue(x.id);
      const count = (rows: Residue[], name: string) =>
        rows.find((r) => `${r.table_schema}.${r.table_name}` === name)
          ?.remaining ?? -1;
      for (const name of [
        "public.reviews",
        "public.review_reports",
        "public.place_reports",
        "public.place_deals",
        "public.place_deal_checks",
        "public.wait_reports",
        "private.daily_usage",
      ]) {
        expect(count(before, name), name).toBeGreaterThan(0);
      }
      // 집계는 사람당 그 식당 최신 값 하나(D-13, 11/01 결정): x의 두 후기 중 저녁 👎, 9,000원만 들어간다
      expect(await stats(P_X)).toMatchObject({
        thumbs_up: 0,
        thumbs_down: 1,
        price_count: 1,
        deal_count: 1,
        closed_reports: 1,
        wait_level: "long",
      });

      // ── 앱과 같은 경로로 탈퇴 ──
      const userClient = createClient(e.url, e.publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const admin = createClient(e.url, e.secretKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
      const result = await deleteAccount({
        async verifiedUserId() {
          const { data } = await userClient.auth.getUser(x.token);
          return data.user?.id ?? null;
        },
        deleteUser: adminDeleter(admin),
      });
      expect(result).toEqual({ ok: true, userId: x.id });

      // 1. 모든 auth.users 참조 테이블이 0행, 규칙은 cascade 또는 set null(T7.29 익명 참여자용)
      const after = await residue(x.id);
      const names = after.map((r) => `${r.table_schema}.${r.table_name}`);
      expect(names).toEqual(expect.arrayContaining(EXPECTED));
      for (const r of after) {
        expect(r.remaining, `${r.table_schema}.${r.table_name}`).toBe(0);
        expect(["cascade", "set null"], r.table_name).toContain(r.on_delete);
      }

      // 2. 집계에서 빠진다: 후기, 가격, 할인, 폐업 제보, 웨이팅
      expect(await stats(P_X)).toMatchObject({
        thumbs_up: 0,
        thumbs_down: 0,
        price_count: 0,
        deal_count: 0,
        closed_reports: 0,
        wait_level: null,
      });

      // 3. x의 할인, 후기에 걸린 남(b)의 확인 응답과 신고도 함께 지워진다
      const bChecks = await rest<unknown[]>(
        e,
        `place_deal_checks?select=deal_id&deal_id=eq.${xDeal}`,
        { token: b.token },
      );
      expect(bChecks.data).toEqual([]);
      const bReports = await rest<unknown[]>(
        e,
        `review_reports?select=id&review_id=eq.${xPublic}`,
        { token: b.token },
      );
      expect(bReports.data).toEqual([]);

      // 4. 남(a)의 할인은 남고, x의 확인 응답은 개수에서 빠진다
      const list = await rpc<{ id: string; still_count: number }[]>(
        e,
        "place_deals_list",
        { p_place_id: P_A },
        a.token,
      );
      expect(list.data?.find((d) => d.id === aDeal)).toMatchObject({
        still_count: 0,
      });

      // 5. [제안 결정] 신고자 탈퇴로 신고 수가 2로 줄어도 이미 적용된 숨김은 유지된다(관리자만 복원)
      const hidden = await rest<{ hidden_reason: string | null }[]>(
        e,
        `reviews?id=eq.${aHidden}&select=hidden_reason`,
        { token: a.token },
      );
      expect(hidden.data?.[0]?.hidden_reason).toBe("reports");
      const bStill = await rest<unknown[]>(
        e,
        `review_reports?select=id&review_id=eq.${aHidden}`,
        { token: b.token },
      );
      expect(bStill.data).toHaveLength(1);
    });

    it("account_residue는 사용자 세션과 비로그인이 부를 수 없다", async () => {
      const asUser = await rpc(e, "account_residue", { p_user_id: a.id }, a.token);
      expect(asUser.error).not.toBeNull();
      const asAnon = await rpc(e, "account_residue", { p_user_id: a.id });
      expect(asAnon.error).not.toBeNull();
    });
  },
);
