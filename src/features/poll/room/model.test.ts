import { describe, expect, it, vi } from "vitest";
import {
  applySnapshot,
  approvedCandidates,
  leaders,
  rankByVotes,
  readSnapshot,
  resolvedWay,
  roomPhase,
  sameVotes,
  withMyVotes,
  type PollRoom,
  type RoomCandidate,
} from "./model";

vi.mock("server-only", () => ({}));
const { parsePreview, parseRoom, memberUserIds } = await import("./parse");

const c = (
  id: string,
  votes: number | null,
  position: number,
  status: RoomCandidate["status"] = "approved",
): RoomCandidate => ({
  id,
  placeId: String(1000 + position),
  placeUrl: null,
  position,
  status,
  suggestedByMe: false,
  votes,
});

function room(over: Partial<PollRoom["poll"]> = {}): PollRoom {
  return {
    poll: {
      id: "p1",
      code: "abcdefghjkmn",
      kind: "lunch",
      title: "목요일 점심",
      multi: false,
      status: "open",
      closesAt: "2026-11-05T03:30:00Z",
      closedAt: null,
      closedReason: null,
      tieUntil: null,
      tieResolvedBy: null,
      winnerPlaceId: null,
      winnerPlaceUrl: null,
      anchor: { lat: 37.5, lng: 127 },
      radiusM: 800,
      shared: true,
      isHost: false,
      ...over,
    },
    candidates: [
      c("a", 2, 1),
      c("b", 1, 2),
      c("c", 0, 3),
      c("s", null, 4, "suggested"),
    ],
    members: [
      { id: "m1", nickname: "방장", isHost: true, isMe: false, hasVoted: true },
      { id: "m2", nickname: "나", isHost: false, isMe: true, hasVoted: false },
      { id: "m3", nickname: null, isHost: false, isMe: false, hasVoted: true },
    ],
    myVotes: [],
    voterCount: 2,
  };
}

describe("roomPhase", () => {
  const now = Date.parse("2026-11-05T03:00:00Z");
  it("마감 전은 vote, 마감 시각이 지나면 서버 판정 전까지 closing", () => {
    expect(roomPhase(room(), now)).toBe("vote");
    expect(roomPhase(room(), Date.parse("2026-11-05T03:30:00Z"))).toBe(
      "closing",
    );
  });
  it("tie, canceled, 결과 유무", () => {
    expect(roomPhase(room({ status: "tie" }), now)).toBe("tie");
    expect(roomPhase(room({ status: "canceled" }), now)).toBe("canceled");
    expect(
      roomPhase(room({ status: "closed", winnerPlaceId: "1001" }), now),
    ).toBe("result");
    expect(roomPhase(room({ status: "closed" }), now)).toBe("noResult");
  });
});

