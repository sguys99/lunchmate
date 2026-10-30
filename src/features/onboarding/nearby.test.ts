import { describe, expect, it } from "vitest";
import type { NearbyRestaurant } from "@/lib/kakao/local";
import { countNearby, NEARBY_FETCH_RADIUS } from "./nearby";

const at = (distance: number, i: number): NearbyRestaurant => ({
  id: String(i),
  position: { lat: 37.5, lng: 127 },
  distance,
});

describe("근처 식당 수 (ONB-02, D-07 안건 5)", () => {
  it("한 번에 받는 반경은 도보 20분 반경(1030m)", () => {
    expect(NEARBY_FETCH_RADIUS).toBe(1030);
  });

  it("반경 안 개수를 센다", () => {
    const places = [100, 300, 600, 900].map(at);
    expect(countNearby(places, false, 515)).toEqual({
      count: 2,
      atLeast: false,
    });
    expect(countNearby([], false, 515)).toEqual({ count: 0, atLeast: false });
  });

  it("상한 45곳이 모두 반경 안이면 45곳 이상", () => {
    const places = Array.from({ length: 45 }, (_, i) => at(i * 5, i));
    expect(countNearby(places, true, 515)).toEqual({
      count: 45,
      atLeast: true,
    });
    // 상한에 닿았어도 반경 안이 일부면 정확한 수
    expect(countNearby(places, true, 100)).toEqual({
      count: 21,
      atLeast: false,
    });
  });
});
