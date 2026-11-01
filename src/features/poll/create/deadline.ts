// 투표 마감 빠른 선택 (POLL-01, D-15 안건 4~6, DESIGN.md 5장 "투표 만들기"). 순수 함수, KST 기준.
//
// 시각은 "오늘 KST 00:00부터 지난 분"으로 다룬다. 내일이면 1440을 넘는다. 서버로 보낼 때 toClosesAt으로 순간(ISO)을 만든다.
// - 점심: 10분 뒤 / 30분 뒤 / 11:30 / 직접. 저녁: 10분 뒤 / 30분 뒤 / 18:00 / 직접.
//   고정 시각이 지났거나 10분 안이면 그 칸이 "1시간 뒤"로 바뀐다(칸 수 4 유지, 안건 4).
// - 회식: 1시간 뒤 / 오늘 18:00 / 내일 12:00 / 직접. 기본은 오늘 18:00, 10분 안이면 내일 12:00(안건 5).
// - 직접: 점심, 저녁은 오늘 안, 회식은 7일 안. 5분 단위, 지금부터 10분 뒤부터.
import {
  fromKstWallTime,
  getKstParts,
  kstMinutesOfDay,
  startOfKstDay,
} from "@/lib/time";
import type { PollKind } from "./intent";

export const DEADLINE_MIN_LEAD = 10;
export const DAY_MINUTES = 24 * 60;
/** 회식 직접 입력 최대(7일, 서버 create_poll과 같다) */
export const PARTY_MAX_MINUTES = 7 * DAY_MINUTES;

export type DeadlineId =
  "in10" | "in30" | "in60" | "fixed" | "today18" | "tomorrow12" | "custom";

export type DeadlineOption = { id: DeadlineId; at: number | null };

/** 점심, 저녁 고정 칸 시각 */
export function fixedMinutes(kind: PollKind): number {
  return kind === "dinner" ? 18 * 60 : 11 * 60 + 30;
}

export function deadlineOptions(kind: PollKind, now: number): DeadlineOption[] {
  if (kind === "party") {
    const today18 = 18 * 60;
    return [
      { id: "in60", at: now + 60 },
      ...(today18 - now >= DEADLINE_MIN_LEAD
        ? [{ id: "today18" as const, at: today18 }]
        : []),
      { id: "tomorrow12", at: DAY_MINUTES + 12 * 60 },
      { id: "custom", at: null },
    ];
  }
  const fixed = fixedMinutes(kind);
  return [
    { id: "in10", at: now + 10 },
    { id: "in30", at: now + 30 },
    fixed - now >= DEADLINE_MIN_LEAD
      ? { id: "fixed", at: fixed }
      : { id: "in60", at: now + 60 },
    { id: "custom", at: null },
  ];
}

/** 고정 칸이 1시간 뒤로 바뀌었나(칸 아래 한 줄로 알린다) */
export function fixedSwapped(kind: PollKind, now: number): boolean {
  return kind !== "party" && fixedMinutes(kind) - now < DEADLINE_MIN_LEAD;
}

export function defaultDeadline(kind: PollKind, now: number): DeadlineId {
  if (kind !== "party") return "in30";
  return 18 * 60 - now >= DEADLINE_MIN_LEAD ? "today18" : "tomorrow12";
}

export type DeadlineChoice = {
  id: DeadlineId;
  /** custom일 때 분(오늘 00:00부터). 비었으면 null */
  custom: number | null;
};

/** 고른 마감의 분. 직접 입력이 비었거나 범위 밖이면 null */
export function deadlineMinutes(
  kind: PollKind,
  choice: DeadlineChoice,
  now: number,
): number | null {
  if (choice.id === "custom") {
    const at = choice.custom;
    if (at === null) return null;
    const max = kind === "party" ? PARTY_MAX_MINUTES : DAY_MINUTES - 1;
    if (at - now < DEADLINE_MIN_LEAD || at > max) return null;
    return at;
  }
  const options = deadlineOptions(kind, now);
  const hit = options.find((o) => o.id === choice.id);
  if (hit) return hit.at;
  // 1분마다 시각이 흘러 고른 칸(11:30)이 사라졌으면 같은 자리의 새 칸(1시간 뒤)
  return options[2]?.at ?? null;
}

/** 분 → "11:35"와 날짜 차이(0 오늘, 1 내일 ...) */
export function clockOf(minutes: number): { hhmm: string; dayOffset: number } {
  const dayOffset = Math.floor(minutes / DAY_MINUTES);
  const m = minutes - dayOffset * DAY_MINUTES;
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return { hhmm: `${hh}:${mm}`, dayOffset };
}

/** 지금 KST 분 */
export function nowMinutes(now: Date): number {
  return kstMinutesOfDay(now);
}

/** 오늘 00:00(KST) 기준 분 → 순간 */
export function toClosesAt(now: Date, minutes: number): Date {
  return new Date(startOfKstDay(now).getTime() + minutes * 60_000);
}

/** 순간 → 오늘 00:00(KST) 기준 분(내일이면 1440 이상). 이미 만든 방의 마감을 고치기 칸에 되돌릴 때 */
export function minutesFromToday(now: Date, at: Date): number {
  return Math.round((at.getTime() - startOfKstDay(now).getTime()) / 60_000);
}

/** 직접 입력 기본값: 지금부터 30분 뒤를 5분 단위로 올림 */
export function customDefault(now: number): number {
  return Math.ceil((now + 30) / 5) * 5;
}

/** "HH:MM"(점심, 저녁) → 분. 형식이 틀리면 null */
export function parseTimeInput(value: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}

/** "YYYY-MM-DDTHH:MM"(회식, KST 벽시계) → 오늘 00:00부터 분. 형식이 틀리면 null */
export function parseDateTimeInput(value: string, now: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const at = fromKstWallTime(
    Number(m[1]),
    Number(m[2]),
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
  );
  return minutesFromToday(now, at);
}

/** 분 → datetime-local 값(KST 벽시계) */
export function toDateTimeInput(now: Date, minutes: number): string {
  const p = getKstParts(toClosesAt(now, minutes));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** 회식 직접 입력 min, max(datetime-local) */
export function partyInputRange(now: Date): { min: string; max: string } {
  const n = nowMinutes(now);
  return {
    min: toDateTimeInput(now, Math.ceil((n + DEADLINE_MIN_LEAD) / 5) * 5),
    // 7일 뒤 00:00(KST). 서버 상한(지금 + 7일)보다 늘 이르다
    max: toDateTimeInput(now, PARTY_MAX_MINUTES),
  };
}

const WEEKDAYS = [
  "일요일",
  "월요일",
  "화요일",
  "수요일",
  "목요일",
  "금요일",
  "토요일",
] as const;

/** KST 요일 이름 "수요일" */
export function kstWeekdayName(now: Date): string {
  return WEEKDAYS[getKstParts(now).weekday];
}