describe("후보와 1위", () => {
  it("제안은 투표 후보에서 빠지고 순서대로", () => {
    expect(approvedCandidates(room()).map((x) => x.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
  it("1위는 표가 있을 때만, 같으면 둘 다", () => {
    expect(leaders([c("a", 0, 1), c("b", 0, 2)])).toEqual([]);
    expect(leaders([c("a", 2, 1), c("b", 2, 2), c("c", 1, 3)])).toEqual([
      "a",
      "b",
    ]);
  });
  it("득표순, 같으면 원래 순서", () => {
    expect(
      rankByVotes([c("a", 1, 1), c("b", 3, 2), c("c", 1, 3)]).map((x) => x.id),
    ).toEqual(["b", "a", "c"]);
  });
});

describe("resolvedWay", () => {
  it("동점 처리 방식이 마감 사유보다 앞선다", () => {
    expect(
      resolvedWay(
        room({ tieResolvedBy: "auto", closedReason: "deadline" }).poll,
      ),
    ).toBe("auto");
    expect(resolvedWay(room({ tieResolvedBy: "roulette" }).poll)).toBe(
      "roulette",
    );
    expect(
      resolvedWay(room({ tieResolvedBy: "host", closedReason: "host" }).poll),
    ).toBe("hostTie");
    expect(resolvedWay(room({ closedReason: "host" }).poll)).toBe("host");
    expect(resolvedWay(room({ closedReason: "deadline" }).poll)).toBe("time");
  });
});

describe("withMyVotes (낙관적 반영)", () => {
  it("처음 투표하면 득표와 투표한 사람이 늘고 내 체크가 켜진다", () => {
    const r = withMyVotes(room(), ["b"]);
    expect(r.candidates.find((x) => x.id === "b")?.votes).toBe(2);
    expect(r.voterCount).toBe(3);
    expect(r.members.find((m) => m.isMe)?.hasVoted).toBe(true);
    expect(r.myVotes).toEqual(["b"]);
  });
  it("바꾸면 옮겨 가고, 취소하면 빠진다", () => {
    const voted = { ...withMyVotes(room(), ["b"]) };
    const moved = withMyVotes(voted, ["c"]);
    expect(moved.candidates.map((x) => x.votes)).toEqual([2, 1, 1, null]);
    expect(moved.voterCount).toBe(3);
    const canceled = withMyVotes(moved, []);
    expect(canceled.candidates.map((x) => x.votes)).toEqual([2, 1, 0, null]);
    expect(canceled.voterCount).toBe(2);
    expect(canceled.members.find((m) => m.isMe)?.hasVoted).toBe(false);
  });
  it("sameVotes는 순서와 무관", () => {
    expect(sameVotes(["a", "b"], ["b", "a"])).toBe(true);
    expect(sameVotes(["a"], ["a", "b"])).toBe(false);
  });
});

describe("Realtime 집계", () => {
  const payload = {
    poll_id: "p1",
    status: "open",
    closes_at: "2026-11-05T03:30:00Z",
    member_count: 3,
    voter_count: 2,
    counts: { a: 3, b: 1, c: 0 },
  };
  it("모양이 다르면 null", () => {
    expect(readSnapshot(null)).toBeNull();
    expect(readSnapshot({ ...payload, status: "weird" })).toBeNull();
    expect(readSnapshot({ ...payload, counts: null })).toBeNull();
  });
  it("득표만 바뀌면 바로 반영하고 다시 읽지 않는다", () => {
    const snap = readSnapshot(payload)!;
    const { room: next, needsRefetch } = applySnapshot(room(), snap);
    expect(next.candidates.map((x) => x.votes)).toEqual([3, 1, 0, null]);
    expect(needsRefetch).toBe(false);
  });
  it("상태, 인원, 투표한 사람 수, 후보 목록이 바뀌면 다시 읽는다", () => {
    expect(
      applySnapshot(room(), readSnapshot({ ...payload, status: "closed" })!)
        .needsRefetch,
    ).toBe(true);
    expect(
      applySnapshot(room(), readSnapshot({ ...payload, member_count: 4 })!)
        .needsRefetch,
    ).toBe(true);
    expect(
      applySnapshot(room(), readSnapshot({ ...payload, voter_count: 3 })!)
        .needsRefetch,
    ).toBe(true);
    expect(
      applySnapshot(
        room(),
        readSnapshot({ ...payload, counts: { ...payload.counts, d: 0 } })!,
      ).needsRefetch,
    ).toBe(true);
  });
});

describe("파서 (서버)", () => {
  it("만료와 없는 코드", () => {
    expect(parsePreview(null)).toBeNull();
    expect(parsePreview({ status: "expired" })).toEqual({ status: "expired" });
    expect(parsePreview({ status: "open" })).toBeNull();
  });
  it("미리보기는 득표 없이 후보와 인원만", () => {
    const p = parsePreview({
      status: "open",
      kind: "party",
      title: "금요일 회식",
      multi: true,
      closes_at: "2026-11-07T09:00:00Z",
      closed_at: null,
      anchor_lat: 37.567125,
      anchor_lng: 126.97725,
      radius_m: 950,
      member_count: 4,
      member_limit: 30,
      is_member: false,
      poll_id: null,
      candidates: [{ position: 1, place_id: "123", place_url: null }],
    });
    expect(p).toMatchObject({
      status: "open",
      kind: "party",
      memberCount: 4,
      pollId: null,
    });
    expect(p && "candidates" in p ? p.candidates : []).toEqual([
      { position: 1, placeId: "123", placeUrl: null },
    ]);
  });
  it("방은 user_id를 닉네임으로 바꾸고 내보내지 않는다", () => {
    const raw = {
      poll: {
        id: "p1",
        invite_code: "abcdefghjkmn",
        kind: "lunch",
        title: "목요일 점심",
        multi: false,
        status: "open",
        closes_at: "2026-11-05T03:30:00Z",
        closed_at: null,
        closed_reason: null,
        tie_until: null,
        tie_resolved_by: null,
        winner_place_id: null,
        winner_place_url: null,
        anchor_lat: 37.5,
        anchor_lng: 127,
        radius_m: 800,
        shared: false,
        is_host: true,
        expires_at: null,
      },
      candidates: [
        {
          id: "a",
          place_id: "1",
          place_url: "https://place.map.kakao.com/1",
          position: 1,
          status: "approved",
          suggested_by_me: false,
          votes: 2,
        },
      ],
      members: [
        {
          id: "m1",
          user_id: "u1",
          is_host: true,
          is_me: true,
          has_voted: true,
        },
        {
          id: "m2",
          user_id: null,
          is_host: false,
          is_me: false,
          has_voted: false,
        },
      ],
      my_votes: ["a"],
      voter_count: 1,
    };
    expect(memberUserIds(raw)).toEqual(["u1"]);
    const r = parseRoom(raw, new Map([["u1", "점심탐험가"]]))!;
    expect(r.members).toEqual([
      {
        id: "m1",
        nickname: "점심탐험가",
        isHost: true,
        isMe: true,
        hasVoted: true,
      },
      { id: "m2", nickname: null, isHost: false, isMe: false, hasVoted: false },
    ]);
    expect(JSON.stringify(r)).not.toContain("u1");
    expect(r.poll.code).toBe("abcdefghjkmn");
  });
});
