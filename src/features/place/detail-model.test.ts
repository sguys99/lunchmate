import { describe, expect, it } from "vitest";
import { CATEGORY_PRICE_ESTIMATE } from "./price-estimate";
import {
  detailPrice,
  detailThumbs,
  medianPrice,
  priceRange,
  priceScale,
  quantile,
} from "./detail-model";

describe("가격 범위 (D-10 안건 5)", () => {
  it("제보 1건 이하면 범위가 없다", () => {
    expect(priceRange([])).toBeNull();
    expect(priceRange([9000])).toBeNull();
  });
  it("2~4건이면 최소~최대", () => {
    expect(priceRange([11000, 8000, 9000])).toEqual({
      low: 8000,
      high: 11000,
      kind: "minmax",
    });
  });
  it("5건 이상이면 사분위(가운데 절반)라 이상값 하나가 범위를 넓히지 않는다", () => {
    const r = priceRange([8000, 8500, 9000, 9000, 9000, 9500, 30000]);
    expect(r?.kind).toBe("quartile");
    expect(r?.low).toBe(8800);
    expect(r?.high).toBe(9300);
  });
  it("모든 값이 같으면 범위가 없다", () => {
    expect(priceRange([9000, 9000, 9000, 9000, 9000])).toBeNull();
  });
  it("0, 음수, NaN은 버린다", () => {
    expect(priceRange([0, -1, Number.NaN, 8000, 9000])).toEqual({
      low: 8000,
      high: 9000,
      kind: "minmax",
    });
  });
});

describe("분위수와 중앙값", () => {
  it("선형 보간", () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(quantile([10], 0.25)).toBe(10);
  });
  it("중앙값은 100원 단위", () => {
    expect(medianPrice([8000, 8500])).toBe(8300);
    expect(medianPrice([])).toBeNull();
  });
});

describe("detailPrice (PLACE-02)", () => {
  it("제보가 있으면 중앙값과 제보 수, 예산 판정", () => {
    const p = detailPrice(
      { priceReports: [9000, 8000, 10000] },
      "gukbap",
      "lunch",
      9000,
    );
    expect(p).toMatchObject({
      value: 9000,
      estimate: false,
      reportCount: 3,
      withinBudget: true,
    });
    expect(p.reports).toEqual([8000, 9000, 10000]);
  });
  it("제보가 없으면 카테고리 추정가 + 추정", () => {
    const p = detailPrice({ priceReports: [] }, "ilsik", "dinner", 20000);
    expect(p).toMatchObject({
      value: CATEGORY_PRICE_ESTIMATE.ilsik.dinner,
      estimate: true,
      reportCount: 0,
      range: null,
      withinBudget: false,
    });
  });
});

describe("detailThumbs (PLACE-03, D-10 안건 3, 4)", () => {
  it("후기 3건 미만이면 비율을 숨긴다", () => {
    expect(detailThumbs({ up: 2, down: 0 })).toMatchObject({
      total: 2,
      percent: null,
      filledCells: 0,
    });
  });
  it("3건부터 비율과 10칸 미터 칸 수", () => {
    expect(detailThumbs({ up: 20, down: 3 })).toMatchObject({
      total: 23,
      percent: 87,
      filledCells: 9,
    });
    expect(detailThumbs({ up: 3, down: 0 })).toMatchObject({
      percent: 100,
      filledCells: 10,
    });
    expect(detailThumbs({ up: 0, down: 3 })).toMatchObject({
      percent: 0,
      filledCells: 0,
    });
  });
});

describe("priceScale", () => {
  it("기본 5천~2만 원, 바깥 값이 있으면 넓힌다", () => {
    expect(priceScale({ value: 9000, reports: [] }, 10000)).toEqual({
      min: 5000,
      max: 20000,
    });
    expect(priceScale({ value: 25000, reports: [4200] }, 10000)).toEqual({
      min: 4000,
      max: 25000,
    });
  });
});
