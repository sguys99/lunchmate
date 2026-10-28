import { DEAL_DEFAULT_DAYS, DEAL_MAX_DAYS } from "./constants";
import { addKstDays, kstDateKey } from "./kst";

/*
 * 경계 규칙(모든 함수 공통): 기준 시각에 "도달한" 순간부터 지난 것으로 본다.
 *  - 마감: now >= deadline 이면 마감. 마감 시각 정각은 이미 마감이다(POLL-08 "시각 도달").
 *  - 만료: now - start >= ttl 이면 만료. 정확히 ttl만큼 지난 순간은 이미 무효다.
 */

/** 마감 시각에 도달했거나 지났는지. */
export function isPast(deadline: Date, now: Date): boolean {
  return now.getTime() >= deadline.getTime();
}

/** start로부터 ttlMs가 지났는지(경계 포함). 웨이팅 제보 30분, 피드백 48시간, 투표 링크 24시간 등에 쓴다. */
export function isExpired(start: Date, ttlMs: number, now: Date): boolean {
  return now.getTime() - start.getTime() >= ttlMs;
}

/** 마감까지 남은 ms. 이미 지났으면 0. 카운트다운 표시용. */
export function msUntil(deadline: Date, now: Date): number {
  return Math.max(0, deadline.getTime() - now.getTime());
}

/** 경과 ms. 미래 시각이면 0. "12분 전" 표시용. */
export function msSince(start: Date, now: Date): number {
  return Math.max(0, now.getTime() - start.getTime());
}

/** 할인 제보 기간(일)을 1~30일로 맞춘다. 정수가 아니면 내림. */
export function clampDealDays(days: number = DEAL_DEFAULT_DAYS): number {
  if (!Number.isFinite(days)) return DEAL_DEFAULT_DAYS;
  return Math.min(DEAL_MAX_DAYS, Math.max(1, Math.floor(days)));
}

/**
 * DEAL-01 종료일(KST 날짜 키). 종료일 = 등록일(KST) + days일. 기본 7일, 최대 30일.
 * 예: KST 10/28 등록, 기본값 → 종료일 11/04.
 */
export function dealEndDateKey(
  startDate: Date,
  days: number = DEAL_DEFAULT_DAYS,
): string {
  return kstDateKey(addKstDays(startDate, clampDealDays(days)));
}

/**
 * 할인 정보가 숨겨지는 순간. 종료일 당일(KST)은 끝까지 보이고, 다음 날 00:00(KST)에 숨긴다.
 * 23:59:59.999 대신 "다음 날 00:00, 미포함"으로 표현해 isPast(dealEndsAt, now)로 판정한다(AC-DEAL-1).
 */
export function dealEndsAt(
  startDate: Date,
  days: number = DEAL_DEFAULT_DAYS,
): Date {
  return addKstDays(startDate, clampDealDays(days) + 1);
}
