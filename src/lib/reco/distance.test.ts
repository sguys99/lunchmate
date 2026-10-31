import { describe, expect, it } from "vitest";
import {
  estimateWalkMinutes,
  isWithinWalk,
  searchRadiusFromWalkMinutes,
  walkMinutesFromMeters,
} from "./distance";

describe("도보 분 추정 (T5.5)", () => {
  it("직선거리 × 1.3 ÷ 67", () => {
    expect(estimateWalkMinutes(670)).toBeCloseTo(13, 6);
    expect(estimateWalkMinutes(0)).toBe(0);
    expect(estimateWalkMinutes(-5)).toBe(0);
    expect(estimateWalkMinutes(Number.NaN)).toBe(0);
  });

  it("표시용 정수는 올림, 최소 1분", () => {
    expect(walkMinutesFromMeters(206)).toBe(4); // 3.997분
    expect(walkMinutesFromMeters(10)).toBe(1);
  });
});

describe("검색 반경 (T5.5)", () => {
  it("허용 도보 분 × 67 ÷ 1.3, 내림", () => {
    expect(searchRadiusFromWalkMinutes(5)).toBe(257);
    expect(searchRadiusFromWalkMinutes(10)).toBe(515);
    expect(searchRadiusFromWalkMinutes(15)).toBe(773);
    expect(searchRadiusFromWalkMinutes(20)).toBe(1030);
  });

  it("반경 경계와 같은 기준으로 안쪽을 판정한다", () => {
    expect(isWithinWalk(515, 10)).toBe(true);
    expect(isWithinWalk(516, 10)).toBe(false);
  });
});
