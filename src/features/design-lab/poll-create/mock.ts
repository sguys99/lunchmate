// 투표 만들기 시안 목업 (T7.2). 저장은 하지 않고 화면 상태만 바꾼다.
// 후보 이름, 카테고리, 도보 분은 카카오 세션 값이라 저장하지 않는다(CLAUDE.md 7장). 만들 때 서버로 가는 것은
// place_id, place_url, 순서와 투표방 설정(제목, 끼니, 마감, 방식, 기준점 좌표와 반경)뿐이다(T7.6).
import {
  MOCK_HOME_TODAY,
  getMockPlace,
  type MockPlace,
} from "@/features/design-lab/mock";
import type { PollCreateParams, PollEntry } from "./params";

/** 후보 수 (POLL-01) */
export const CANDIDATE_MIN = 2;
export const CANDIDATE_MAX = 5;

/** 하루 만들 수 있는 투표방 수 (MOD-05, T7.11) */
export const DAILY_POLL_LIMIT = 10;

/** 마감은 지금부터 이만큼 뒤부터 고를 수 있다 */
export const DEADLINE_MIN_LEAD = 10;

/** 목업 요일(홈 시안 머리 "10월 28일 수요일"과 맞춤). 실제는 src/lib/time의 KST 요일 */
export const MOCK_WEEKDAY = "수요일";

/** 목업 초대 링크 (추측 불가 10자 코드, T7.7). 도메인은 실제로 NEXT_PUBLIC_SITE_URL에서 만든다 */
export const MOCK_INVITE_URL = "lunchmate.app/poll/k7Qm2xVa9R";

export const FAVORITES: readonly MockPlace[] = [
  getMockPlace("mock-hansik"),
  getMockPlace("mock-salad"),
  getMockPlace("mock-jungsik"),
];

export const RECENT: readonly MockPlace[] = [
  getMockPlace("mock-yangsik"),
  getMockPlace("mock-bunsik"),
  getMockPlace("mock-fastfood"),
];

/** 회식 모드 후보 5곳 (PARTY-05) */
export const PARTY_FIVE: readonly MockPlace[] = [
  getMockPlace("mock-gogi"),
  getMockPlace("mock-jungsik"),
  getMockPlace("mock-ilsik"),
  getMockPlace("mock-yangsik"),
  getMockPlace("mock-gukbap"),
];

/** 상세에서 연 식당 */
export const DETAIL_PLACE: MockPlace = getMockPlace("mock-gukbap");

export const TODAY: readonly MockPlace[] = MOCK_HOME_TODAY;

export type PollKind = "lunch" | "party";

export type PollDraft = {
  kind: PollKind;
  title: string;
  candidates: MockPlace[];
  deadline: DeadlineId;
  /** deadline이 custom일 때 "HH:MM" */
  customAt: string;
  multi: boolean;
};

/** 어디서 열었는지에 따른 첫 값 */
export function initialDraft(p: PollCreateParams): PollDraft {
  const kind: PollKind = p.entry === "party" ? "party" : "lunch";
  return {
    kind,
    title: defaultTitle(kind),
    candidates: p.state === "empty" ? [] : [...initialCandidates(p.entry)],
    deadline: kind === "party" ? "today18" : "in30",
    customAt: "",
    multi: false,
  };
}

export function initialCandidates(entry: PollEntry): readonly MockPlace[] {
  if (entry === "party") return PARTY_FIVE;
  if (entry === "detail") return [DETAIL_PLACE];
  return TODAY;
}

/** 제목 기본값 (POLL-01 "○요일 점심", 회식은 저녁 고정 PARTY-02) */
export function defaultTitle(kind: PollKind): string {
  return `${MOCK_WEEKDAY} ${kind === "party" ? "회식" : "점심"}`;
}

/* ---------- 마감 ---------- */

export type DeadlineId =
  "in10" | "in30" | "in60" | "fixed" | "today18" | "tomorrow12" | "custom";

export type DeadlineOption = {
  id: DeadlineId;
  /** 자정부터 분. 내일이면 1440을 넘는다. custom은 null */
  at: number | null;
};

/** 목업 현재 시각(자정부터 분). noon 11:05, late 11:45 */
export function nowMinutes(clock: PollCreateParams["clock"]): number {
  return clock === "late" ? 11 * 60 + 45 : 11 * 60 + 5;
}

/** 점심 고정 시각 11:30 (POLL-01 빠른 선택) */
const LUNCH_FIXED = 11 * 60 + 30;

/**
 * 마감 빠른 선택. 점심: 10분 뒤 / 30분 뒤 / 11:30 / 직접. 11:30이 지났거나 10분 안이면 그 칩 대신 1시간 뒤.
 * 회식: 1시간 뒤 / 오늘 18:00 / 내일 12:00 / 직접 (회식은 하루 넘게 걸려 정하는 일이 많다, 안건).
 */
export function deadlineOptions(
  kind: PollKind,
  now: number,
): readonly DeadlineOption[] {
  if (kind === "party") {
    const today18 = 18 * 60;
    return [
      { id: "in60", at: now + 60 },
      ...(today18 - now >= DEADLINE_MIN_LEAD
        ? [{ id: "today18" as const, at: today18 }]
        : []),
      { id: "tomorrow12", at: 24 * 60 + 12 * 60 },
      { id: "custom", at: null },
    ];
  }
  const fixedOk = LUNCH_FIXED - now >= DEADLINE_MIN_LEAD;
  return [
    { id: "in10", at: now + 10 },
    { id: "in30", at: now + 30 },
    fixedOk ? { id: "fixed", at: LUNCH_FIXED } : { id: "in60", at: now + 60 },
    { id: "custom", at: null },
  ];
}

/** 고른 마감의 시각(분). 직접 입력이 비었거나 너무 이르면 null */
export function deadlineAt(draft: PollDraft, now: number): number | null {
  if (draft.deadline === "custom") {
    const m = /^(\d{2}):(\d{2})$/.exec(draft.customAt);
    if (!m) return null;
    const at = Number(m[1]) * 60 + Number(m[2]);
    return at - now >= DEADLINE_MIN_LEAD ? at : null;
  }
  const opt = deadlineOptions(draft.kind, now).find(
    (o) => o.id === draft.deadline,
  );
  return opt?.at ?? deadlineOptions(draft.kind, now)[1]?.at ?? null;
}

/** 분 → "11:35". 내일이면 isTomorrow */
export function clockOf(minutes: number): { hhmm: string; tomorrow: boolean } {
  const tomorrow = minutes >= 24 * 60;
  const m = minutes % (24 * 60);
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return { hhmm: `${hh}:${mm}`, tomorrow };
}

/** 직접 입력 기본값: 지금부터 30분 뒤를 5분 단위로 올림 */
export function customDefault(now: number): string {
  const at = Math.ceil((now + 30) / 5) * 5;
  return clockOf(at).hhmm;
}

/** 만들 수 있나: 후보 2~5곳 + 마감이 정해짐 */
export function canCreate(draft: PollDraft, now: number): boolean {
  const n = draft.candidates.length;
  return (
    n >= CANDIDATE_MIN &&
    n <= CANDIDATE_MAX &&
    draft.title.trim() !== "" &&
    deadlineAt(draft, now) !== null
  );
}
