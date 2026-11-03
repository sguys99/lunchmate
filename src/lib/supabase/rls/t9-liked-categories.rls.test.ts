// T9.17 RLS 테스트: preferences.liked_categories, taste_prompt_dismissed_at (D-39)
// 마이그레이션: supabase/migrations/20261103220000_t9_17_liked_categories.sql
//
// 실행: pnpm test:rls (RUN_RLS_TESTS=1). 평소 pnpm test에서는 건너뛴다.
// 이 마이그레이션이 적용되기 전(liked_categories 열 없음)에도 자동으로 건너뛴다.
//
// 역할 3가지 (CLAUDE.md 10장): 본인 = A 세션, 타인 = B 세션(A의 행을 노림), 비로그인 = publishable 키만.
// 단언은 전부 publishable 키 + 세션으로 한다. secret 키는 테스트 사용자 생성, 삭제에만 쓴다.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createTestUser,
  deleteAuthUser,
  loadRlsEnv,
  newRunId,
  rest,
  type RlsEnv,
  type TestUser,
} from "./harness";

const env = loadRlsEnv();

/** 열이 없으면(마이그레이션 전) PostgREST가 42703을 돌려준다. 비로그인은 권한 오류가 나도 열은 있는 것이다 */
async function columnReady(e: RlsEnv): Promise<boolean> {
  try {
    const r = await rest(e, "preferences?select=liked_categories&limit=1");
    return r.error?.code !== "42703";
  } catch {
    return false;
  }
}

const ready = env !== null && (await columnReady(env));

const CHECK_VIOLATION = "23514";

type Row = {
  user_id: string;
  liked_categories: string[];
  taste_prompt_dismissed_at: string | null;
};

describe.skipIf(!ready)(
  "T9.17 좋아하는 음식 (본인, 타인, 비로그인)",
  { timeout: 90_000 },
  () => {
    const e = env as RlsEnv;
    const runId = newRunId();
    let a: TestUser;
    let b: TestUser;

    const patchA = (token: string | undefined, body: unknown) =>
      rest<Row[]>(e, `preferences?user_id=eq.${a.id}`, {
        method: "PATCH",
        token,
        body,
      });

    beforeAll(async () => {
      [a, b] = await Promise.all([
        createTestUser(e, runId, "a"),
        createTestUser(e, runId, "b"),
      ]);
    }, 90_000);

    afterAll(async () => {
      await Promise.all([a, b].map((u) => u && deleteAuthUser(e, u.id)));
    }, 60_000);

    describe("본인", () => {
      it("가입 시 빈 목록, 닫은 시각 없음", async () => {
        const r = await rest<Row[]>(
          e,
          "preferences?select=user_id,liked_categories,taste_prompt_dismissed_at",
          { token: a.token },
        );
        expect(r.data).toEqual([
          {
            user_id: a.id,
            liked_categories: [],
            taste_prompt_dismissed_at: null,
          },
        ]);
      });

      it("5개까지 고를 수 있고 중복은 지우고 정렬한다", async () => {
        const r = await patchA(a.token, {
          liked_categories: [
            "ilsik",
            "gukbap",
            "ilsik",
            "salad",
            "bunsik",
            "asian",
          ],
        });
        expect(r.error).toBeNull();
        expect(r.data?.[0]?.liked_categories).toEqual([
          "asian",
          "bunsik",
          "gukbap",
          "ilsik",
          "salad",
        ]);
      });

      it("6개 이상, 술집, 모르는 값은 거부한다", async () => {
        const six = await patchA(a.token, {
          liked_categories: [
            "hansik",
            "jungsik",
            "ilsik",
            "yangsik",
            "bunsik",
            "gukbap",
          ],
        });
        expect(six.error?.code).toBe(CHECK_VIOLATION);
        const pub = await patchA(a.token, { liked_categories: ["pub"] });
        expect(pub.error?.code).toBe(CHECK_VIOLATION);
        const unknown = await patchA(a.token, { liked_categories: ["pizza"] });
        expect(unknown.error?.code).toBe(CHECK_VIOLATION);
      });

      it("띠를 닫은 시각을 기록할 수 있다", async () => {
        const at = new Date().toISOString();
        const r = await patchA(a.token, { taste_prompt_dismissed_at: at });
        expect(r.error).toBeNull();
        expect(
          new Date(r.data?.[0]?.taste_prompt_dismissed_at as string).getTime(),
        ).toBe(new Date(at).getTime());
      });
    });

    describe("타인", () => {
      it("A의 좋아하는 음식을 읽거나 바꾸지 못한다", async () => {
        const read = await rest(
          e,
          `preferences?select=liked_categories&user_id=eq.${a.id}`,
          { token: b.token },
        );
        expect(read.data).toEqual([]);
        const upd = await patchA(b.token, { liked_categories: ["gogi"] });
        expect(upd.data).toEqual([]);
        const mine = await rest<Row[]>(
          e,
          `preferences?select=liked_categories&user_id=eq.${a.id}`,
          { token: a.token },
        );
        expect(mine.data?.[0]?.liked_categories).not.toContain("gogi");
      });
    });

    describe("비로그인", () => {
      it("읽기는 빈 결과, 수정은 거부되거나 아무 행도 바꾸지 못한다", async () => {
        const read = await rest(e, "preferences?select=liked_categories");
        expect(read.data ?? []).toEqual([]);
        const upd = await patchA(undefined, { liked_categories: ["gogi"] });
        expect(upd.data ?? []).toEqual([]);
      });
    });
  },
);
