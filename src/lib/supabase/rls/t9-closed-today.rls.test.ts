// T9.18 RLS 테스트: place_stats.closed_today(이번 끼니 "오늘만 쉬어요" 제보 수), 본인 "오늘만 쉬어요" 2분 안 삭제 (D-40)
// 마이그레이션: supabase/migrations/20261104100000_t9_18_closed_today.sql
//
// 실행: pnpm test:rls (RUN_RLS_TESTS=1). 평소 pnpm test에서는 건너뛴다. 마이그레이션 전(closed_today 열 없음)에도 건너뛴다.
// 역할: 본인 = 제보한 사람 세션, 타인 = 다른 사용자 세션, 비로그인 = publishable 키만.
// secret 키는 사용자 생성, 삭제와 시간 경과 흉내(제보 시각을 과거로 돌리는 adminPatch)에만 쓴다.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  adminPatch,
  createTestUser,
  deleteAuthUser,
  loadRlsEnv,
  newRunId,
  rest,
  rpc,
  type RlsEnv,
  type TestUser,
} from "./harness";

const env = loadRlsEnv();

async function columnReady(e: RlsEnv): Promise<boolean> {
  try {
    const r = await rpc<Record<string, unknown>[]>(e, "place_stats", {
      p_place_ids: ["1"],
    });
    return (
      r.error === null &&
      r.data?.[0] !== undefined &&
      "closed_today" in r.data[0]
    );
  } catch {
    return false;
  }
}

const ready = env !== null && (await columnReady(env));

/** 테스트 전용 장소 id(숫자 15자리, 실제 카카오 id와 겹치지 않게 9로 시작) */
function placeId(): string {
  return `9${String(Math.floor(Math.random() * 1e14)).padStart(14, "0")}`;
}

type Report = { id: string };

describe.skipIf(!ready)(
  "T9.18 오늘 쉬어요 집계와 되돌리기 (본인, 타인, 비로그인)",
  { timeout: 90_000 },
  () => {
    const e = env as RlsEnv;
    const runId = newRunId();
    let a: TestUser;
    let b: TestUser;
    const P = placeId();
    const P_GONE = placeId();
    const P_OLD = placeId();

    const report = (user: TestUser, place: string, closed: string) =>
      rest<Report[]>(e, "place_reports", {
        method: "POST",
        token: user.token,
        body: { place_id: place, kind: "closed", detail: { closed } },
      });
    const closedToday = async (place: string, token?: string) => {
      const r = await rpc<{ closed_today: number }[]>(
        e,
        "place_stats",
        { p_place_ids: [place] },
        token,
      );
      expect(r.error).toBeNull();
      return r.data?.[0]?.closed_today;
    };

    beforeAll(async () => {
      [a, b] = await Promise.all([
        createTestUser(e, runId, "a"),
        createTestUser(e, runId, "b"),
      ]);
    }, 90_000);

    afterAll(async () => {
      await Promise.all([a, b].map((u) => u && deleteAuthUser(e, u.id)));
    }, 60_000);

    it("서로 다른 사람 수를 세고, 비로그인도 집계만 읽는다(작성자 없음)", async () => {
      expect((await report(a, P, "today")).error).toBeNull();
      expect(await closedToday(P)).toBe(1);
      expect((await report(b, P, "today")).error).toBeNull();
      expect(await closedToday(P)).toBe(2);
      expect(await closedToday(P, a.token)).toBe(2);
    });

    it("타인과 비로그인은 A의 제보를 지우지 못한다", async () => {
      const byB = await rest<Report[]>(
        e,
        `place_reports?place_id=eq.${P}&user_id=eq.${a.id}`,
        { method: "DELETE", token: b.token },
      );
      expect(byB.data ?? []).toEqual([]);
      const anon = await rest<Report[]>(
        e,
        `place_reports?place_id=eq.${P}&user_id=eq.${a.id}`,
        { method: "DELETE" },
      );
      expect(anon.data ?? []).toEqual([]);
      expect(await closedToday(P)).toBe(2);
    });

    it("본인은 2분 안의 오늘 쉬어요 제보를 지울 수 있다", async () => {
      const del = await rest<Report[]>(
        e,
        `place_reports?place_id=eq.${P}&user_id=eq.${a.id}`,
        { method: "DELETE", token: a.token },
      );
      expect(del.error).toBeNull();
      expect(del.data).toHaveLength(1);
      expect(await closedToday(P)).toBe(1);
    });

    it("2분이 지난 제보와 다른 종류(아예 닫았어요)는 지우지 못한다", async () => {
      const old = new Date(Date.now() - 3 * 60_000).toISOString();
      await adminPatch(
        e,
        "place_reports",
        `place_id=eq.${P}&user_id=eq.${b.id}`,
        {
          created_at: old,
        },
      );
      const late = await rest<Report[]>(
        e,
        `place_reports?place_id=eq.${P}&user_id=eq.${b.id}`,
        { method: "DELETE", token: b.token },
      );
      expect(late.data ?? []).toEqual([]);

      expect((await report(a, P_GONE, "gone")).error).toBeNull();
      const gone = await rest<Report[]>(
        e,
        `place_reports?place_id=eq.${P_GONE}&user_id=eq.${a.id}`,
        { method: "DELETE", token: a.token },
      );
      expect(gone.data ?? []).toEqual([]);
      // 오늘 쉬어요 집계에는 들어가지 않는다
      expect(await closedToday(P_GONE)).toBe(0);
    });

    it("이번 끼니 전에 남긴 제보는 세지 않는다", async () => {
      expect((await report(a, P_OLD, "today")).error).toBeNull();
      expect(await closedToday(P_OLD)).toBe(1);
      const yesterday = new Date(Date.now() - 24 * 3_600_000).toISOString();
      await adminPatch(e, "place_reports", `place_id=eq.${P_OLD}`, {
        created_at: yesterday,
      });
      expect(await closedToday(P_OLD)).toBe(0);
    });
  },
);
