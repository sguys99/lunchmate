// T5.14 RLS 테스트: visits, favorites, blocklist
// 마이그레이션: supabase/migrations/20261031120000_t5_14_visits_favorites_blocklist.sql
//
// 실행: pnpm test:rls (RUN_RLS_TESTS=1). 평소 pnpm test에서는 건너뛴다. 조건은 t4-account.rls.test.ts와 같고,
// 이 마이그레이션이 클라우드 개발 DB에 적용되기 전(visits가 PGRST205)에도 자동으로 건너뛴다.
//
// 역할 3가지 (CLAUDE.md 10장): 본인 = A 세션, 타인 = B 세션(A의 행을 노림), 비로그인 = 세션 없이 publishable 키만.
// 단언은 전부 publishable 키 + 세션으로 한다. secret 키는 테스트 사용자 생성, 삭제, 탈퇴 후 잔여 행 세기에만 쓴다.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  adminCount,
  createTestUser,
  deleteAuthUser,
  loadRlsEnv,
  newRunId,
  rest,
  schemaReady,
  type RlsEnv,
  type TestUser,
} from "./harness";

const env = loadRlsEnv();
const ready = env !== null && (await schemaReady(env, "visits"));

const PERMISSION_DENIED = "42501";
const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";

type VisitRow = {
  id: string;
  user_id: string;
  place_id: string;
  place_url: string | null;
  meal: string;
  visited_on: string;
  source: string;
  status: string;
  feedback_requested_at: string | null;
};
type PlaceListRow = {
  user_id: string;
  place_id: string;
  place_url: string | null;
};

const PLACE_A = "1000001";
const PLACE_B = "1000002";

function kstToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

