// 숫자 표시 포매터 (순수 함수). 표기 규칙은 tasks.md 2.2절, T2.4, PRD 8.3.
// 구분자는 쉼표나 공백만 쓰고 중간점은 쓰지 않는다.

function assertNonNegativeFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(
      `${name}은(는) 0 이상의 유한한 숫자여야 합니다: ${value}`,
    );
  }
}

// 부동소수 오차(예: 4.0000000001분)로 한 단계 올라가는 것을 막는 여유값.
const EPSILON = 1e-9;

/* ------------------------------------------------------------------ */
/* 도보                                                                */
/* ------------------------------------------------------------------ */

/** 직선거리를 실제 보행 거리로 보정하는 계수 (CLAUDE.md 8장). */
export const WALK_DETOUR_FACTOR = 1.3;
/** 보행 속도 m/분 (CLAUDE.md 8장). */
export const WALK_SPEED_M_PER_MIN = 67;

/**
 * 직선거리(m) → 도보 분(정수). 도보 분 = 거리 × 1.3 ÷ 67.
 * 반올림 규칙: 올림(조금이라도 넘으면 1분 더, 실제보다 짧게 말하지 않기 위해), 최소 1분.
 * 카드에서 숫자만 크게 쓸 때 이 값을 쓴다.
 */
export function walkMinutesFromMeters(distanceM: number): number {
  assertNonNegativeFinite(distanceM, "distanceM");
  const raw = (distanceM * WALK_DETOUR_FACTOR) / WALK_SPEED_M_PER_MIN;
  return Math.max(1, Math.ceil(raw - EPSILON));
}

/** 허용 도보 분 → 카카오 검색 반경(m). 반경 = 분 × 67 ÷ 1.3, 내림. */
export function searchRadiusFromWalkMinutes(minutes: number): number {
  assertNonNegativeFinite(minutes, "minutes");
  return Math.floor(
    (minutes * WALK_SPEED_M_PER_MIN) / WALK_DETOUR_FACTOR + EPSILON,
  );
}

/** 도보 분 표시. 4 → "도보 약 4분". 소수는 올림, 최소 1분. */
export function formatWalkMinutes(minutes: number): string {
  assertNonNegativeFinite(minutes, "minutes");
  return `도보 약 ${Math.max(1, Math.ceil(minutes - EPSILON))}분`;
}

/** 직선거리(m) 표시. 300 → "도보 약 6분". */
export function formatWalkDistance(distanceM: number): string {
  return formatWalkMinutes(walkMinutesFromMeters(distanceM));
}

/* ------------------------------------------------------------------ */
/* 가격                                                                */
/* ------------------------------------------------------------------ */

/** 만 원 단위 숫자 문자열. 12 → "1.2", 10 → "1" (천 원 개수를 받는다). */
function manText(thousands: number): string {
  const man = thousands / 10;
  return Number.isInteger(man) ? String(man) : man.toFixed(1);
}

/** 가격대를 숫자와 단위로 나눈 값. NumberFlow나 큰 숫자 표시용. */
export interface PriceBandParts {
  /** "9", "1.2". 1천 원 미만이면 "1". */
  amount: string;
  /** "천 원대", "만 원대", "천 원 미만" */
  unit: string;
}

/**
 * 1인 가격대를 숫자와 단위로 나눈다 (천 원 단위 내림).
 *  - 1천 원 미만: { "1", "천 원 미만" }
 *  - 1만 원 미만: 9,500 → { "9", "천 원대" }
 *  - 1만 원 이상: 12,999 → { "1.2", "만 원대" } (소수 한 자리, 0이면 생략)
 */
export function priceBandParts(priceKRW: number): PriceBandParts {
  assertNonNegativeFinite(priceKRW, "priceKRW");
  const thousands = Math.floor(priceKRW / 1000);
  if (thousands < 1) return { amount: "1", unit: "천 원 미만" };
  if (thousands < 10) return { amount: String(thousands), unit: "천 원대" };
  return { amount: manText(thousands), unit: "만 원대" };
}

/**
 * 1인 가격대 표시 (천 원 단위 내림).
 *  - 1천 원 미만: "1천 원 미만"
 *  - 1만 원 미만: 9,500 → "9천 원대"
 *  - 1만 원 이상: 12,000 → "1.2만 원대", 10,000 → "1만 원대", 32,000 → "3.2만 원대"
 * 1만 이상 표기는 tasks.md T2.4("1.2만 원")와 PRD PARTY-03("3.2만 원대")을 따른다.
 */
export function formatPriceBand(priceKRW: number): string {
  const { amount, unit } = priceBandParts(priceKRW);
  return `${amount}${unit}`;
}

/** 카드 메타용 1인 가격대. 9,000 → "1인 9천 원대". */
export function formatPerPersonPriceBand(priceKRW: number): string {
  return `1인 ${formatPriceBand(priceKRW)}`;
}

/** 정확한 금액 표시 (메뉴 가격 등). 9000 → "9,000원". */
export function formatWon(priceKRW: number): string {
  assertNonNegativeFinite(priceKRW, "priceKRW");
  return `${Math.round(priceKRW).toLocaleString("ko-KR")}원`;
}

/**
 * 짧은 금액 표시 (예산, 회식 총액 등).
 *  - 1만 원 미만: 정확한 금액, 9000 → "9,000원"
 *  - 1만 원 이상: 천 원 자리에서 반올림한 만 원 단위, 12,400 → "1.2만 원", 12,500 → "1.3만 원",
 *    1,234,000 → "123.4만 원" (만 단위 자리는 쉼표 없이)
 * 가격대(formatPriceBand)와 달리 "대"가 붙지 않는 금액이므로 반올림한다.
 */
export function formatShortWon(priceKRW: number): string {
  assertNonNegativeFinite(priceKRW, "priceKRW");
  const rounded = Math.round(priceKRW);
  if (rounded < 10_000) return formatWon(rounded);
  return `${manText(Math.round(rounded / 1000))}만 원`;
}

/* ------------------------------------------------------------------ */
/* 퍼센트                                                              */
/* ------------------------------------------------------------------ */

/** 👍 비율 표시. 87 → "87%". 0~100으로 자르고 반올림. null(콜드 스타트)이나 NaN은 null. */
export function formatPercent(rate: number | null): string | null {
  if (rate === null || !Number.isFinite(rate)) return null;
  return `${Math.round(Math.min(100, Math.max(0, rate)))}%`;
}

/**
 * 👍 수와 전체 응답 수 → 정수 퍼센트(0~100). 응답이 없으면 null.
 * 반올림하되, 👎가 하나라도 있으면 100으로, 👍가 하나라도 있으면 0으로 올리거나 내리지 않는다
 * (199/200 → 99, 1/300 → 1). 표본 수에 따른 표시 여부는 호출 측이 판단한다.
 */
export function thumbsUpPercent(up: number, total: number): number | null {
  assertNonNegativeFinite(up, "up");
  assertNonNegativeFinite(total, "total");
  if (total === 0) return null;
  if (up > total) {
    throw new RangeError(`up(${up})이 total(${total})보다 큽니다`);
  }
  const pct = Math.round((up / total) * 100);
  if (up < total && pct === 100) return 99;
  if (up > 0 && pct === 0) return 1;
  return pct;
}

/** 👍 수와 전체 응답 수 → "82%". 응답이 없으면 null. */
export function formatThumbsUp(up: number, total: number): string | null {
  return formatPercent(thumbsUpPercent(up, total));
}
