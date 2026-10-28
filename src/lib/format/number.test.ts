import { describe, expect, it } from "vitest";

import {
  formatPercent,
  formatPerPersonPriceBand,
  formatPriceBand,
  formatShortWon,
  formatThumbsUp,
  formatWalkDistance,
  formatWalkMinutes,
  formatWon,
  priceBandParts,
  searchRadiusFromWalkMinutes,
  thumbsUpPercent,
  walkMinutesFromMeters,
} from "@/lib/format";

describe("formatWalkMinutes", () => {
  it("도보 약 N분으로 표시한다", () => {
    expect(formatWalkMinutes(4)).toBe("도보 약 4분");
  });
  it("소수는 올리고 최소 1분이다", () => {
    expect(formatWalkMinutes(3.2)).toBe("도보 약 4분");
    expect(formatWalkMinutes(0)).toBe("도보 약 1분");
  });
  it("음수나 NaN은 RangeError", () => {
    expect(() => formatWalkMinutes(-1)).toThrow(RangeError);
    expect(() => formatWalkMinutes(Number.NaN)).toThrow(RangeError);
  });
});

describe("formatPriceBand", () => {
  it("1만 원 미만은 N천 원대 (천 원 단위 내림)", () => {
    expect(formatPriceBand(9000)).toBe("9천 원대");
    expect(formatPriceBand(9900)).toBe("9천 원대");
    expect(formatPriceBand(1000)).toBe("1천 원대");
  });
  it("1천 원 미만", () => {
    expect(formatPriceBand(800)).toBe("1천 원 미만");
  });
  it("1만 원 이상은 소수 한 자리 만 원대", () => {
    expect(formatPriceBand(10000)).toBe("1만 원대");
    expect(formatPriceBand(12000)).toBe("1.2만 원대");
    expect(formatPriceBand(12999)).toBe("1.2만 원대");
    expect(formatPriceBand(32000)).toBe("3.2만 원대");
    expect(formatPriceBand(20500)).toBe("2만 원대");
  });
  it("금지 문자(중간점, 대시)를 쓰지 않는다", () => {
    for (const p of [500, 9000, 12000, 45000]) {
      expect(formatPriceBand(p)).not.toMatch(/[·・‧—–―]/);
    }
  });
});

describe("formatWon", () => {
  it("천 단위 쉼표와 원", () => {
    expect(formatWon(9000)).toBe("9,000원");
    expect(formatWon(12500)).toBe("12,500원");
  });
});

describe("formatPercent", () => {
  it("반올림한 정수 퍼센트", () => {
    expect(formatPercent(87)).toBe("87%");
    expect(formatPercent(86.6)).toBe("87%");
  });
  it("0~100 범위로 자른다", () => {
    expect(formatPercent(120)).toBe("100%");
    expect(formatPercent(-3)).toBe("0%");
  });
  it("null은 null (콜드 스타트)", () => {
    expect(formatPercent(null)).toBeNull();
  });
});

describe("walkMinutesFromMeters / formatWalkDistance (거리 × 1.3 ÷ 67)", () => {
  it("공식대로 계산하고 올림한다", () => {
    // 300m × 1.3 ÷ 67 = 5.82 → 6분
    expect(walkMinutesFromMeters(300)).toBe(6);
    expect(formatWalkDistance(300)).toBe("도보 약 6분");
    // 500m → 9.70 → 10분
    expect(walkMinutesFromMeters(500)).toBe(10);
  });
  it("정확히 정수 분이 되는 거리는 올리지 않는다 (부동소수 오차 방지)", () => {
    // 67 ÷ 1.3 × 4 = 206.15...m 는 정확히 4분
    expect(walkMinutesFromMeters((67 / 1.3) * 4)).toBe(4);
    expect(walkMinutesFromMeters((67 / 1.3) * 4 + 0.01)).toBe(5);
  });
  it("0m와 아주 가까운 거리는 최소 1분", () => {
    expect(walkMinutesFromMeters(0)).toBe(1);
    expect(walkMinutesFromMeters(1)).toBe(1);
    expect(formatWalkDistance(0)).toBe("도보 약 1분");
  });
  it("큰 수", () => {
    expect(walkMinutesFromMeters(10_000)).toBe(195); // 194.03 → 195
  });
  it("음수, NaN, Infinity는 RangeError", () => {
    expect(() => walkMinutesFromMeters(-1)).toThrow(RangeError);
    expect(() => walkMinutesFromMeters(Number.NaN)).toThrow(RangeError);
    expect(() => walkMinutesFromMeters(Infinity)).toThrow(RangeError);
  });
});

