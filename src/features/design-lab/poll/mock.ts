// 투표방 시안 목업 (T7.1). 저장은 하지 않고 화면 상태만 바꾼다.
// 후보의 이름, 카테고리, 도보 분은 카카오 세션 값이라 DB에 두지 않는다(T0.16-1). poll_candidates에는 place_id, place_url, 추가한 사람, 순서만.
// 닉네임과 식당 이름은 모두 지어낸 값이다.
import type { PlaceBadge } from "@/components/badges/pick-badges";
import { getMockPlace, type MockPlace } from "@/features/design-lab/mock";
import type { PollParams } from "./params";

export type PollPerson = { id: string; nick: string };

export type PollCandidate = {
  place: MockPlace;
  /** 후보 카드 배지. 할인은 제보 출처만(DEAL-05, 제휴 미표시), 기피 경고는 보안 함수 플래그(POLL-13) */
  badges: readonly PlaceBadge[];
};

export const POLL_TITLE = "목요일 점심";
export const POLL_DEADLINE_LABEL = "12:30";
/** 투표방 전체 길이(분). C안 시간 줄의 비율 계산용 */
export const POLL_LENGTH_MIN = 30;
/** 시안을 연 순간부터 마감까지 남은 시간 (목업) */
export const POLL_REMAINING_MS = 12 * 60_000 + 40_000;
/** 한 투표방 최대 인원 (POLL-11) */
export const POLL_MAX_MEMBERS = 30;
/** 후보 최대 수 (POLL-01, POLL-07) */
export const POLL_MAX_CANDIDATES = 5;

export const ME: PollPerson = { id: "me", nick: "소금빵" };
export const HOST: PollPerson = { id: "p1", nick: "점심탐험가" };

const OTHERS: readonly PollPerson[] = [
  HOST,
  { id: "p2", nick: "국밥러버" },
  { id: "p3", nick: "오후세시" },
  { id: "p4", nick: "민트초코" },
  { id: "p5", nick: "라떼한잔" },
  { id: "p6", nick: "김치볶음" },
];

/** sim=on에서 잠시 뒤 들어오는 사람 */
export const LATECOMER: PollPerson = { id: "p7", nick: "새싹" };

export const CANDIDATES: readonly PollCandidate[] = [
  {
    place: getMockPlace("mock-gukbap"),
    badges: [{ kind: "deal" }, { kind: "report" }],
  },
  { place: getMockPlace("mock-ilsik"), badges: [] },
  { place: getMockPlace("mock-asian"), badges: [{ kind: "avoidWarning" }] },
  { place: getMockPlace("mock-hansik"), badges: [] },
];

/** 후보 제안 (POLL-07) */
export const SUGGESTION = {
  by: { id: "p4", nick: "민트초코" } satisfies PollPerson,
  place: getMockPlace("mock-bunsik"),
};

/** 다른 사람들의 표: 사람 id → 후보 순번 */
export type Ballots = Readonly<Record<string, readonly number[]>>;

const BASE_BALLOTS: Ballots = {
  p1: [0],
  p2: [0],
  p3: [0],
  p4: [1],
  p5: [1],
  p6: [2],
};

export type PollScenario = {
  people: readonly PollPerson[];
  others: Ballots;
  /** 시작할 때 이미 보낸 내 표 */
  mine: readonly number[] | null;
};

/** 쿼리에 맞는 시작 데이터 */
export function scenarioFor(p: PollParams): PollScenario {
  if (p.state === "empty") {
    return { people: [HOST, OTHERS[3]!, ME], others: {}, mine: null };
  }
  const people = [...OTHERS, ME];
  switch (p.flow) {
    case "voted":
      return { people, others: BASE_BALLOTS, mine: [0] };
    case "tie":
      return { people, others: BASE_BALLOTS, mine: [1] };
    case "closing":
    case "result":
      return { people, others: BASE_BALLOTS, mine: [0] };
    default:
      return {
        people: p.role === "guest" ? OTHERS : people,
        others: BASE_BALLOTS,
        mine: null,
      };
  }
}

/** 후보별 득표 */
export function tally(
  count: number,
  others: Ballots,
  mine: readonly number[] | null,
): number[] {
  const out = Array.from({ length: count }, () => 0);
  for (const picks of Object.values(others)) {
    for (const i of picks) out[i] = (out[i] ?? 0) + 1;
  }
  for (const i of mine ?? []) out[i] = (out[i] ?? 0) + 1;
  return out;
}

/** 최다 득표 후보들 (0표뿐이면 빈 배열) */
export function leaders(votes: readonly number[]): number[] {
  const max = Math.max(0, ...votes);
  if (max === 0) return [];
  return votes.flatMap((v, i) => (v === max ? [i] : []));
}

/** 후보별로 고른 사람 (C안 얼굴 줄) */
export function votersOf(
  index: number,
  people: readonly PollPerson[],
  others: Ballots,
  mine: readonly number[] | null,
): PollPerson[] {
  return people.filter((person) =>
    person.id === ME.id
      ? (mine ?? []).includes(index)
      : (others[person.id] ?? []).includes(index),
  );
}

/** 이니셜 한 글자 (아바타 대체) */
export function initialOf(nick: string): string {
  return Array.from(nick)[0] ?? "";
}

/** 카카오맵 링크 자리 (place_url은 저장해도 되는 값, 목업은 가짜 주소) */
export function kakaoMapUrl(place: MockPlace): string {
  return `https://place.map.kakao.com/${place.id}`;
}

/** 룰렛 하이라이트 간격: 60ms에서 260ms로 늘어나며 2초 안에 멈춘다 (그냥 골라줘 R1과 같은 리듬) */
export function rouletteSteps(totalMs = 2000): number[] {
  const steps: number[] = [];
  let t = 0;
  let gap = 60;
  while (t + gap <= totalMs) {
    steps.push(gap);
    t += gap;
    gap = Math.min(260, Math.round(gap * 1.18));
  }
  return steps;
}

/** 부사격 조사: "정담국밥으로", "골목분식 두리로" (ㄹ 받침은 "로") */
export function withRo(word: string): string {
  const code = word.trim().slice(-1).charCodeAt(0) - 0xac00;
  const batchim = code >= 0 && code < 11172 ? code % 28 : 0;
  return `${word}${batchim === 0 || batchim === 8 ? "로" : "으로"}`;
}
