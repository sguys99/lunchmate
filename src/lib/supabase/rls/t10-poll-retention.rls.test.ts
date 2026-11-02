// T10.3 후속(D-28) RLS 테스트: 끝난 투표방 90일 보관 뒤 삭제
// 마이그레이션: supabase/migrations/20261102210000_t10_3_poll_retention.sql
//
// 실행: pnpm test:rls (RUN_RLS_TESTS=1). 이 마이그레이션이 클라우드 개발 DB에 적용되기 전(purge_old_polls_now가 PGRST202)에는
// 자동으로 건너뛴다.
//
// 확인하는 것
// - 마감 또는 취소된 지 90일이 지난 방은 지워지고, 후보, 참여자, 표가 cascade로 함께 사라진다.
// - 90일이 안 된 끝난 방과 진행 중인 방은 남는다.
// - 확정 때 참여자 각자에게 만든 방문 기록(visits source poll)은 방이 지워져도 남는다(본인 세션으로 읽어 확인).
// - 점검 함수 purge_old_polls_now는 사용자 세션과 비로그인이 부를 수 없다(service_role 전용).
// 단언 가운데 권한과 방문 기록은 publishable 키 + 세션으로 본다. secret 키는 사용자 생성, 삭제, closed_at을 과거로 돌리는 준비,
// 삭제 뒤 남은 행 세기(참여자가 아니게 된 행은 RLS로 셀 수 없다), 점검 함수 호출에만 쓴다.
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

async function purgeReady(e: RlsEnv): Promise<boolean> {
  // 비로그인 호출: 함수가 있으면 권한 오류, 없으면 PGRST202. 부작용 없이 적용 여부만 본다
  const r = await rpc(e, "purge_old_polls_now", {});
  return r.error?.code !== "PGRST202";
}

const ready =
  env !== null &&
  (await schemaReady(env, "poll_members")) &&
  (await purgeReady(env));

type Created = { poll_id: string; invite_code: string };

/** 점검 전용: secret 키로 행 수를 센다(RLS를 건너뛴다). 권한 단언에는 쓰지 않는다 */
async function adminCountWhere(
  e: RlsEnv,
  table: string,
  filter: string,
): Promise<number> {
  const res = await fetch(`${e.url}/rest/v1/${table}?select=*&${filter}`, {
    method: "HEAD",
    headers: {
      apikey: e.secretKey,
      Prefer: "count=exact",
    },
  });
  const total = Number((res.headers.get("content-range") ?? "").split("/")[1]);
  if (!Number.isFinite(total))
    throw new Error(`[rls] ${table} 개수 조회 실패 (${res.status})`);
  return total;
}

const daysAgo = (d: number) =>
  new Date(Date.now() - d * 86_400_000).toISOString();
const inMinutes = (m: number) =>
  new Date(Date.now() + m * 60_000).toISOString();

