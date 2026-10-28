import { DAY_MS, KST_TIME_ZONE } from "./constants";

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = 일요일

export interface KstParts {
  year: number;
  /** 1~12 */
  month: number;
  /** 1~31 */
  day: number;
  /** 0~23 */
  hour: number;
  /** 0~59 */
  minute: number;
  second: number;
  weekday: Weekday;
}

/**
 * 벽시계 성분은 하드코딩한 +9 오프셋 대신 Intl로 얻는다.
 * 포매터 생성 비용이 크므로 모듈 단위로 하나만 만들어 재사용한다.
 */
const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: KST_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
});

const WEEKDAYS: Record<string, Weekday> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function assertValid(date: Date): void {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("Invalid Date");
  }
}

/** 주어진 순간의 Asia/Seoul 벽시계 성분. */
export function getKstParts(date: Date): KstParts {
  assertValid(date);
  const out: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const part of formatter.formatToParts(date)) {
    out[part.type] = part.value;
  }
  const weekday = WEEKDAYS[out.weekday ?? ""];
  if (weekday === undefined) {
    throw new RangeError(`Unexpected weekday: ${out.weekday}`);
  }
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour),
    minute: Number(out.minute),
    second: Number(out.second),
    weekday,
  };
}

/** 해당 순간의 KST UTC 오프셋(ms). KST는 +9시간 고정이지만 Intl 결과에서 계산한다. */
function kstOffsetMs(date: Date): number {
  const p = getKstParts(date);
  const wallAsUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second,
  );
  const truncated = Math.floor(date.getTime() / 1000) * 1000;
  return wallAsUtc - truncated;
}

/** KST 벽시계 시각(연, 월 1~12, 일, 시, 분)에 해당하는 순간. 월·일 넘침은 Date.UTC 규칙대로 정규화된다. */
export function fromKstWallTime(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date {
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  // KST는 일광 절약 시간이 없어 추정 시점의 오프셋을 그대로 써도 정확하다.
  return new Date(wallAsUtc - kstOffsetMs(new Date(wallAsUtc)));
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** KST 기준 날짜 키 "YYYY-MM-DD". "하루 1회" 같은 날짜 단위 판정에 쓴다. */
export function kstDateKey(date: Date): string {
  const p = getKstParts(date);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

/** 두 순간이 같은 KST 날짜인지. */
export function isSameKstDay(a: Date, b: Date): boolean {
  return kstDateKey(a) === kstDateKey(b);
}

/** 해당 순간이 속한 KST 날짜의 00:00(KST)을 나타내는 Date. 예: KST 10/28 00:00 = UTC 10/27 15:00. */
export function startOfKstDay(date: Date): Date {
  const p = getKstParts(date);
  return fromKstWallTime(p.year, p.month, p.day);
}

/** KST 날짜 기준으로 n일 더한 날의 00:00(KST). 음수 가능. */
export function addKstDays(date: Date, days: number): Date {
  const p = getKstParts(date);
  return fromKstWallTime(p.year, p.month, p.day + days);
}

/** 두 순간 사이의 KST 달력 날짜 차이(b의 날짜 - a의 날짜). */
export function kstDayDiff(a: Date, b: Date): number {
  return Math.round(
    (startOfKstDay(b).getTime() - startOfKstDay(a).getTime()) / DAY_MS,
  );
}

/** KST 하루 중 경과 분(0~1439). */
export function kstMinutesOfDay(date: Date): number {
  const p = getKstParts(date);
  return p.hour * 60 + p.minute;
}
