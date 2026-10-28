// 숫자 표시 포매터 (순수 함수). 표기 규칙은 tasks.md 2.2절, T2.4, PRD 8.3.
// 구분자는 쉼표나 공백만 쓰고 중간점은 쓰지 않는다.

function assertNonNegativeFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(
      `${name}은(는) 0 이상의 유한한 숫자여야 합니다: ${value}`,
    );
  }
}

/** 도보 분 표시. 4 → "도보 약 4분". 소수는 올림, 최소 1분. */
export function formatWalkMinutes(minutes: number): string {
  assertNonNegativeFinite(minutes, "minutes");
  return `도보 약 ${Math.max(1, Math.ceil(minutes))}분`;
}

/**
 * 1인 가격대 표시 (천 원 단위 내림).
 *  - 1천 원 미만: "1천 원 미만"
 *  - 1만 원 미만: 9,500 → "9천 원대"
 *  - 1만 원 이상: 12,000 → "1.2만 원대", 10,000 → "1만 원대", 32,000 → "3.2만 원대"
 * 1만 이상 표기는 tasks.md T2.4("1.2만 원")와 PRD PARTY-03("3.2만 원대")을 따른다.
 */
export function formatPriceBand(priceKRW: number): string {
  assertNonNegativeFinite(priceKRW, "priceKRW");
  const thousands = Math.floor(priceKRW / 1000);
  if (thousands < 1) return "1천 원 미만";
  if (thousands < 10) return `${thousands}천 원대`;
  const man = thousands / 10;
  const text = Number.isInteger(man) ? String(man) : man.toFixed(1);
  return `${text}만 원대`;
}

/** 정확한 금액 표시 (메뉴 가격 등). 9000 → "9,000원". */
export function formatWon(priceKRW: number): string {
  assertNonNegativeFinite(priceKRW, "priceKRW");
  return `${Math.round(priceKRW).toLocaleString("ko-KR")}원`;
}

/** 👍 비율 표시. 87 → "87%". 0~100으로 자르고 반올림. null(콜드 스타트)은 null. */
export function formatPercent(rate: number | null): string | null {
  if (rate === null || !Number.isFinite(rate)) return null;
  return `${Math.round(Math.min(100, Math.max(0, rate)))}%`;
}