describe.skipIf(!ready)(
  "T10.3 끝난 투표방 90일 뒤 삭제 (D-28)",
  { timeout: 90_000 },
  () => {
    const e = env as RlsEnv;
    const runId = newRunId();
    const placeBase = `9${String(Date.now()).slice(-9)}${String(Math.floor(Math.random() * 90) + 10)}`;
    const place = (n: number) => `${placeBase}${String(n).padStart(3, "0")}`;

    let host: TestUser;
    let b: TestUser;
    const created: string[] = [];

    async function createPoll(user: TestUser, places: string[]) {
      const r = await rpc<Created[]>(
        e,
        "create_poll",
        {
          p_kind: "lunch",
          p_title: `test_보관_${runId}`.slice(0, 20),
          p_closes_at: inMinutes(30),
          p_multi: false,
          p_place_ids: places,
          p_place_urls: places.map((p) => `https://place.map.kakao.com/${p}`),
          p_anchor_lat: 37.5665,
          p_anchor_lng: 126.978,
          p_radius_m: 800,
        },
        user.token,
      );
      expect(r.error).toBeNull();
      return r.data![0]!;
    }

    /** b가 참여해 두 번째 후보에 투표하고 방장이 마감한다(확정, 참여자 둘에게 방문 후보) */
    async function closedPollWithVote(places: string[]) {
      const poll = await createPoll(host, places);
      expect(
        (await rpc(e, "join_poll", { p_code: poll.invite_code }, b.token))
          .error,
      ).toBeNull();
      const s = await rpc<{ candidates: { id: string }[] }>(
        e,
        "get_poll",
        { p_poll_id: poll.poll_id },
        host.token,
      );
      await rpc(
        e,
        "cast_vote",
        {
          p_poll_id: poll.poll_id,
          p_candidate_ids: [s.data!.candidates[1]!.id],
        },
        b.token,
      );
      await rpc(e, "close_poll_now", { p_poll_id: poll.poll_id }, host.token);
      return poll;
    }

    let old: Created;
    let recent: Created;
    let canceledOld: Created;
    let open: Created;
    let purged: number | null = null;

    beforeAll(async () => {
      host = await createTestUser(e, runId, "rh");
      b = await createTestUser(e, runId, "rb");
      created.push(host.id, b.id);

      old = await closedPollWithVote([place(1), place(2)]);
      recent = await closedPollWithVote([place(11), place(12)]);
      canceledOld = await createPoll(host, [place(21), place(22)]);
      await rpc(
        e,
        "cancel_poll",
        { p_poll_id: canceledOld.poll_id },
        host.token,
      );
      open = await createPoll(host, [place(31), place(32)]);

      // 준비: 마감 시각을 과거로(91일, 89일, 취소 91일)
      await adminPatch(e, "polls", `id=eq.${old.poll_id}`, {
        closed_at: daysAgo(91),
      });
      await adminPatch(e, "polls", `id=eq.${recent.poll_id}`, {
        closed_at: daysAgo(89),
      });
      await adminPatch(e, "polls", `id=eq.${canceledOld.poll_id}`, {
        closed_at: daysAgo(91),
      });

      const r = await adminRpc<number>(e, "purge_old_polls_now", {});
      expect(r.error).toBeNull();
      purged = r.data;
    });

    afterAll(async () => {
      for (const id of created) await deleteAuthUser(e, id);
    });

    it("비로그인과 사용자 세션은 점검 함수를 부를 수 없다", async () => {
      expect((await rpc(e, "purge_old_polls_now", {})).error).not.toBeNull();
      const r = await rpc(e, "purge_old_polls_now", {}, host.token);
      expect(r.error?.code).toBe("42501");
    });

    it("마감 91일 지난 방과 취소 91일 지난 방은 후보, 참여자, 표까지 지워진다", async () => {
      expect(purged).toBeGreaterThanOrEqual(2);
      for (const p of [old, canceledOld]) {
        expect(await adminCountWhere(e, "polls", `id=eq.${p.poll_id}`)).toBe(0);
        for (const t of ["poll_candidates", "poll_members", "poll_votes"]) {
          expect(await adminCountWhere(e, t, `poll_id=eq.${p.poll_id}`)).toBe(
            0,
          );
        }
      }
      // 참여자 화면에서도 사라진다(투표 탭 목록)
      const mine = await rpc<{ id: string }[]>(e, "my_polls", {}, b.token);
      expect(mine.error).toBeNull();
      expect((mine.data ?? []).map((x) => x.id)).not.toContain(old.poll_id);
    });

    it("마감 89일 된 방과 진행 중인 방은 남는다", async () => {
      for (const p of [recent, open]) {
        const r = await rest<{ id: string }[]>(
          e,
          `polls?id=eq.${p.poll_id}&select=id`,
          { token: host.token },
        );
        expect(r.data).toHaveLength(1);
      }
      expect(
        await adminCountWhere(e, "poll_votes", `poll_id=eq.${recent.poll_id}`),
      ).toBe(1);
    });

    it("확정 때 각자에게 만든 방문 기록은 방이 지워져도 남는다", async () => {
      for (const u of [host, b]) {
        const v = await rest<{ source: string }[]>(
          e,
          `visits?place_id=eq.${place(2)}&select=source`,
          { token: u.token },
        );
        expect(v.data).toEqual([{ source: "poll" }]);
      }
    });

    it("지워진 방의 초대 코드는 없는 방과 같다(미리보기 null, 화면은 찾을 수 없음)", async () => {
      const r = await rpc<{ status: string } | null>(e, "poll_preview", {
        p_code: old.invite_code,
      });
      expect(r.error).toBeNull();
      expect(r.data).toBeNull();
    });
  },
);
