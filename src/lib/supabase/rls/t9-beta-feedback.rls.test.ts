// T9.4 RLS/함수 테스트: 베타 의견(beta_feedback) 본인 쓰기와 읽기, 하루 10건, 정지 차단, 관리자 읽기 함수, 탈퇴 cascade
// 마이그레이션: supabase/migrations/20261102120000_t9_4_beta_feedback.sql
//
// 실행: pnpm test:rls (RUN_RLS_TESTS=1). 평소 pnpm test에서는 건너뛴다. 이 마이그레이션이 클라우드 개발 DB에
// 적용되기 전(beta_feedback이 PGRST205)에도 자동으로 건너뛴다.
//
// 역할 (CLAUDE.md 10장): 본인 = 작성자 세션, 타인 = 다른 사용자 세션, 비로그인 = publishable 키만, 관리자 = role admin 세션,
// 정지된 본인 = 정지된 사용자 세션. 단언은 전부 publishable 키 + 세션으로 한다. secret 키는 사용자 생성, 삭제,
// 관리자 role과 정지 상태 지정(SQL 편집기 대신, 준비 전용), 탈퇴 뒤 잔여 행 세기(account_residue)에만 쓴다.
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
const ready = env !== null && (await schemaReady(env, "beta_feedback"));

const PERMISSION_DENIED = "42501";
const CHECK_VIOLATION = "23514";

type FeedbackRow = { id: string; user_id: string; body: string };
type AdminRow = {
  id: string;
  author_no: number;
  category: string | null;
  body: string;
  route: string | null;
  device: string;
};
type ResidueRow = {
  table_schema: string;
  table_name: string;
  on_delete: string;
  remaining: number;
};

function row(userId: string, body: string, over: Record<string, unknown> = {}) {
  return {
    user_id: userId,
    category: "bug",
    body,
    route: "/poll/[code]",
    app_version: "0.1.0",
    algo_version: "2026-11-01.1",
    device: "ios",
    in_app: true,
    standalone: false,
    ...over,
  };
}

