// 투표방 데이터 모양과 순수 판정 (T7.15~T7.19, POLL-05~09, D-14). React, 네트워크 의존 없음.
// - get_poll, poll_preview(jsonb)는 서버 액션이 parse.ts(zod)로 읽어 아래 타입으로 바꾼다. 브라우저 번들에 zod를 넣지 않는다.
// - Realtime 집계 메시지(poll_state)는 브라우저가 받으므로 zod 없이 가볍게 읽는다(applySnapshot).
// - 무기명: 다른 참여자는 닉네임과 "투표했음"만. 어디에 찍었는지는 myVotes(내 것)뿐이다.
// - 카카오 값은 placeId, placeUrl만. 이름, 그림, 도보, 가격은 화면이 T5.12a로 붙이는 세션 값이다.

export const POLL_MEMBER_LIMIT = 30;
export const POLL_MAX_CANDIDATES = 5;
/** 동점 대기(방장이 정하는 시간). 서버 tie_until과 같다(D-14 안건 8) */
export const TIE_WAIT_MINUTES = 30;

export type PollKind = "lunch" | "dinner" | "party";
export type PollStatus = "open" | "tie" | "closed" | "canceled";
export type ClosedReason = "deadline" | "host" | "cancel" | "host_left";
export type TieResolvedBy = "host" | "roulette" | "auto";

export type RoomCandidate = {
  readonly id: string;
  readonly placeId: string;
  readonly placeUrl: string | null;
  readonly position: number;
  readonly status: "approved" | "suggested";
  readonly suggestedByMe: boolean;
  /** 승인된 후보만. 제안은 null */
  readonly votes: number | null;
};

export type RoomMember = {
  readonly id: string;
  /** 공개 프로필 닉네임. 탈퇴한 익명 참여자는 null */
  readonly nickname: string | null;
  readonly isHost: boolean;
  readonly isMe: boolean;
  readonly hasVoted: boolean;
};

export type RoomPoll = {
  readonly id: string;
  readonly code: string;
  readonly kind: PollKind;
  readonly title: string;
  readonly multi: boolean;
  readonly status: PollStatus;
  readonly closesAt: string;
  readonly closedAt: string | null;
  readonly closedReason: ClosedReason | null;
  readonly tieUntil: string | null;
  readonly tieResolvedBy: TieResolvedBy | null;
  readonly winnerPlaceId: string | null;
  readonly winnerPlaceUrl: string | null;
  readonly anchor: { readonly lat: number; readonly lng: number };
  readonly radiusM: number;
  readonly shared: boolean;
  readonly isHost: boolean;
};

export type PollRoom = {
  readonly poll: RoomPoll;
  readonly candidates: readonly RoomCandidate[];
  readonly members: readonly RoomMember[];
  /** 내 표(후보 id) */
  readonly myVotes: readonly string[];
  readonly voterCount: number;
};

export type PreviewCandidate = {
  readonly position: number;
  readonly placeId: string;
  readonly placeUrl: string | null;
};

export type PollPreview =
  | { readonly status: "expired" }
  | {
      readonly status: PollStatus;
      readonly kind: PollKind;
      readonly title: string;
      readonly multi: boolean;
      readonly closesAt: string;
      readonly closedAt: string | null;
      /** 참여자가 아니면 약 150m 격자로 내린 값(G7) */
      readonly anchor: { readonly lat: number; readonly lng: number };
      readonly radiusM: number;
      readonly memberCount: number;
      readonly memberLimit: number;
      readonly isMember: boolean;
      readonly pollId: string | null;
      readonly candidates: readonly PreviewCandidate[];
    };

/* ---------- Realtime 집계 (브라우저) ---------- */

/** realtime.send('poll_state')의 payload 중 화면이 쓰는 값 */
export type PollSnapshot = {
  readonly status: PollStatus;
  readonly memberCount: number;
  readonly voterCount: number;
  readonly counts: Readonly<Record<string, number>>;
  readonly winnerPlaceId: string | null;
  readonly closesAt: string;
};

function isStatus(v: unknown): v is PollStatus {
  return v === "open" || v === "tie" || v === "closed" || v === "canceled";
}

/** 메시지를 가볍게 읽는다. 모양이 다르면 null(화면은 전체를 다시 불러온다) */
export function readSnapshot(payload: unknown): PollSnapshot | null {
  if (typeof payload !== "object" || payload === null) return null;
  const p = payload as Record<string, unknown>;
  if (!isStatus(p.status)) return null;
  if (typeof p.member_count !== "number" || typeof p.voter_count !== "number")
    return null;
  if (typeof p.counts !== "object" || p.counts === null) return null;
  const counts: Record<string, number> = {};
  for (const [k, v] of Object.entries(p.counts as Record<string, unknown>)) {
    if (typeof v === "number") counts[k] = v;
  }
  return {
    status: p.status,
    memberCount: p.member_count,
    voterCount: p.voter_count,
    counts,
    winnerPlaceId:
      typeof p.winner_place_id === "string" ? p.winner_place_id : null,
    closesAt: typeof p.closes_at === "string" ? p.closes_at : "",
  };
}

