import { describe, expect, it } from "vitest";
import type { KakaoRestaurant } from "@/lib/kakao/local";
import { toMapPlaces } from "./places";

const center = { lat: 37.5665, lng: 126.978 };
const r = (id: string, distance: number | null, cat: string): KakaoRestaurant => ({
  id,
  name: `식당 ${id}`,
  categoryName: cat,
  address: "주소",
  position: { lat: 37.567, lng: 126.979 },
  distance,
  placeUrl: `https://place.map.kakao.com/${id}`,
});

describe("지도 식당 변환", () => {
  it("카테고리, 도보 분, 추정 가격, 즐겨찾기를 붙이고 가까운 순으로 둔다", () => {
    const out = toMapPlaces(
      [r("2", 300, "음식점 > 일식 > 초밥"), r("1", 100, "음식점 > 한식 > 국밥")],
      center,
      { meal: "lunch", isFavorite: (id) => id === "1" },
    );
    expect(out.map((p) => p.id)).toEqual(["1", "2"]);
    expect(out[0]?.category).toBe("gukbap");
    expect(out[0]?.walkMinutes).toBe(2); // 100 x 1.3 / 67 = 1.94 → 2
    expect(out[0]?.favorite).toBe(true);
    expect(out[0]?.priceEstimate).toBe(true);
    expect(out[1]?.favorite).toBe(false);
  });

  it("카카오 거리가 없으면 직접 잰다", () => {
    const [p] = toMapPlaces([r("1", null, "음식점 > 한식")], center, {
      meal: "lunch",
      isFavorite: () => false,
    });
    expect(p?.distanceM).toBeGreaterThan(0);
  });
});
