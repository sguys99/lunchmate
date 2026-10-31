// 제보, 신고, 할인, 웨이팅 DB 값 목록과 화면 값 변환 (T6.5 마이그레이션 제약과 같은 값). 브라우저, 서버 공용, zod 없음.
// 라벨은 src/copy/report.ts, 웨이팅 단계 라벨은 src/copy/badges.ts waitingLevels.
import type { WaitingLevel } from "@/components/badges/pick-badges";

/** 후기 신고 사유 (MOD-01): 광고/스팸, 욕설/비방, 개인정보, 허위, 기타 */
export const REVIEW_REPORT_REASONS = [
  "spam",
  "abuse",
  "privacy",
  "false",
  "other",
] as const;
export type ReviewReportReason = (typeof REVIEW_REPORT_REASONS)[number];

/** 할인 신고 사유 (DEAL-04, D-13 안건 10): 광고성/허위, 욕설/비방, 개인정보, 기타 */
export const DEAL_REPORT_REASONS = [
  "ad_false",
  "abuse",
  "privacy",
  "other",
] as const;
export type DealReportReason = (typeof DEAL_REPORT_REASONS)[number];

/** 신고 "기타" 글 최대 글자 수 */
export const REPORT_NOTE_MAX = 100;

/** 식당 정보 제보 종류 (PLACE-05) */
export const PLACE_REPORT_KINDS = ["closed", "price", "info"] as const;
export type PlaceReportKind = (typeof PLACE_REPORT_KINDS)[number];
/** 문 닫았어요 세부: 아예 닫음, 옮김, 오늘만 쉼(폐업 수에 세지 않음) */
export const CLOSED_DETAILS = ["gone", "moved", "today"] as const;
export type ClosedDetail = (typeof CLOSED_DETAILS)[number];
/** 정보가 틀려요 세부 */
export const INFO_FIELDS = ["name", "location", "phone", "category"] as const;
export type InfoField = (typeof INFO_FIELDS)[number];

/** 할인 유형 5종 (DEAL-01) */
export const DEAL_TYPES = [
  "lunch_special",
  "discount",
  "event",
  "happy_hour",
  "other",
] as const;
export type DealType = (typeof DEAL_TYPES)[number];
/** 할인 시간대: lunch 11~15시, afternoon 15~17시, dinner 17시~ */
export const DEAL_SLOTS = ["lunch", "afternoon", "dinner"] as const;
export type DealSlot = (typeof DEAL_SLOTS)[number];
/** 할인 내용 최대 글자 수 */
export const DEAL_CONTENT_MAX = 60;
/** 요일 비트: 월 1, 화 2, 수 4, 목 8, 금 16, 토 32, 일 64. 0이면 언제든 */
export const DEAL_DAY_BITS = [1, 2, 4, 8, 16, 32, 64] as const;
export const DEAL_WEEKDAYS_MASK = 1 | 2 | 4 | 8 | 16;

/** 요일 비트 → 월(0)~일(6) 인덱스 목록 */
export function dealDaysToIndexes(days: number): number[] {
  return DEAL_DAY_BITS.flatMap((bit, i) => ((days & bit) !== 0 ? [i] : []));
}
/** 월(0)~일(6) 인덱스 목록 → 요일 비트 */
export function dealIndexesToDays(indexes: readonly number[]): number {
  return indexes.reduce((acc, i) => acc | (DEAL_DAY_BITS[i] ?? 0), 0);
}

export const DEAL_CHECK_ANSWERS = ["still", "ended"] as const;
export type DealCheckAnswer = (typeof DEAL_CHECK_ANSWERS)[number];
/** 끝났어요가 이 수(서로 다른 사람)면 숨긴다 (AC-DEAL-3) */
export const DEAL_ENDED_HIDE_COUNT = 3;

/** 웨이팅 DB 값 (PLACE-07): now 바로 입장, short 조금 기다려요, long 줄 길어요 */
export const WAIT_DB_LEVELS = ["now", "short", "long"] as const;
export type WaitDbLevel = (typeof WAIT_DB_LEVELS)[number];

const DB_TO_BADGE: Record<WaitDbLevel, WaitingLevel> = {
  now: "walkIn",
  short: "short",
  long: "long",
};
const BADGE_TO_DB: Record<WaitingLevel, WaitDbLevel> = {
  walkIn: "now",
  short: "short",
  long: "long",
};

/** DB 웨이팅 값 → 배지 단계(badgeCopy.waitingLevels 키). 모르는 값이면 null */
export function waitLevelFromDb(level: string | null | undefined) {
  return level && level in DB_TO_BADGE
    ? DB_TO_BADGE[level as WaitDbLevel]
    : null;
}
/** 배지 단계 → DB 웨이팅 값 */
export function waitLevelToDb(level: WaitingLevel): WaitDbLevel {
  return BADGE_TO_DB[level];
}
