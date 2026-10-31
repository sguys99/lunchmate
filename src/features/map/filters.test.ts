import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  categoriesIn,
  filterPlaces,
  isTopRated,
  matchesFilters,
} from "./filters";

const base = {
  category: "hansik" as const,
  priceKRW: 9000,
  walkMinutes: 4,
  thumbs: { up: 0, down: 0 },
  favorite: false,
};

describe("지도 필터 (MAP-03)", () => {
  it("필터가 없으면 모두 통과한다", () => {
    expect(matchesFilters(base, EMPTY_FILTERS)).toBe(true);
  });

  it("카테고리는 고른 하나만", () => {
    const f = { ...EMPTY_FILTERS, category: "ilsik" as const };
    expect(matchesFilters(base, f)).toBe(false);
    expect(matchesFilters({ ...base, category: "ilsik" }, f)).toBe(true);
  });

  it("1만 원 이하는 경계값을 포함한다", () => {
    const f = { ...EMPTY_FILTERS, cheap: true };
    expect(matchesFilters({ ...base, priceKRW: 10_000 }, f)).toBe(true);
    expect(matchesFilters({ ...base, priceKRW: 10_100 }, f)).toBe(false);
  });

  it("도보 5분 안은 5분을 포함한다", () => {
    const f = { ...EMPTY_FILTERS, near: true };
    expect(matchesFilters({ ...base, walkMinutes: 5 }, f)).toBe(true);
    expect(matchesFilters({ ...base, walkMinutes: 6 }, f)).toBe(false);
  });

  it("👍 상위는 후기 3건 이상이고 80% 이상인 곳만", () => {
    expect(isTopRated({ up: 2, down: 0 })).toBe(false); // 100%지만 2건
    expect(isTopRated({ up: 3, down: 0 })).toBe(true);
    expect(isTopRated({ up: 4, down: 1 })).toBe(true); // 80%
    expect(isTopRated({ up: 3, down: 1 })).toBe(false); // 75%
    const f = { ...EMPTY_FILTERS, top: true };
    expect(matchesFilters(base, f)).toBe(false);
  });

  it("즐겨찾기만", () => {
    const f = { ...EMPTY_FILTERS, favorites: true };
    expect(matchesFilters(base, f)).toBe(false);
    expect(matchesFilters({ ...base, favorite: true }, f)).toBe(true);
  });

  it("칩끼리는 모두 만족해야 한다(AND)", () => {
    const f = { ...EMPTY_FILTERS, cheap: true, near: true };
    const places = [
      { ...base, walkMinutes: 3, priceKRW: 8000 },
      { ...base, walkMinutes: 3, priceKRW: 12_000 },
      { ...base, walkMinutes: 8, priceKRW: 8000 },
    ];
    expect(filterPlaces(places, f)).toHaveLength(1);
    expect(activeFilterCount(f)).toBe(2);
    expect(activeFilterCount({ ...f, category: "gogi" })).toBe(3);
  });

  it("카테고리 칩은 목록에 있는 것만, 많은 순", () => {
    expect(
      categoriesIn([
        { category: "ilsik" },
        { category: "hansik" },
        { category: "hansik" },
      ]),
    ).toEqual(["hansik", "ilsik"]);
  });
});
