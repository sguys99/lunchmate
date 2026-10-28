import { describe, expect, it } from "vitest";

import {
  formatPercent,
  formatPriceBand,
  formatWalkMinutes,
  formatWon,
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
