// T4.15 AC-AUTH-3: 탈퇴 후 같은 계정으로 다시 가입하면 새 사용자로 시작한다 (PRD AUTH-05, 11.4절, T4.12).
//
// 실행: pnpm test:rls (RUN_RLS_TESTS=1). 평소 pnpm test에서는 건너뛴다. 조건은 t4-account.rls.test.ts와 같다.
// 탈퇴는 앱 라우트(/auth/delete-account)와 같은 함수 deleteAccount + adminDeleter를 부른다.
//   - verifiedUserId: 사용자 세션 토큰을 Auth 서버(getUser)로 검증한 id (라우트의 supabase.auth.getUser와 같은 API)
//   - deleteUser: service role 클라이언트의 auth.admin.deleteUser(id, false) (라우트의 createAdminSupabase와 같은 설정)
// 단언 중 "행이 남았는가"는 RLS 밖에서 세야 하므로 adminCount(secret 키)를 쓰고, 재가입 사용자가 이전 행을 못 보는지는
// publishable 키 + 새 세션으로 확인한다.
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { adminDeleter, deleteAccount } from "@/features/auth/delete-account";
import {
  adminCount,
  createTestUserWithEmail,
  deleteAuthUser,
  loadRlsEnv,
  rest,
  schemaReady,
  type RlsEnv,
} from "./harness";

const env = loadRlsEnv();
const ready = env !== null && (await schemaReady(env, "profiles"));

const TABLES = ["profiles", "offices", "preferences", "avoid_rules"] as const;

describe.skipIf(!ready)(
  "T4.15 AC-AUTH-3 탈퇴 후 재가입은 새 사용자",
  { timeout: 60_000 },
  () => {
    const e = env as RlsEnv;
    const runId = Date.now().toString(36).slice(-6);
    const created: string[] = [];

    afterAll(async () => {
      await Promise.all(created.map((id) => deleteAuthUser(e, id)));
    }, 60_000);

    function deps(token: string) {
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
      return {
        async verifiedUserId() {
          const { data } = await userClient.auth.getUser(token);
          return data.user?.id ?? null;
        },
        deleteUser: adminDeleter(admin),
      };
    }

    it("세션 없이(잘못된 토큰) 부르면 아무도 지우지 않는다", async () => {
      const r = await deleteAccount(deps("not-a-token"));
      expect(r).toEqual({ ok: false, reason: "unauthenticated" });
    });

    it("탈퇴하면 행이 모두 지워지고, 같은 이메일로 다시 오면 새 id로 빈 상태에서 시작한다", async () => {
      const email = `test_rls_${runId}_del@${e.emailDomain}`;
      // 1. 가입하고 프로필, 약관, 사무실, 설정, 기피 음식을 남긴다
      const first = await createTestUserWithEmail(
        e,
        email,
        `test_del_${runId}`,
      );
      created.push(first.id);
      const patch = await rest(e, `profiles?user_id=eq.${first.id}`, {
        method: "PATCH",
        token: first.token,
        body: {
          nickname: `test_old_${runId}`,
          terms_agreed_at: new Date().toISOString(),
          birth_confirmed_at: new Date().toISOString(),
        },
      });
      expect(patch.error).toBeNull();
      const office = await rest(e, "offices", {
        method: "POST",
        token: first.token,
        body: { name: "본사", lat: 37.5665, lng: 126.978 },
      });
      expect(office.error).toBeNull();
      const pref = await rest(e, `preferences?user_id=eq.${first.id}`, {
        method: "PATCH",
        token: first.token,
        body: { lunch_budget: 15000 },
      });
      expect(pref.error).toBeNull();
      const avoid = await rest(e, "avoid_rules", {
        method: "POST",
        token: first.token,
        body: { kind: "food", value: "회" },
      });
      expect(avoid.error).toBeNull();

      // 2. 앱과 같은 경로로 탈퇴
      const r = await deleteAccount(deps(first.token));
      expect(r).toEqual({ ok: true, userId: first.id });
      for (const table of TABLES) {
        expect(await adminCount(e, table, first.id)).toBe(0);
      }

      // 3. 같은 이메일로 다시 가입: 새 id, 이전 기록 없음, 약관 다시 받음
      const again = await createTestUserWithEmail(
        e,
        email,
        `test_new_${runId}`,
      );
      created.push(again.id);
      expect(again.id).not.toBe(first.id);

      const profile = await rest<
        {
          user_id: string;
          nickname: string | null;
          terms_agreed_at: string | null;
          birth_confirmed_at: string | null;
        }[]
      >(
        e,
        "profiles?select=user_id,nickname,terms_agreed_at,birth_confirmed_at",
        {
          token: again.token,
        },
      );
      expect(profile.data).toHaveLength(1);
      expect(profile.data?.[0]).toMatchObject({
        user_id: again.id,
        terms_agreed_at: null,
        birth_confirmed_at: null,
      });
      expect(profile.data?.[0]?.nickname).not.toBe(`test_old_${runId}`);

      const offices = await rest<unknown[]>(e, "offices?select=id", {
        token: again.token,
      });
      expect(offices.data).toEqual([]);
      const avoids = await rest<unknown[]>(e, "avoid_rules?select=id", {
        token: again.token,
      });
      expect(avoids.data).toEqual([]);
      const prefs = await rest<{ lunch_budget: number }[]>(
        e,
        "preferences?select=lunch_budget",
        { token: again.token },
      );
      expect(prefs.data?.[0]?.lunch_budget).toBe(10000);

      // 이전 id로는 어떤 행도 남지 않았다
      for (const table of TABLES) {
        expect(await adminCount(e, table, first.id)).toBe(0);
      }
    });
  },
);