/**
 * 집계 메시지를 지금 화면 값에 바로 반영한다(AC-POLL-1, 2초 안).
 * 상태, 참여자 수, 마감 시각이 바뀌었으면 needsRefetch(참여 줄, 결과, 후보 목록은 get_poll로 다시 읽는다).
 */
export function applySnapshot(
  room: PollRoom,
  snap: PollSnapshot,
): { room: PollRoom; needsRefetch: boolean } {
  const needsRefetch =
    snap.status !== room.poll.status ||
    snap.memberCount !== room.members.length ||
    (snap.closesAt !== "" &&
      Date.parse(snap.closesAt) !== Date.parse(room.poll.closesAt)) ||
    room.candidates.some(
      (c) => c.status === "approved" && snap.counts[c.id] === undefined,
    ) ||
    Object.keys(snap.counts).some(
      (id) => !room.candidates.some((c) => c.id === id),
    );
  const candidates = room.candidates.map((c) =>
    c.status === "approved" && snap.counts[c.id] !== undefined
      ? { ...c, votes: snap.counts[c.id]! }
      : c,
  );
  return {
    room: { ...room, candidates, voterCount: snap.voterCount },
    // 투표한 사람 수가 바뀌면 참여 줄의 체크도 바뀌므로 다시 읽는다(닉네임은 서버만 안다)
    needsRefetch: needsRefetch || snap.voterCount !== room.voterCount,
  };
}

/* ---------- 화면 판정 ---------- */

export type RoomPhase =
  /** 투표 중 */
  | "vote"
  /** 마감 시각이 지났는데 아직 서버 판정을 못 받음 */
  | "closing"
  /** 동점 대기 */
  | "tie"
  /** 확정 */
  | "result"
  /** 표 없이 마감 */
  | "noResult"
  | "canceled";

export function roomPhase(room: PollRoom, nowMs: number): RoomPhase {
  const { status, closesAt, winnerPlaceId } = room.poll;
  if (status === "canceled") return "canceled";
  if (status === "tie") return "tie";
  if (status === "closed") return winnerPlaceId ? "result" : "noResult";
  return Date.parse(closesAt) <= nowMs ? "closing" : "vote";
}

export function approvedCandidates(room: PollRoom): RoomCandidate[] {
  return room.candidates
    .filter((c) => c.status === "approved")
    .sort((a, b) => a.position - b.position);
}

/** 1위 후보 id들(표가 1표 이상일 때만). 둘 이상이면 동점 */
export function leaders(candidates: readonly RoomCandidate[]): string[] {
  const max = Math.max(0, ...candidates.map((c) => c.votes ?? 0));
  if (max === 0) return [];
  return candidates.filter((c) => (c.votes ?? 0) === max).map((c) => c.id);
}

/** 득표순(같으면 원래 순서) */
export function rankByVotes(
  candidates: readonly RoomCandidate[],
): RoomCandidate[] {
  return [...candidates].sort(
    (a, b) => (b.votes ?? 0) - (a.votes ?? 0) || a.position - b.position,
  );
}

export type ResolvedWay = "time" | "host" | "hostTie" | "roulette" | "auto";

/** 결과 화면 caption: 어떻게 정해졌는지 */
export function resolvedWay(poll: RoomPoll): ResolvedWay {
  if (poll.tieResolvedBy === "auto") return "auto";
  if (poll.tieResolvedBy === "roulette") return "roulette";
  if (poll.tieResolvedBy === "host") return "hostTie";
  return poll.closedReason === "host" ? "host" : "time";
}

/** 내 표를 바꾸려는 후보 목록이 지금 표와 같은가 */
export function sameVotes(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}

/** 낙관적 반영: 내 표를 next로 바꾼 뒤의 득표와 투표한 사람 수 */
export function withMyVotes(room: PollRoom, next: readonly string[]): PollRoom {
  const prev = new Set(room.myVotes);
  const nextSet = new Set(next);
  const candidates = room.candidates.map((c) => {
    if (c.status !== "approved") return c;
    const delta = (nextSet.has(c.id) ? 1 : 0) - (prev.has(c.id) ? 1 : 0);
    return delta === 0
      ? c
      : { ...c, votes: Math.max(0, (c.votes ?? 0) + delta) };
  });
  const wasVoter = prev.size > 0;
  const isVoter = nextSet.size > 0;
  const voterCount = Math.max(
    0,
    room.voterCount + (isVoter ? 1 : 0) - (wasVoter ? 1 : 0),
  );
  const members = room.members.map((m) =>
    m.isMe ? { ...m, hasVoted: isVoter } : m,
  );
  return { ...room, candidates, members, myVotes: [...next], voterCount };
}

/** 데스크톱 2단, 미리보기에 쓰는 마감 표기 "12:30" (KST) */
export function kstClock(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** 마감이 오늘(KST)이 아니면 날짜도 "11월 3일" */
export function kstDateIfNotToday(iso: string, nowMs: number): string | null {
  const day = (ms: number) =>
    new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).format(new Date(ms));
  const target = Date.parse(iso);
  if (day(target) === day(nowMs)) return null;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
  }).format(new Date(target));
}