describe.skipIf(!ready)(
  "T9.4 베타 의견 (본인, 타인, 비로그인, 관리자, 정지된 본인)",
  { timeout: 90_000 },
  () => {
    const e = env as RlsEnv;
    const runId = newRunId();
    let admin: TestUser;
    let a: TestUser; // 본인
    let b: TestUser; // 타인
    let s: TestUser; // 정지될 사용자
    let q: TestUser; // 한도 확인용
    let gone: TestUser; // 탈퇴 확인용
    const created: string[] = [];
    let aRowId = "";

    async function send(user: TestUser | undefined, body: unknown) {
      return rest<FeedbackRow[]>(e, "beta_feedback", {
        method: "POST",
        token: user?.token,
        body,
      });
    }

    beforeAll(async () => {
      [admin, a, b, s, q, gone] = await Promise.all([
        createTestUser(e, runId, "adm"),
        createTestUser(e, runId, "a"),
        createTestUser(e, runId, "b"),
        createTestUser(e, runId, "s"),
        createTestUser(e, runId, "q"),
        createTestUser(e, runId, "g"),
      ]);
      created.push(admin.id, a.id, b.id, s.id, q.id, gone.id);
      // 관리자 지정과 정지는 SQL 편집기(관리자 화면)에서 한다. 테스트는 secret 키로 같은 일을 한다(준비 전용)
      await adminPatch(e, "profiles", `user_id=eq.${admin.id}`, { role: "admin" });
      await adminPatch(e, "profiles", `user_id=eq.${s.id}`, {
        status: "suspended",
        suspended_reason: "other",
      });
      const r = await send(a, row(a.id, `본인 의견 ${runId}`));
      expect(r.error).toBeNull();
      aRowId = r.data?.[0]?.id ?? "";
    }, 90_000);

    afterAll(async () => {
      await Promise.all(created.map((id) => deleteAuthUser(e, id)));
    }, 60_000);

    describe("본인", () => {
      it("쓰기 성공, 본인 행만 읽힌다", async () => {
        expect(aRowId).not.toBe("");
        const r = await rest<FeedbackRow[]>(e, "beta_feedback?select=id,user_id,body", {
          token: a.token,
        });
        expect(r.error).toBeNull();
        expect(r.data?.every((x) => x.user_id === a.id)).toBe(true);
        expect(r.data?.map((x) => x.id)).toContain(aRowId);
      });

      it("고치기와 지우기는 권한이 없다", async () => {
        const p = await rest(e, `beta_feedback?id=eq.${aRowId}`, {
          method: "PATCH",
          token: a.token,
          body: { body: "고친 글" },
        });
        expect(p.error?.code).toBe(PERMISSION_DENIED);
        const d = await rest(e, `beta_feedback?id=eq.${aRowId}`, {
          method: "DELETE",
          token: a.token,
        });
        expect(d.error?.code).toBe(PERMISSION_DENIED);
      });

      it("created_at, id는 직접 넣지 못한다(열 권한)", async () => {
        const r = await send(a, {
          ...row(a.id, `시각 조작 ${runId}`),
          created_at: "2020-01-01T00:00:00Z",
        });
        expect(r.error?.code).toBe(PERMISSION_DENIED);
      });

      it("형식 규칙: 빈 글, 501자, 모르는 종류, 경로 틀이 아닌 route, 모르는 기기는 거절", async () => {
        for (const over of [
          { body: "   " },
          { body: "가".repeat(501) },
          { category: "praise" },
          { route: "/poll/abc123xyz0?ref=kakao" },
          { route: "/37.5665,126.978" },
          { device: "windows" },
        ]) {
          const r = await send(a, { ...row(a.id, `형식 ${runId}`), ...over });
          expect(r.error?.code, JSON.stringify(over).slice(0, 40)).toBe(CHECK_VIOLATION);
        }
      });

      it("하루 10건까지, 11번째는 beta_feedback_daily_limit_exceeded", async () => {
        for (let i = 0; i < 10; i++) {
          const r = await send(q, row(q.id, `한도 ${i} ${runId}`));
          expect(r.error, `${i}번째`).toBeNull();
        }
        const over = await send(q, row(q.id, `한도 초과 ${runId}`));
        expect(over.error?.code).toBe(CHECK_VIOLATION);
        expect(over.error?.message).toContain("beta_feedback_daily_limit_exceeded");
      });
    });

    describe("타인", () => {
      it("남의 행은 0건", async () => {
        const r = await rest<FeedbackRow[]>(e, `beta_feedback?id=eq.${aRowId}`, {
          token: b.token,
        });
        expect(r.error).toBeNull();
        expect(r.data).toEqual([]);
      });

      it("user_id를 남으로 넣으면 거절", async () => {
        const r = await send(b, row(a.id, `대신 쓰기 ${runId}`));
        expect(r.error?.code).toBe(PERMISSION_DENIED);
      });

      it("남의 행을 고치거나 지우지 못한다", async () => {
        const d = await rest(e, `beta_feedback?id=eq.${aRowId}`, {
          method: "DELETE",
          token: b.token,
        });
        expect(d.error?.code).toBe(PERMISSION_DENIED);
      });
    });

    describe("비로그인", () => {
      it("쓰기와 읽기 모두 거절", async () => {
        const w = await send(undefined, row(a.id, `비로그인 ${runId}`));
        expect(w.error?.code).toBe(PERMISSION_DENIED);
        const r = await rest(e, "beta_feedback?select=id", {});
        expect(r.error?.code).toBe(PERMISSION_DENIED);
      });
    });

    describe("정지된 본인", () => {
      it("쓰기는 account_suspended로 거절된다", async () => {
        const r = await send(s, row(s.id, `정지 ${runId}`));
        expect(r.error?.code).toBe(PERMISSION_DENIED);
        expect(r.error?.message).toContain("account_suspended");
      });
    });

    describe("관리자 읽기 함수", () => {
      it("본인(비관리자), 타인, 비로그인은 admin_beta_feedback을 부르지 못한다", async () => {
        for (const token of [a.token, b.token, undefined]) {
          const r = await rpc(e, "admin_beta_feedback", { p_limit: 5 }, token);
          expect(r.data).toBeNull();
          expect(r.error?.code).toBe(PERMISSION_DENIED);
        }
      });

      it("관리자도 테이블은 직접 읽지 못하고(본인 행만), 함수로는 익명 번호와 함께 최신순으로 읽는다", async () => {
        const direct = await rest<FeedbackRow[]>(e, `beta_feedback?id=eq.${aRowId}`, {
          token: admin.token,
        });
        expect(direct.data).toEqual([]);

        const r = await rpc<AdminRow[]>(e, "admin_beta_feedback", { p_limit: 200 }, admin.token);
        expect(r.error).toBeNull();
        const mine = r.data?.find((x) => x.id === aRowId);
        expect(mine?.author_no).toBeGreaterThan(0);
        const keys = Object.keys(mine ?? {});
        expect(keys).not.toContain("user_id");
        expect(keys).not.toContain("nickname");
        // 같은 사람의 의견은 같은 번호
        const qNos = new Set(
          r.data?.filter((x) => x.body.includes(`한도 `) && x.body.includes(runId)).map((x) => x.author_no),
        );
        expect(qNos.size).toBe(1);
      });

      it("p_before로 다음 쪽을 받는다", async () => {
        const first = await rpc<(AdminRow & { created_at: string })[]>(
          e,
          "admin_beta_feedback",
          { p_limit: 1 },
          admin.token,
        );
        const at = first.data?.[0]?.created_at;
        expect(at).toBeTruthy();
        const next = await rpc<(AdminRow & { created_at: string })[]>(
          e,
          "admin_beta_feedback",
          { p_limit: 5, p_before: at },
          admin.token,
        );
        expect(next.error).toBeNull();
        expect(next.data?.every((x) => x.created_at < (at as string))).toBe(true);
      });
    });

    describe("탈퇴", () => {
      it("Auth 사용자를 지우면 베타 의견도 cascade로 지워진다", async () => {
        const w = await send(gone, row(gone.id, `탈퇴 ${runId}`));
        expect(w.error).toBeNull();
        await deleteAuthUser(e, gone.id);
        const res = await adminRpc<ResidueRow[]>(e, "account_residue", {
          p_user_id: gone.id,
        });
        expect(res.error).toBeNull();
        const t = res.data?.find(
          (x) => x.table_schema === "public" && x.table_name === "beta_feedback",
        );
        expect(t?.on_delete).toBe("cascade");
        expect(Number(t?.remaining)).toBe(0);
      });
    });
  },
);
