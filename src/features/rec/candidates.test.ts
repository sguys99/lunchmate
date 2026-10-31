import { describe, expect, it } from "vitest";
import type { KakaoRestaurant } from "@/lib/kakao/local";
import { straightDistanceM, toCandidate, toCandidates } from "./candidates";

const center = { lat: 37.5, lng: 127.0 };

function place(over: Partial<KakaoRestaurant> = {}): KakaoRestaurant {
  return {
    id: "1",
    name: "정담국밥",
    categoryName: "음식점 > 한식 > 국밥",
    address: "서울",
    position: { lat: 37.501, lng: 127.0 },
    distance: 120,
    placeUrl: "https://place.map.kakao.com/1",
    ...over,
  };
}

describe("카카오 음식점 → 후보", () => {
  it("카테고리, 업종 문자열, 카카오 거리를 쓰고 우리 집계는 비어 있다(콜드 스타트)", () => {
    const c = toCandidate(place(), center);
    expect(c).toEqual({
      id: "1",
      name: "정담국밥",
      category: "gukbap",
      categoryText: "한식 > 국밥",
      distanceM: 120,
      priceReport: null,
      thumbs: { up: 0, down: 0 },
      closedReports: 0,
      waiting: null,
      deal: null,
    });
  });

  it("카카오 거리가 없으면 기준점에서 직선거리를 잰다", () => {
    const c = toCandidate(place({ distance: null }), center);
    expect(c.distanceM).toBeGreaterThan(105);
    expect(c.distanceM).toBeLessThan(118);
  });

  it("주소와 좌표, 카카오맵 링크는 후보에 들어가지 않는다", () => {
    const c = toCandidate(place(), center);
    expect(Object.keys(c)).not.toContain("address");
    expect(Object.keys(c)).not.toContain("position");
    expect(Object.keys(c)).not.toContain("placeUrl");
  });

  it("집계가 있으면 붙인다", () => {
    const [c] = toCandidates([place()], center, () => ({
      priceReport: { medianKRW: 9000, count: 2 },
      thumbs: { up: 3, down: 1 },
      closedReports: 0,
      waiting: null,
      deal: { active: true },
    }));
    expect(c?.priceReport).toEqual({ medianKRW: 9000, count: 2 });
    expect(c?.deal).toEqual({ active: true });
  });

  it("직선거리: 위도 0.001도는 약 111m", () => {
    expect(
      straightDistanceM({ lat: 37.5, lng: 127 }, { lat: 37.501, lng: 127 }),
    ).toBeCloseTo(111.2, 0);
  });
});