describe.skipIf(!ready)(
  "T5.14 방문, 즐겨찾기, 다시 안 갈 곳 RLS (본인, 타인, 비로그인)",
  { timeout: 30_000 },
  () => {
    const e = env as RlsEnv;
    const runId = newRunId();
    let a: TestUser;
    let b: TestUser;
    const created: string[] = [];
    let visitId = "";

    beforeAll(async () => {
      a = await createTestUser(e, runId, "a");
      created.push(a.id);
      b = await createTestUser(e, runId, "b");
      created.push(b.id);
    }, 60_000);

    afterAll(async () => {
      await Promise.all(created.map((id) => deleteAuthUser(e, id)));
    }, 60_000);

    describe("visits", () => {
      it("본인은 방문 후보를 만든다. 날짜, 상태는 서버가 정한다", async () => {
        const r = await rest<VisitRow[]>(e, "visits", {
          method: "POST",
          token: a.token,
          body: {
            place_id: PLACE_A,
            place_url: `http://place.map.kakao.com/${PLACE_A}`,
            meal: "lunch",
            source: "rec",
          },
        });
        expect(r.error).toBeNull();
        const row = r.data?.[0];
        expect(row).toMatchObject({
          user_id: a.id,
          status: "candidate",
          visited_on: kstToday(),
          feedback_requested_at: null,
        });
        visitId = row?.id ?? "";
      });

      it("같은 날 같은 끼니 같은 곳은 한 행", async () => {
        const r = await rest(e, "visits", {
          method: "POST",
          token: a.token,
          body: { place_id: PLACE_A, meal: "lunch", source: "map" },
        });
        expect(r.error?.code).toBe(UNIQUE_VIOLATION);
      });

      it("본인도 방문일, 상태를 삽입 때 정할 수 없다(열 권한)", async () => {
        for (const extra of [
          { visited_on: "2000-01-01" },
          { status: "visited" },
        ]) {
          const r = await rest(e, "visits", {
            method: "POST",
            token: a.token,
            body: {
              place_id: PLACE_B,
              meal: "dinner",
              source: "rec",
              ...extra,
            },
          });
          expect(r.error?.code).toBe(PERMISSION_DENIED);
        }
      });

      it("카카오 id, 링크 형식이 아니면 거절한다", async () => {
        for (const body of [
          { place_id: "식당이름", meal: "lunch", source: "rec" },
          {
            place_id: PLACE_B,
            place_url: "https://example.com/x",
            meal: "lunch",
            source: "rec",
          },
          {
            place_id: PLACE_B,
            place_url: `https://place.map.kakao.com/${PLACE_A}`,
            meal: "lunch",
            source: "rec",
          },
          { place_id: PLACE_B, meal: "brunch", source: "rec" },
          { place_id: PLACE_B, meal: "lunch", source: "direct" },
        ]) {
          const r = await rest(e, "visits", {
            method: "POST",
            token: a.token,
            body,
          });
          expect(r.error?.code).toBe(CHECK_VIOLATION);
        }
      });

      it("다른 사람 user_id로는 만들 수 없다", async () => {
        const r = await rest(e, "visits", {
          method: "POST",
          token: b.token,
          body: {
            user_id: a.id,
            place_id: PLACE_B,
            meal: "lunch",
            source: "rec",
          },
        });
        expect(r.error?.code).toBe(PERMISSION_DENIED);
      });

      it("피드백을 물은 시각은 서버 시각으로 한 번만 기록된다", async () => {
        const set = await rest<VisitRow[]>(e, `visits?id=eq.${visitId}`, {
          method: "PATCH",
          token: a.token,
          body: { feedback_requested_at: "2000-01-01T00:00:00Z" },
        });
        const at = set.data?.[0]?.feedback_requested_at;
        expect(at).toBeTruthy();
        expect(Date.now() - new Date(at as string).getTime()).toBeLessThan(
          5 * 60_000,
        );
        const undo = await rest<VisitRow[]>(e, `visits?id=eq.${visitId}`, {
          method: "PATCH",
          token: a.token,
          body: { feedback_requested_at: null },
        });
        expect(undo.data?.[0]?.feedback_requested_at).toBe(at);
      });

      it("상태는 응답으로 바뀌고 후보로 되돌릴 수 없다", async () => {
        const ok = await rest<VisitRow[]>(e, `visits?id=eq.${visitId}`, {
          method: "PATCH",
          token: a.token,
          body: { status: "not_visited" },
        });
        expect(ok.data?.[0]?.status).toBe("not_visited");
        const back = await rest(e, `visits?id=eq.${visitId}`, {
          method: "PATCH",
          token: a.token,
          body: { status: "candidate" },
        });
        expect(back.error?.code).toBe(CHECK_VIOLATION);
      });

      it("본인도 장소 id나 날짜는 바꿀 수 없다", async () => {
        for (const body of [
          { place_id: PLACE_B },
          { visited_on: "2000-01-01" },
        ]) {
          const r = await rest(e, `visits?id=eq.${visitId}`, {
            method: "PATCH",
            token: a.token,
            body,
          });
          expect(r.error?.code).toBe(PERMISSION_DENIED);
        }
      });

      it("타인은 A의 방문을 읽거나 고치거나 지우지 못한다", async () => {
        const read = await rest<VisitRow[]>(
          e,
          `visits?select=*&user_id=eq.${a.id}`,
          { token: b.token },
        );
        expect(read.data).toEqual([]);
        const patch = await rest<VisitRow[]>(e, `visits?id=eq.${visitId}`, {
          method: "PATCH",
          token: b.token,
          body: { status: "visited" },
        });
        expect(patch.data).toEqual([]);
        const del = await rest<VisitRow[]>(e, `visits?id=eq.${visitId}`, {
          method: "DELETE",
          token: b.token,
        });
        expect(del.data).toEqual([]);
        const still = await rest<VisitRow[]>(e, `visits?id=eq.${visitId}`, {
          token: a.token,
        });
        expect(still.data?.[0]?.status).toBe("not_visited");
      });

      it("비로그인은 visits 권한이 없다", async () => {
        expect((await rest(e, "visits?select=*")).error?.code).toBe(
          PERMISSION_DENIED,
        );
        const ins = await rest(e, "visits", {
          method: "POST",
          body: { place_id: PLACE_A, meal: "lunch", source: "rec" },
        });
        expect(ins.error?.code).toBe(PERMISSION_DENIED);
      });

      it("본인은 자기 방문을 지울 수 있다", async () => {
        const r = await rest<VisitRow[]>(e, `visits?id=eq.${visitId}`, {
          method: "DELETE",
          token: a.token,
        });
        expect(r.data).toHaveLength(1);
      });
    });

    for (const table of ["favorites", "blocklist"] as const) {
      describe(table, () => {
        it("본인은 추가하고 자기 목록만 읽는다", async () => {
          const ins = await rest<PlaceListRow[]>(e, table, {
            method: "POST",
            token: a.token,
            body: {
              place_id: PLACE_A,
              place_url: `https://place.map.kakao.com/${PLACE_A}`,
            },
          });
          expect(ins.error).toBeNull();
          expect(ins.data?.[0]?.user_id).toBe(a.id);
          await rest(e, table, {
            method: "POST",
            token: b.token,
            body: { place_id: PLACE_B },
          });
          const mine = await rest<PlaceListRow[]>(e, `${table}?select=*`, {
            token: a.token,
          });
          expect(mine.data?.map((r) => r.place_id)).toEqual([PLACE_A]);
        });

        it("같은 곳은 두 번 넣을 수 없고, 카카오 형식이 아니면 거절한다", async () => {
          const dup = await rest(e, table, {
            method: "POST",
            token: a.token,
            body: { place_id: PLACE_A },
          });
          expect(dup.error?.code).toBe(UNIQUE_VIOLATION);
          const bad = await rest(e, table, {
            method: "POST",
            token: a.token,
            body: { place_id: "abc" },
          });
          expect(bad.error?.code).toBe(CHECK_VIOLATION);
        });

        it("타인은 A의 행을 읽거나 지우지 못하고, A 이름으로 넣지 못한다", async () => {
          const read = await rest<PlaceListRow[]>(
            e,
            `${table}?select=*&user_id=eq.${a.id}`,
            { token: b.token },
          );
          expect(read.data).toEqual([]);
          const del = await rest<PlaceListRow[]>(
            e,
            `${table}?user_id=eq.${a.id}`,
            { method: "DELETE", token: b.token },
          );
          expect(del.data).toEqual([]);
          const ins = await rest(e, table, {
            method: "POST",
            token: b.token,
            body: { user_id: a.id, place_id: PLACE_B },
          });
          expect(ins.error?.code).toBe(PERMISSION_DENIED);
        });

        it("수정 권한은 없다(해제는 삭제)", async () => {
          const r = await rest(e, `${table}?user_id=eq.${a.id}`, {
            method: "PATCH",
            token: a.token,
            body: { place_url: null },
          });
          expect(r.error?.code).toBe(PERMISSION_DENIED);
        });

        it("비로그인은 권한이 없다", async () => {
          expect((await rest(e, `${table}?select=*`)).error?.code).toBe(
            PERMISSION_DENIED,
          );
        });

        it("본인은 해제(삭제)할 수 있다", async () => {
          const r = await rest<PlaceListRow[]>(
            e,
            `${table}?place_id=eq.${PLACE_A}`,
            { method: "DELETE", token: a.token },
          );
          expect(r.data).toHaveLength(1);
        });
      });
    }

    describe("탈퇴 cascade (AUTH-05, PRD 11.4)", () => {
      it("auth 사용자를 지우면 세 테이블의 행이 모두 사라진다", async () => {
        const c = await createTestUser(e, runId, "c");
        created.push(c.id);
        await rest(e, "visits", {
          method: "POST",
          token: c.token,
          body: { place_id: PLACE_A, meal: "lunch", source: "poll" },
        });
        await rest(e, "favorites", {
          method: "POST",
          token: c.token,
          body: { place_id: PLACE_A },
        });
        await rest(e, "blocklist", {
          method: "POST",
          token: c.token,
          body: { place_id: PLACE_B },
        });
        expect(await adminCount(e, "visits", c.id)).toBe(1);
        await deleteAuthUser(e, c.id);
        for (const table of ["visits", "favorites", "blocklist"]) {
          expect(await adminCount(e, table, c.id)).toBe(0);
        }
      });
    });
  },
);
