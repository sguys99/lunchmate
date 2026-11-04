// T7.10 RLS 테스트: polls, poll_candidates, poll_members, poll_votes + 투표 보안 함수
// 마이그레이션: supabase/migrations/20261101140000_t7_6_polls.sql
//
// 실행: pnpm test:rls (RUN_RLS_TESTS=1). 이 마이그레이션이 클라우드 개발 DB에 적용되기 전(polls가 PGRST205)에는
// 자동으로 건너뛴다.
//
// 역할 3가지 (CLAUDE.md 10장): 본인 = 방장, 참여자 세션, 타인 = 코드를 모르는 다른 테스트 사용자, 비로그인 = 세션 없음.
// 단언은 전부 publishable 키 + 세션으로 한다. secret 키는 사용자 생성, 삭제, 그리고 준비(마감 시각을 과거로,
// 익명 참여자 행 채우기)에만 쓴다.
//
// 핵심 AC
// - AC-POLL-3: 코드를 모르는 사용자와 비로그인은 테이블로 투표방을 볼 수 없고, 코드로는 미리보기만 본다(득표 없음).
// - 무기명(G7): 참여자도 다른 사람의 표 행을 읽을 수 없고, 득표는 get_poll 집계로만 본다.
// - AC-POLL-2: 마감이 지난 뒤 아무도 열지 않았어도 다음 조회(get_poll, poll_preview)에서 확정된다.
// - AC-POLL-5: 확정되면 참여자 전원에게 오늘 방문 후보(visits source poll)가 생긴다.
// - POLL-11: 30명까지, 마감 24시간 뒤 참여자가 아니면 만료만 보인다.
// - POLL-13: 기피 경고는 장소별 true/false만 돌려주고 누구, 무엇은 어떤 응답에도 없다.
// - 동점 대기(G7): 1위가 둘이면 tie, 방장이 고르거나 30분 뒤 서버 룰렛.
// - 탈퇴(T7.29): 진행 중 방의 표는 지워지고, 끝난 방은 익명 참여자로 남고, 방장 탈퇴 시 진행 중 방은 취소.
// - 한도(MOD-05): 하루 10개, 보내기 전 만들기 취소는 한도를 돌려준다.
// - T7.30: poll_closed 보고권(claim_poll_closed_report)은 마감, 취소된 방마다 처음 부른 참여자 한 명만 받는다.
// Realtime 집계 수신(AC-POLL-1)은 웹소켓이 필요해 E2E(T7.31)에서 본다.
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
const ready = env !== null && (await schemaReady(env, "poll_members"));

const PERMISSION_DENIED = "42501";

type Created = { poll_id: string; invite_code: string };
type Preview = {
  status: string;
  title?: string;
  member_count?: number;
  is_member?: boolean;
  poll_id?: string | null;
  candidates?: {
    position: number;
    place_id: string;
    place_url: string | null;
  }[];
};
type PollState = {
  poll: {
    id: string;
    status: string;
    closed_reason: string | null;
    tie_until: string | null;
    tie_resolved_by: string | null;
    winner_place_id: string | null;
    is_host: boolean;
  };
  candidates: {
    id: string;
    place_id: string;
    status: string;
    votes: number | null;
  }[];
  members: {
    id: string;
    user_id: string | null;
    has_voted: boolean;
    is_me: boolean;
  }[];
  my_votes: string[];
  voter_count: number;
};
type LimitRow = {
  bucket: string;
  used: number;
  limit_count: number;
  remaining: number;
};

