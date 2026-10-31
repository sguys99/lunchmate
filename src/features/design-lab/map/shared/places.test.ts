import { describe, expect, it } from "vitest";
import {
  ALLEY_IDS,
  EMPTY_FILTERS,
  MAP_PLACES,
  activeFilterCount,
  categoriesIn,
  filterPlaces,
  groupMarkers,
  offsetToLatLng,
  radiusMeters,
} from "./places";

describe("radiusMeters", () => {
  it("도보 분 x 67 ÷ 1.3 (CLAUDE.md 8장)", () => {
    expect(radiusMeters(10)).toBe(515);
    expect(radiusMeters(15)).toBe(773);
  });
});

describe("목업 위치", () => {
  it("모든 식당은 도보 분에 맞는 반경 안에 있다", () => {
    for (const p of MAP_PLACES) {
      const d = Math.hypot(p.at.x, p.at.y);
      expect(d).toBeLessThanOrEqual(radiusMeters(p.walkMinutes) + 1);
    }
  });
});

describe("filterPlaces", () => {
  it("걷는 거리 밖(술집 12분)은 빼고 가까운 순으로 둔다", () => {
    const list = filterPlaces(MAP_PLACES, EMPTY_FILTERS, 10);
    expect(list.some((p) => p.id === "mock-pub")).toBe(false);
    const minutes = list.map((p) => p.walkMinutes);
    expect(minutes).toEqual([...minutes].sort((a, b) => a - b));
  });

  it("필터는 모두 함께 건다(그리고)", () => {
    const list = filterPlaces(
      MAP_PLACES,
      { ...EMPTY_FILTERS, cheap: true, top: true },
      10,
    );
    expect(list.length).toBeGreaterThan(0);
    for (const p of list) {
      expect(p.priceKRW).toBeLessThanOrEqual(10_000);
      expect(p.thumbsUpRate).not.toBeNull();
      expect(p.thumbsUpRate ?? 0).toBeGreaterThanOrEqual(80);
    }
  });

  it("카테고리와 즐겨찾기", () => {
    const hansik = filterPlaces(MAP_PLACES, {
      ...EMPTY_FILTERS,
      category: "hansik",
    });
    expect(hansik.every((p) => p.category === "hansik")).toBe(true);
    const fav = filterPlaces(MAP_PLACES, { ...EMPTY_FILTERS, favorites: true });
    expect(fav.every((p) => p.favorite)).toBe(true);
  });

  it("조건에 맞는 곳이 없으면 빈 목록", () => {
    expect(
      filterPlaces(MAP_PLACES, {
        ...EMPTY_FILTERS,
        category: "pub",
        near: true,
      }),
    ).toEqual([]);
  });
});

describe("activeFilterCount, categoriesIn", () => {
  it("켠 필터 수를 센다", () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
    expect(
      activeFilterCount({ ...EMPTY_FILTERS, category: "ilsik", near: true }),
    ).toBe(2);
  });
  it("목록에 있는 카테고리만 한 번씩", () => {
    const cats = categoriesIn(filterPlaces(MAP_PLACES, EMPTY_FILTERS));
    expect(new Set(cats).size).toBe(cats.length);
    expect(cats).not.toContain("pub");
  });
});

describe("groupMarkers", () => {
  const all = filterPlaces(MAP_PLACES, EMPTY_FILTERS);

  it("골목 세 곳은 하나로 묶는다", () => {
    const g = groupMarkers(all, false, null);
    expect([...(g.cluster?.ids ?? [])].sort()).toEqual([...ALLEY_IDS].sort());
    expect(g.singles.some((p) => ALLEY_IDS.includes(p.id))).toBe(false);
  });

  it("펼쳤거나 고른 식당이 골목 안이면 묶지 않는다", () => {
    expect(groupMarkers(all, true, null).cluster).toBeNull();
    expect(groupMarkers(all, false, "alley-udon").cluster).toBeNull();
  });

  it("골목이 1곳만 남으면 묶지 않는다", () => {
    const one = all.filter(
      (p) => !ALLEY_IDS.includes(p.id) || p.id === "alley-udon",
    );
    expect(groupMarkers(one, false, null).cluster).toBeNull();
  });
});

describe("offsetToLatLng", () => {
  it("남쪽(+y)은 위도가 줄고 동쪽(+x)은 경도가 는다", () => {
    const o = { lat: 37.5665, lng: 126.978 };
    const p = offsetToLatLng(o, { x: 100, y: 100 });
    expect(p.lat).toBeLessThan(o.lat);
    expect(p.lng).toBeGreaterThan(o.lng);
  });
});