describe("searchRadiusFromWalkMinutes (분 × 67 ÷ 1.3)", () => {
  it("반경을 내림한 m로 준다", () => {
    expect(searchRadiusFromWalkMinutes(10)).toBe(515); // 515.38
    expect(searchRadiusFromWalkMinutes(0)).toBe(0);
  });
  it("반경 끝의 식당은 허용 분을 넘지 않는다", () => {
    for (const min of [5, 10, 15, 20]) {
      expect(
        walkMinutesFromMeters(searchRadiusFromWalkMinutes(min)),
      ).toBeLessThanOrEqual(min);
    }
  });
  it("음수, NaN은 RangeError", () => {
    expect(() => searchRadiusFromWalkMinutes(-1)).toThrow(RangeError);
    expect(() => searchRadiusFromWalkMinutes(Number.NaN)).toThrow(RangeError);
  });
});

describe("priceBandParts / formatPerPersonPriceBand", () => {
  it("숫자와 단위를 나눈다", () => {
    expect(priceBandParts(9500)).toEqual({ amount: "9", unit: "천 원대" });
    expect(priceBandParts(12999)).toEqual({ amount: "1.2", unit: "만 원대" });
    expect(priceBandParts(0)).toEqual({ amount: "1", unit: "천 원 미만" });
  });
  it("1인 접두를 붙인다", () => {
    expect(formatPerPersonPriceBand(9000)).toBe("1인 9천 원대");
    expect(formatPerPersonPriceBand(12000)).toBe("1인 1.2만 원대");
  });
  it("경계값: 999, 1000, 9999, 10000", () => {
    expect(formatPriceBand(999)).toBe("1천 원 미만");
    expect(formatPriceBand(1000)).toBe("1천 원대");
    expect(formatPriceBand(9999)).toBe("9천 원대");
    expect(formatPriceBand(10000)).toBe("1만 원대");
  });
  it("큰 수", () => {
    expect(formatPriceBand(123_456)).toBe("12.3만 원대");
    expect(formatPriceBand(1_000_000)).toBe("100만 원대");
  });
  it("음수, NaN은 RangeError", () => {
    expect(() => formatPriceBand(-1)).toThrow(RangeError);
    expect(() => formatPriceBand(Number.NaN)).toThrow(RangeError);
    expect(() => priceBandParts(Infinity)).toThrow(RangeError);
  });
});

describe("formatWon 경계", () => {
  it("0, 소수 반올림, 큰 수", () => {
    expect(formatWon(0)).toBe("0원");
    expect(formatWon(999.5)).toBe("1,000원");
    expect(formatWon(1_234_567)).toBe("1,234,567원");
  });
  it("음수, NaN은 RangeError", () => {
    expect(() => formatWon(-100)).toThrow(RangeError);
    expect(() => formatWon(Number.NaN)).toThrow(RangeError);
  });
});

describe("formatShortWon", () => {
  it("1만 원 미만은 정확한 금액", () => {
    expect(formatShortWon(0)).toBe("0원");
    expect(formatShortWon(9000)).toBe("9,000원");
    expect(formatShortWon(9999)).toBe("9,999원");
  });
  it("1만 원 이상은 천 원 자리 반올림한 만 원", () => {
    expect(formatShortWon(10000)).toBe("1만 원");
    expect(formatShortWon(12000)).toBe("1.2만 원");
    expect(formatShortWon(12400)).toBe("1.2만 원");
    expect(formatShortWon(12500)).toBe("1.3만 원");
    expect(formatShortWon(19_500)).toBe("2만 원");
    expect(formatShortWon(1_234_000)).toBe("123.4만 원");
  });
  it("음수, NaN은 RangeError", () => {
    expect(() => formatShortWon(-1)).toThrow(RangeError);
    expect(() => formatShortWon(Number.NaN)).toThrow(RangeError);
  });
});

describe("formatPercent 경계", () => {
  it("0, 100, NaN", () => {
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(100)).toBe("100%");
    expect(formatPercent(Number.NaN)).toBeNull();
    expect(formatPercent(82.5)).toBe("83%");
  });
});

describe("thumbsUpPercent / formatThumbsUp", () => {
  it("비율을 반올림한 정수", () => {
    expect(thumbsUpPercent(41, 50)).toBe(82);
    expect(formatThumbsUp(41, 50)).toBe("82%");
    expect(thumbsUpPercent(2, 3)).toBe(67);
  });
  it("응답 0건은 null", () => {
    expect(thumbsUpPercent(0, 0)).toBeNull();
    expect(formatThumbsUp(0, 0)).toBeNull();
  });
  it("전부 👍면 100, 전부 👎면 0", () => {
    expect(thumbsUpPercent(5, 5)).toBe(100);
    expect(thumbsUpPercent(0, 5)).toBe(0);
  });
  it("👎가 있으면 100으로, 👍가 있으면 0으로 반올림하지 않는다", () => {
    expect(thumbsUpPercent(199, 200)).toBe(99);
    expect(thumbsUpPercent(1, 300)).toBe(1);
  });
  it("음수, NaN, up > total은 RangeError", () => {
    expect(() => thumbsUpPercent(-1, 5)).toThrow(RangeError);
    expect(() => thumbsUpPercent(Number.NaN, 5)).toThrow(RangeError);
    expect(() => thumbsUpPercent(6, 5)).toThrow(RangeError);
  });
});
