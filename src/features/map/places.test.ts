import { describe, expect, it } from "vitest";
import type { KakaoRestaurant } from "@/lib/kakao/local";
import { hidePersonal, toMapPlaces } from "./places";

const center = { lat: 37.5665, lng: 126.978 };
const r = (
  id: string,
  distance: number | null,
  cat: string,
): KakaoRestaurant => ({
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
      [
        r("2", 300, "음식점 > 일식 > 초밥"),
        r("1", 100, "음식점 > 한식 > 국밥"),
      ],
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

describe("지도 숨김: 기피 음식, 다시 안 갈 곳 (2026-10-31 결정)", () => {
  const list = [
    r("1", 100, "음식점 > 일식 > 초밥,롤"),
    r("2", 200, "음식점 > 한식 > 국밥"),
    r("3", 300, "음식점 > 한식 > 해물,생선 > 회"),
    r("4", 400, "음식점 > 양식"),
  ];

  it("추천과 같은 판정으로 기피 음식과 다시 안 갈 곳을 빼고 수를 센다", () => {
    const out = hidePersonal(list, {
      avoid: [{ kind: "food", value: "회" }],
      blocked: new Set(["2", "3"]),
    });
    expect(out.visible.map((p) => p.id)).toEqual(["4"]);
    // 3은 기피와 다시 안 갈 곳 둘 다지만 처음 걸린 기피 하나에만 센다
    expect(out.hidden).toEqual({ avoid: 2, blocked: 1 });
  });

  it("직접 입력 기피어는 식당 이름에도 걸린다", () => {
    const named = { ...r("5", 50, "음식점 > 한식"), name: "할매순대국" };
    const out = hidePersonal([named, ...list], {
      avoid: [{ kind: "custom", value: "순대" }],
      blocked: new Set(),
    });
    expect(out.visible.map((p) => p.id)).toEqual(["1", "2", "3", "4"]);
    expect(out.hidden).toEqual({ avoid: 1, blocked: 0 });
  });

  it("규칙이 없으면(둘러보기에 칩 없음) 아무것도 숨기지 않는다", () => {
    const out = hidePersonal(list, { avoid: [], blocked: new Set() });
    expect(out.visible).toHaveLength(4);
    expect(out.hidden).toEqual({ avoid: 0, blocked: 0 });
  });
});
