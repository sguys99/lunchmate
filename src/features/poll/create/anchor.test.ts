import { describe, expect, it } from "vitest";
import { anchorFor, clampRadius, RADIUS_MAX_M, RADIUS_MIN_M } from "./anchor";

const office = { lat: 37.5665, lng: 126.978 };

describe("투표 기준점 반경 (T7.6, D-15 안건 10)", () => {
  it("가장 먼 후보 + 200m, 기준점은 사무실 핀 그대로", () => {
    const a = anchorFor(office, [
      { lat: 37.5665, lng: 126.978 },
      { lat: 37.5701, lng: 126.978 }, // 약 400m 북쪽
      null,
    ]);
    expect(a.lat).toBe(office.lat);
    expect(a.lng).toBe(office.lng);
    expect(a.radiusM).toBeGreaterThan(590);
    expect(a.radiusM).toBeLessThan(610);
    expect(a.outside).toBe(false);
  });

  it("좌표를 아는 후보가 없으면 기본 반경", () => {
    const a = anchorFor(office, [null, undefined]);
    expect(a.radiusM).toBeGreaterThanOrEqual(RADIUS_MIN_M);
    expect(a.radiusM).toBeLessThanOrEqual(RADIUS_MAX_M);
  });

  it("3km를 넘는 후보는 outside, 반경은 상한", () => {
    const a = anchorFor(office, [{ lat: 37.62, lng: 126.978 }]);
    expect(a.radiusM).toBe(RADIUS_MAX_M);
    expect(a.outside).toBe(true);
  });

  it("DB 범위 100~3000", () => {
    expect(clampRadius(10)).toBe(100);
    expect(clampRadius(9000)).toBe(3000);
  });
});