/** 준비 전용: secret 키로 행을 넣는다(익명 참여자 채우기). 권한 단언에는 쓰지 않는다 */
async function adminInsert(
  e: RlsEnv,
  table: string,
  rows: Record<string, unknown>[],
) {
  const res = await fetch(`${e.url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: e.secretKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok)
    throw new Error(
      `[rls] ${table} 준비 삽입 실패 (${res.status} ${await res.text()})`,
    );
}

const inMinutes = (m: number) =>
  new Date(Date.now() + m * 60_000).toISOString();
const hoursAgo = (h: number) =>
  new Date(Date.now() - h * 3_600_000).toISOString();

describe.skipIf(!ready)(
  "T7.6~T7.10 투표방 RLS와 보안 함수 (방장, 참여자, 타인, 비로그인)",
  { timeout: 90_000 },
  () => {
    const e = env as RlsEnv;
    const runId = newRunId();
    const placeBase = `8${String(Date.now()).slice(-9)}${String(Math.floor(Math.random() * 90) + 10)}`;
    const place = (n: number) => `${placeBase}${String(n).padStart(3, "0")}`;

    let host: TestUser;
    let b: TestUser;
    let c: TestUser;
    let outsider: TestUser;
    const created: string[] = [];

    async function createPoll(
      user: TestUser,
      places: string[],
      opts: { kind?: string; multi?: boolean; closesInMin?: number } = {},
    ) {
      const r = await rpc<Created[]>(
        e,
        "create_poll",
        {
          p_kind: opts.kind ?? "lunch",
          p_title: `test_점심_${runId}`.slice(0, 20),
          p_closes_at: inMinutes(opts.closesInMin ?? 30),
          p_multi: opts.multi ?? false,
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

    const getPoll = async (user: TestUser, id: string) =>
      rpc<PollState>(e, "get_poll", { p_poll_id: id }, user.token);

    beforeAll(async () => {
      host = await createTestUser(e, runId, "ph");
      b = await createTestUser(e, runId, "pb");
      c = await createTestUser(e, runId, "pc");
      outsider = await createTestUser(e, runId, "px");
      created.push(host.id, b.id, c.id, outsider.id);
    });

    afterAll(async () => {
      for (const id of created) await deleteAuthUser(e, id);
    });

    describe("AC-POLL-3 코드 없이는 조회 불가, 미리보기는 득표 없음", () => {
      let poll: Created;
      beforeAll(async () => {
        poll = await createPoll(host, [place(1), place(2), place(3)]);
      });

      it("방장은 테이블로 자기 방을 읽는다", async () => {
        const r = await rest<{ id: string }[]>(
          e,
          `polls?id=eq.${poll.poll_id}&select=id`,
          { token: host.token },
        );
        expect(r.data).toHaveLength(1);
      });

      it("타인은 id를 알아도 polls, 후보, 참여자, 표를 읽지 못한다", async () => {
        for (const t of [
          "polls",
          "poll_candidates",
          "poll_members",
          "poll_votes",
        ]) {
          const col = t === "polls" ? "id" : "poll_id";
          const r = await rest<unknown[]>(
            e,
            `${t}?${col}=eq.${poll.poll_id}&select=${col}`,
            {
              token: outsider.token,
            },
          );
          expect(r.data ?? []).toHaveLength(0);
        }
        const g = await getPoll(outsider, poll.poll_id);
        expect(g.error?.code).toBe(PERMISSION_DENIED);
      });

      it("비로그인은 테이블 권한이 없다", async () => {
        const r = await rest(e, `polls?select=id&limit=1`);
        expect(r.error?.code).toBe(PERMISSION_DENIED);
      });

      it("코드로 비로그인 미리보기: 제목, 후보 place_id, 인원만. 방 id와 득표는 없다", async () => {
        const r = await rpc<Preview>(e, "poll_preview", {
          p_code: poll.invite_code,
        });
        expect(r.error).toBeNull();
        expect(r.data?.status).toBe("open");
        expect(r.data?.member_count).toBe(1);
        expect(r.data?.poll_id).toBeNull();
        expect(r.data?.candidates?.map((x) => x.place_id)).toEqual([
          place(1),
          place(2),
          place(3),
        ]);
        // 확정된 방에서만 채우는 결과 숫자(20261101150000)는 진행 중이면 null이다
        const raw = r.data as Record<string, unknown>;
        expect(raw.top_votes).toBeNull();
        expect(raw.voted_count).toBeNull();
        const rest = { ...raw };
        delete rest.top_votes;
        delete rest.voted_count;
        expect(JSON.stringify(rest)).not.toMatch(
          /votes|invite_code|host_id|user_id/,
        );
      });

      it("참여자가 아니면 기준점을 약 150m 격자로 내리고 반경을 150m 넓힌다. 참여자는 정확한 값", async () => {
        type Anchor = {
          anchor_lat: number;
          anchor_lng: number;
          radius_m: number;
        };
        const anon = (
          await rpc<Anchor>(e, "poll_preview", { p_code: poll.invite_code })
        ).data!;
        const other = (
          await rpc<Anchor>(
            e,
            "poll_preview",
            { p_code: poll.invite_code },
            outsider.token,
          )
        ).data!;
        for (const v of [anon, other]) {
          expect(v.anchor_lat).not.toBe(37.5665);
          expect(v.anchor_lng).not.toBe(126.978);
          // 격자 가운데라 원본과 반 칸(약 75m) 안
          expect(Math.abs(v.anchor_lat - 37.5665)).toBeLessThanOrEqual(
            0.000676,
          );
          expect(Math.abs(v.anchor_lng - 126.978)).toBeLessThanOrEqual(
            0.000851,
          );
          expect(v.radius_m).toBe(950);
        }
        const mine = (
          await rpc<Anchor>(
            e,
            "poll_preview",
            { p_code: poll.invite_code },
            host.token,
          )
        ).data!;
        expect([mine.anchor_lat, mine.anchor_lng, mine.radius_m]).toEqual([
          37.5665, 126.978, 800,
        ]);
        const state = (
          await rpc<{ poll: Anchor }>(
            e,
            "get_poll",
            { p_poll_id: poll.poll_id },
            host.token,
          )
        ).data!;
        expect([
          state.poll.anchor_lat,
          state.poll.anchor_lng,
          state.poll.radius_m,
        ]).toEqual([37.5665, 126.978, 800]);
      });

      it("틀린 코드는 null, 형식이 다른 코드도 null", async () => {
        const wrong =
          poll.invite_code.slice(0, 11) +
          (poll.invite_code.endsWith("2") ? "3" : "2");
        expect(
          (await rpc(e, "poll_preview", { p_code: wrong })).data,
        ).toBeNull();
        expect(
          (await rpc(e, "poll_preview", { p_code: "short" })).data,
        ).toBeNull();
      });

      it("비로그인은 참여할 수 없고, 로그인 사용자는 코드로 참여한다", async () => {
        const anon = await rpc(e, "join_poll", { p_code: poll.invite_code });
        expect(anon.error).not.toBeNull();
        const j = await rpc<string>(
          e,
          "join_poll",
          { p_code: poll.invite_code },
          b.token,
        );
        expect(j.data).toBe(poll.poll_id);
        // 두 번 참여해도 같은 방
        const again = await rpc<string>(
          e,
          "join_poll",
          { p_code: poll.invite_code },
          b.token,
        );
        expect(again.data).toBe(poll.poll_id);
      });
    });

    describe("무기명 투표와 실시간 집계 값 (G7, POLL-06)", () => {
      let poll: Created;
      let state: PollState;
      beforeAll(async () => {
        poll = await createPoll(host, [place(11), place(12)]);
        await rpc(e, "join_poll", { p_code: poll.invite_code }, b.token);
        state = (await getPoll(host, poll.poll_id)).data!;
      });

      it("투표, 바꾸기, 취소. 처음 낸 표만 is_first_vote", async () => {
        const [c1, c2] = state.candidates.map((x) => x.id);
        expect(
          (
            await rpc<boolean>(
              e,
              "cast_vote",
              { p_poll_id: poll.poll_id, p_candidate_ids: [c1] },
              b.token,
            )
          ).data,
        ).toBe(true);
        expect(
          (
            await rpc<boolean>(
              e,
              "cast_vote",
              { p_poll_id: poll.poll_id, p_candidate_ids: [c2] },
              b.token,
            )
          ).data,
        ).toBe(false);
        const two = await rpc(
          e,
          "cast_vote",
          { p_poll_id: poll.poll_id, p_candidate_ids: [c1, c2] },
          b.token,
        );
        expect(two.error?.message).toContain("poll_single_choice");
        await rpc(
          e,
          "cast_vote",
          { p_poll_id: poll.poll_id, p_candidate_ids: [c1] },
          host.token,
        );
        const g = (await getPoll(host, poll.poll_id)).data!;
        expect(g.candidates.map((x) => x.votes)).toEqual([1, 1]);
        expect(g.voter_count).toBe(2);
      });

      it("참여자도 다른 사람의 표 행은 읽지 못한다(내 표만)", async () => {
        const r = await rest<unknown[]>(
          e,
          `poll_votes?poll_id=eq.${poll.poll_id}&select=candidate_id`,
          {
            token: host.token,
          },
        );
        expect(r.data).toHaveLength(1);
      });

      it("get_poll의 참여자 목록은 투표했는지만, 어디에 찍었는지는 내 것만", async () => {
        const g = (await getPoll(b, poll.poll_id)).data!;
        expect(g.members.every((m) => m.has_voted)).toBe(true);
        expect(g.my_votes).toHaveLength(1);
        expect(JSON.stringify(g.members)).not.toMatch(/candidate/);
      });

      it("표 행을 직접 넣거나 지울 수 없다(쓰기는 함수만)", async () => {
        const ins = await rest(e, "poll_votes", {
          method: "POST",
          token: b.token,
          body: {
            poll_id: poll.poll_id,
            member_id: state.members[0]!.id,
            candidate_id: state.candidates[0]!.id,
          },
        });
        expect(ins.error?.code).toBe(PERMISSION_DENIED);
        const upd = await rest(e, `polls?id=eq.${poll.poll_id}`, {
          method: "PATCH",
          token: host.token,
          body: { status: "closed" },
        });
        expect(upd.error?.code).toBe(PERMISSION_DENIED);
      });

      it("취소하면 투표 안 한 사람으로", async () => {
        await rpc(
          e,
          "cast_vote",
          { p_poll_id: poll.poll_id, p_candidate_ids: [] },
          b.token,
        );
        const g = (await getPoll(b, poll.poll_id)).data!;
        expect(g.my_votes).toHaveLength(0);
        expect(g.members.find((m) => m.is_me)?.has_voted).toBe(false);
      });
    });

    describe("AC-POLL-2, AC-POLL-5 마감 조회 시 확정과 방문 후보", () => {
      it("마감이 지난 방은 다음 조회에서 확정되고 참여자 전원에게 방문 후보가 생긴다", async () => {
        const poll = await createPoll(host, [place(21), place(22)]);
        await rpc(e, "join_poll", { p_code: poll.invite_code }, b.token);
        const s = (await getPoll(host, poll.poll_id)).data!;
        await rpc(
          e,
          "cast_vote",
          { p_poll_id: poll.poll_id, p_candidate_ids: [s.candidates[1]!.id] },
          b.token,
        );
        // 아무도 열지 않은 채 마감 시각이 지났다
        await adminPatch(e, "polls", `id=eq.${poll.poll_id}`, {
          closes_at: hoursAgo(0.01),
        });

        const g = (await getPoll(b, poll.poll_id)).data!;
        expect(g.poll.status).toBe("closed");
        expect(g.poll.closed_reason).toBe("deadline");
        expect(g.poll.winner_place_id).toBe(place(22));

        for (const u of [host, b]) {
          const v = await rest<{ source: string; status: string }[]>(
            e,
            `visits?place_id=eq.${place(22)}&select=source,status`,
            { token: u.token },
          );
          expect(v.data).toEqual([{ source: "poll", status: "candidate" }]);
        }
        // 확정된 방에는 더 투표할 수 없다
        const late = await rpc(
          e,
          "cast_vote",
          { p_poll_id: poll.poll_id, p_candidate_ids: [s.candidates[0]!.id] },
          b.token,
        );
        expect(late.error?.message).toContain("poll_closed");
      });

      it("동점이면 tie, 방장이 고르면 확정(host)", async () => {
        const poll = await createPoll(host, [place(31), place(32)]);
        await rpc(e, "join_poll", { p_code: poll.invite_code }, b.token);
        const s = (await getPoll(host, poll.poll_id)).data!;
        await rpc(
          e,
          "cast_vote",
          { p_poll_id: poll.poll_id, p_candidate_ids: [s.candidates[0]!.id] },
          host.token,
        );
        await rpc(
          e,
          "cast_vote",
          { p_poll_id: poll.poll_id, p_candidate_ids: [s.candidates[1]!.id] },
          b.token,
        );
        // 참여자는 결정할 수 없다
        expect(
          (await rpc(e, "close_poll_now", { p_poll_id: poll.poll_id }, b.token))
            .error?.code,
        ).toBe(PERMISSION_DENIED);
        await rpc(e, "close_poll_now", { p_poll_id: poll.poll_id }, host.token);
        const t = (await getPoll(b, poll.poll_id)).data!;
        expect(t.poll.status).toBe("tie");
        expect(t.poll.tie_until).not.toBeNull();
        await rpc(
          e,
          "resolve_poll_tie",
          { p_poll_id: poll.poll_id, p_candidate_id: s.candidates[1]!.id },
          host.token,
        );
        const f = (await getPoll(b, poll.poll_id)).data!;
        expect(f.poll.status).toBe("closed");
        expect(f.poll.tie_resolved_by).toBe("host");
        expect(f.poll.winner_place_id).toBe(place(32));
      });

      it("방장이 30분 안에 정하지 않은 동점은 다음 조회 때 서버 룰렛(auto)", async () => {
        const poll = await createPoll(host, [place(41), place(42)]);
        await rpc(e, "join_poll", { p_code: poll.invite_code }, b.token);
        const s = (await getPoll(host, poll.poll_id)).data!;
        await rpc(
          e,
          "cast_vote",
          { p_poll_id: poll.poll_id, p_candidate_ids: [s.candidates[0]!.id] },
          host.token,
        );
        await rpc(
          e,
          "cast_vote",
          { p_poll_id: poll.poll_id, p_candidate_ids: [s.candidates[1]!.id] },
          b.token,
        );
        await rpc(e, "close_poll_now", { p_poll_id: poll.poll_id }, host.token);
        await adminPatch(e, "polls", `id=eq.${poll.poll_id}`, {
          tie_until: hoursAgo(0.01),
        });
        const f = (await getPoll(b, poll.poll_id)).data!;
        expect(f.poll.status).toBe("closed");
        expect(f.poll.tie_resolved_by).toBe("auto");
        expect([place(41), place(42)]).toContain(f.poll.winner_place_id);
      });
    });

    describe("POLL-11 30명, 24시간 만료", () => {
      it("30명까지만 참여한다", async () => {
        const poll = await createPoll(host, [place(51), place(52)]);
        // 준비: 익명 참여자 28행(방장 1 + 28 = 29명)
        await adminInsert(
          e,
          "poll_members",
          Array.from({ length: 28 }, () => ({
            poll_id: poll.poll_id,
            user_id: null,
          })),
        );
        expect(
          (
            await rpc<string>(
              e,
              "join_poll",
              { p_code: poll.invite_code },
              b.token,
            )
          ).data,
        ).toBe(poll.poll_id);
        const full = await rpc(
          e,
          "join_poll",
          { p_code: poll.invite_code },
          c.token,
        );
        expect(full.error?.message).toContain("poll_full");
      });

      it("마감 24시간 뒤에는 참여자가 아니면 만료만, 참여자는 결과를 본다", async () => {
        const poll = await createPoll(host, [place(61), place(62)]);
        await rpc(e, "join_poll", { p_code: poll.invite_code }, b.token);
        await rpc(e, "cancel_poll", { p_poll_id: poll.poll_id }, host.token);
        await adminPatch(e, "polls", `id=eq.${poll.poll_id}`, {
          closed_at: hoursAgo(25),
        });

        const anon = await rpc<Preview>(e, "poll_preview", {
          p_code: poll.invite_code,
        });
        expect(anon.data).toEqual({ status: "expired" });
        const joinLate = await rpc(
          e,
          "join_poll",
          { p_code: poll.invite_code },
          outsider.token,
        );
        expect(joinLate.error?.message).toContain("poll_expired");
        const member = await rpc<Preview>(
          e,
          "poll_preview",
          { p_code: poll.invite_code },
          b.token,
        );
        expect(member.data?.status).toBe("canceled");
        expect((await getPoll(b, poll.poll_id)).data?.poll.status).toBe(
          "canceled",
        );
      });
    });

    describe("POLL-07 후보 제안과 승인", () => {
      it("참여자 제안은 방장과 제안자만 보고, 승인하면 모두 본다", async () => {
        const poll = await createPoll(host, [place(71), place(72)]);
        await rpc(e, "join_poll", { p_code: poll.invite_code }, b.token);
        await rpc(e, "join_poll", { p_code: poll.invite_code }, c.token);
        const sug = await rpc<string>(
          e,
          "add_poll_candidate",
          { p_poll_id: poll.poll_id, p_place_id: place(73) },
          b.token,
        );
        expect(sug.error).toBeNull();
        const seen = async (u: TestUser) =>
          (
            await rest<unknown[]>(
              e,
              `poll_candidates?poll_id=eq.${poll.poll_id}&select=id`,
              { token: u.token },
            )
          ).data?.length;
        expect(await seen(c)).toBe(2);
        expect(await seen(b)).toBe(3);
        expect(await seen(host)).toBe(3);
        // 참여자는 승인할 수 없다
        expect(
          (
            await rpc(
              e,
              "review_poll_suggestion",
              { p_candidate_id: sug.data, p_approve: true },
              c.token,
            )
          ).error,
        ).not.toBeNull();
        await rpc(
          e,
          "review_poll_suggestion",
          { p_candidate_id: sug.data, p_approve: true },
          host.token,
        );
        expect(await seen(c)).toBe(3);
      });
    });

    describe("POLL-13 기피 경고는 플래그만", () => {
      it("누군가의 기피 규칙에 걸리면 true, 응답에 누구와 무엇은 없다", async () => {
        const poll = await createPoll(host, [place(81), place(82)]);
        await rpc(e, "join_poll", { p_code: poll.invite_code }, c.token);
        const rule = await rest(e, "avoid_rules", {
          method: "POST",
          token: c.token,
          body: { kind: "food", value: "회" },
        });
        expect(rule.error).toBeNull();
        const places = [
          {
            place_id: place(81),
            name: "테스트 스시",
            category_text: "음식점 > 일식 > 초밥,롤",
            category_label: "일식",
          },
          {
            place_id: place(82),
            name: "테스트 국밥",
            category_text: "음식점 > 한식 > 국밥",
            category_label: "국밥/탕",
          },
          {
            place_id: "999999999",
            name: "다른 곳",
            category_text: "음식점 > 일식",
            category_label: "일식",
          },
        ];
        type Flag = { place_id: string; flagged: boolean; too_few: boolean };
        const flags = async () => {
          const r = await rpc<Flag[]>(
            e,
            "poll_avoid_flags",
            { p_poll_id: poll.poll_id, p_places: places },
            host.token,
          );
          return {
            ...r,
            data: [...(r.data ?? [])].sort((x, y) =>
              x.place_id.localeCompare(y.place_id),
            ),
          };
        };

        // 참여자 2명(방장, c)이면 판정하지 않는다(G7 떠보기 방지)
        const few = await flags();
        expect(few.error).toBeNull();
        expect(few.data).toEqual([
          { place_id: place(81), flagged: false, too_few: true },
          { place_id: place(82), flagged: false, too_few: true },
        ]);

        await rpc(e, "join_poll", { p_code: poll.invite_code }, b.token);
        const r = await flags();
        expect(r.error).toBeNull();
        // 이 방 후보가 아닌 장소는 판정하지 않는다
        expect(r.data).toEqual([
          { place_id: place(81), flagged: true, too_few: false },
          { place_id: place(82), flagged: false, too_few: false },
        ]);
        expect(JSON.stringify(r.data)).not.toMatch(
          /회|user|kind|value|nickname/,
        );
        // 타인과 비로그인은 부를 수 없다
        expect(
          (
            await rpc(
              e,
              "poll_avoid_flags",
              { p_poll_id: poll.poll_id, p_places: places },
              outsider.token,
            )
          ).error?.code,
        ).toBe(PERMISSION_DENIED);
        expect(
          (
            await rpc(e, "poll_avoid_flags", {
              p_poll_id: poll.poll_id,
              p_places: places,
            })
          ).error,
        ).not.toBeNull();
      });
    });

    describe("POLL-13 기피 경고 호출 한도", () => {
      it("한 사람이 한 방에서 하루 10번까지, 11번째는 거절", async () => {
        const poll = await createPoll(host, [place(83), place(84)]);
        await rpc(e, "join_poll", { p_code: poll.invite_code }, b.token);
        await rpc(e, "join_poll", { p_code: poll.invite_code }, c.token);
        const places = [
          {
            place_id: place(83),
            name: "테스트",
            category_text: "음식점 > 한식",
            category_label: "한식",
          },
        ];
        const call = () =>
          rpc(
            e,
            "poll_avoid_flags",
            { p_poll_id: poll.poll_id, p_places: places },
            b.token,
          );
        for (let i = 0; i < 10; i++) expect((await call()).error).toBeNull();
        expect((await call()).error?.message).toContain(
          "poll_avoid_daily_limit_exceeded",
        );
        // 다른 사람의 한도는 따로 센다
        expect(
          (
            await rpc(
              e,
              "poll_avoid_flags",
              { p_poll_id: poll.poll_id, p_places: places },
              c.token,
            )
          ).error,
        ).toBeNull();
      });
    });

    describe("MOD-05 하루 10개와 만들기 취소", () => {
      it("보내기 전 취소는 방을 지우고 한도를 돌려준다. 보낸 뒤에는 만들기 취소가 안 된다", async () => {
        const limit = async () =>
          (
            await rpc<LimitRow[]>(e, "my_daily_limits", {}, outsider.token)
          ).data!.find((x) => x.bucket === "polls")!;
        const before = await limit();
        const poll = await createPoll(outsider, [place(91), place(92)]);
        expect((await limit()).used).toBe(before.used + 1);
        expect(
          (
            await rpc<boolean>(
              e,
              "cancel_unsent_poll",
              { p_poll_id: poll.poll_id },
              outsider.token,
            )
          ).data,
        ).toBe(true);
        expect((await limit()).used).toBe(before.used);
        expect(
          (await rpc<Preview>(e, "poll_preview", { p_code: poll.invite_code }))
            .data,
        ).toBeNull();

        const sent = await createPoll(outsider, [place(93), place(94)]);
        await rpc(
          e,
          "mark_poll_shared",
          { p_poll_id: sent.poll_id },
          outsider.token,
        );
        const no = await rpc(
          e,
          "cancel_unsent_poll",
          { p_poll_id: sent.poll_id },
          outsider.token,
        );
        expect(no.error?.message).toContain("poll_already_shared");
      });

      it("한도를 다 쓰면 거절한다", async () => {
        const left = (
          await rpc<LimitRow[]>(e, "my_daily_limits", {}, c.token)
        ).data!.find((x) => x.bucket === "polls")!;
        for (let i = 0; i < left.remaining; i++)
          await createPoll(c, [place(100 + i * 2), place(101 + i * 2)]);
        const over = await rpc(
          e,
          "create_poll",
          {
            p_kind: "lunch",
            p_title: "test_한도",
            p_closes_at: inMinutes(30),
            p_multi: false,
            p_place_ids: [place(198), place(199)],
            p_place_urls: [],
            p_anchor_lat: 37.5665,
            p_anchor_lng: 126.978,
            p_radius_m: 800,
          },
          c.token,
        );
        expect(over.error?.message).toContain("polls_daily_limit_exceeded");
      });
    });

    describe("T7.30 poll_closed 보고권은 방마다 한 번", () => {
      type Claim = {
        claimed: boolean;
        reason?: string;
        participant_count?: number;
      };
      const claim = (user: TestUser | null, id: string) =>
        rpc<Claim>(
          e,
          "claim_poll_closed_report",
          { p_poll_id: id },
          user?.token,
        );

      it("진행 중이면 false, 마감 뒤 두 참여자 중 처음 한 명만 true, 비참여자는 false, 비로그인은 거부", async (ctx) => {
        // 20261101170000 적용 전에는 함수가 없다(PGRST202). 그때는 건너뛴다
        const probe = await claim(host, "00000000-0000-0000-0000-000000000000");
        if (probe.error) ctx.skip();

        // 공용 방장의 하루 생성 한도(10)와 겹치지 않게 따로 방장을 둔다
        const owner = await createTestUser(e, runId, "pr");
        created.push(owner.id);
        const p = await createPoll(owner, [place(301), place(302)]);
        await rpc(e, "join_poll", { p_code: p.invite_code }, b.token);
        const s = (await getPoll(owner, p.poll_id)).data!;
        await rpc(
          e,
          "cast_vote",
          { p_poll_id: p.poll_id, p_candidate_ids: [s.candidates[0]!.id] },
          b.token,
        );

        const early = await claim(b, p.poll_id);
        expect(early.error).toBeNull();
        expect(early.data?.claimed).toBe(false);

        await rpc(e, "close_poll_now", { p_poll_id: p.poll_id }, owner.token);

        const outside = await claim(outsider, p.poll_id);
        expect(outside.data?.claimed).toBe(false);

        const first = await claim(b, p.poll_id);
        expect(first.error).toBeNull();
        expect(first.data).toEqual({
          claimed: true,
          reason: "host",
          participant_count: 2,
        });
        const second = await claim(owner, p.poll_id);
        expect(second.data?.claimed).toBe(false);
        const again = await claim(b, p.poll_id);
        expect(again.data?.claimed).toBe(false);

        const anon = await claim(null, p.poll_id);
        expect(anon.error).not.toBeNull();
      });

      it("방장이 취소한 방은 reason cancel로 한 번", async (ctx) => {
        const probe = await claim(host, "00000000-0000-0000-0000-000000000000");
        if (probe.error) ctx.skip();
        const owner = await createTestUser(e, runId, "ps");
        created.push(owner.id);
        const p = await createPoll(owner, [place(303), place(304)]);
        await rpc(e, "cancel_poll", { p_poll_id: p.poll_id }, owner.token);
        const r = await claim(owner, p.poll_id);
        expect(r.data).toEqual({
          claimed: true,
          reason: "cancel",
          participant_count: 1,
        });
      });
    });

    describe("T7.29, T7.22 탈퇴", () => {
      it("진행 중 방의 표는 지워지고, 끝난 방은 익명으로 남고, 방장 탈퇴는 진행 중 방을 취소한다", async () => {
        const leaver = await createTestUser(e, runId, "pl");
        const leavingHost = await createTestUser(e, runId, "pk");
        // 앞 테스트들이 공용 방장의 하루 생성 한도(10)를 다 쓰므로 이 테스트는 따로 방장을 둔다
        const owner = await createTestUser(e, runId, "po");
        created.push(leaver.id, leavingHost.id, owner.id);

        const open = await createPoll(owner, [place(201), place(202)]);
        const done = await createPoll(owner, [place(203), place(204)]);
        for (const p of [open, done])
          await rpc(e, "join_poll", { p_code: p.invite_code }, leaver.token);
        const so = (await getPoll(owner, open.poll_id)).data!;
        const sd = (await getPoll(owner, done.poll_id)).data!;
        await rpc(
          e,
          "cast_vote",
          { p_poll_id: open.poll_id, p_candidate_ids: [so.candidates[0]!.id] },
          leaver.token,
        );
        await rpc(
          e,
          "cast_vote",
          { p_poll_id: done.poll_id, p_candidate_ids: [sd.candidates[0]!.id] },
          leaver.token,
        );
        await rpc(
          e,
          "close_poll_now",
          { p_poll_id: done.poll_id },
          owner.token,
        );

        const hosted = await createPoll(leavingHost, [place(205), place(206)]);
        await rpc(e, "join_poll", { p_code: hosted.invite_code }, b.token);

        await deleteAuthUser(e, leaver.id);
        await deleteAuthUser(e, leavingHost.id);

        const o = (await getPoll(owner, open.poll_id)).data!;
        expect(o.members).toHaveLength(1);
        expect(o.voter_count).toBe(0);
        const d = (await getPoll(owner, done.poll_id)).data!;
        expect(d.members.filter((m) => m.user_id === null)).toHaveLength(1);
        expect(d.poll.winner_place_id).toBe(place(203));
        const h = (await getPoll(b, hosted.poll_id)).data!;
        expect(h.poll.status).toBe("canceled");
        expect(h.poll.closed_reason).toBe("host_left");

        // 탈퇴자 id로 남은 행이 없다(set null 열 포함, T6.27 점검 함수)
        for (const id of [leaver.id, leavingHost.id]) {
          const residue = await adminRpc<
            { table_name: string; remaining: number }[]
          >(e, "account_residue", {
            p_user_id: id,
          });
          expect(residue.data?.filter((r) => Number(r.remaining) > 0)).toEqual(
            [],
          );
        }
      });
    });

    describe("D-43 투표 기록 삭제 (끝난 방을 내 목록에서만)", () => {
      it("끝난 방은 내 목록에서 빠지고 남의 결과는 남는다. 진행 중 방, 남의 방, 비로그인은 막는다", async () => {
        const owner = await createTestUser(e, runId, "pv");
        const member = await createTestUser(e, runId, "pw");
        created.push(owner.id, member.id);
        const myPolls = async (u: TestUser) =>
          (
            await rpc<{ poll_id: string }[]>(e, "my_polls", {}, u.token)
          ).data!.map((p) => p.poll_id);

        const open = await createPoll(owner, [place(301), place(302)]);
        const done = await createPoll(owner, [place(303), place(304)]);
        for (const p of [open, done])
          await rpc(e, "join_poll", { p_code: p.invite_code }, member.token);
        const sd = (await getPoll(owner, done.poll_id)).data!;
        await rpc(
          e,
          "cast_vote",
          { p_poll_id: done.poll_id, p_candidate_ids: [sd.candidates[0]!.id] },
          member.token,
        );
        await rpc(
          e,
          "close_poll_now",
          { p_poll_id: done.poll_id },
          owner.token,
        );

        // 진행 중 방은 지울 수 없다
        const r1 = await rpc(
          e,
          "leave_ended_poll",
          { p_poll_id: open.poll_id },
          member.token,
        );
        expect(r1.error?.message).toBe("poll_state_open");
        // 참여하지 않은 방, 비로그인
        const r2 = await rpc(
          e,
          "leave_ended_poll",
          { p_poll_id: done.poll_id },
          outsider.token,
        );
        expect(r2.error?.message).toBe("poll_not_found");
        const r3 = await rpc(e, "leave_ended_poll", {
          p_poll_id: done.poll_id,
        });
        expect(r3.error).not.toBeNull();

        // 참여자가 지운다: 내 목록에서 빠지고 방은 더 읽지 못한다. 방장 쪽 결과와 표는 그대로
        const r4 = await rpc(
          e,
          "leave_ended_poll",
          { p_poll_id: done.poll_id },
          member.token,
        );
        expect(r4.error).toBeNull();
        expect(await myPolls(member)).not.toContain(done.poll_id);
        expect(await myPolls(member)).toContain(open.poll_id);
        const gone = await rest<{ id: string }[]>(
          e,
          `polls?id=eq.${done.poll_id}&select=id`,
          { token: member.token },
        );
        expect(gone.data ?? []).toHaveLength(0);
        const d = (await getPoll(owner, done.poll_id)).data!;
        expect(d.members).toHaveLength(2);
        expect(d.members.filter((m) => m.user_id === null)).toHaveLength(1);
        expect(d.poll.winner_place_id).toBe(place(303));
        // 끝난 방에는 다시 참여할 수 없다
        const again = await rpc(
          e,
          "join_poll",
          { p_code: done.invite_code },
          member.token,
        );
        expect(again.error).not.toBeNull();

        // 방장이 지워도 방은 남는다(방장 표시만 익명)
        const r5 = await rpc(
          e,
          "leave_ended_poll",
          { p_poll_id: done.poll_id },
          owner.token,
        );
        expect(r5.error).toBeNull();
        expect(await myPolls(owner)).not.toContain(done.poll_id);
        expect(await myPolls(owner)).toContain(open.poll_id);
      });
    });
  },
);
