import { describe, expect, it } from "vitest";
import { CATEGORY_SLUGS } from "./categories";
import {
  CATEGORY_PRICE_ESTIMATE,
  priceBadge,
  resolvePrice,
} from "./price-estimate";

describe("카테고리 추정 가격 (T5.13, PLACE-02)", () => {
  it("12종 모두 점심, 저녁 추정가가 천 원 단위 양수다", () => {
    for (const slug of CATEGORY_SLUGS) {
      for (const meal of ["lunch", "dinner"] as const) {
        const v = CATEGORY_PRICE_ESTIMATE[slug][meal];
        expect(v).toBeGreaterThan(0);
        expect(v % 1000).toBe(0);
      }
    }
  });

  it("제보 중앙값이 있으면 그 값, 추정 배지 없음", () => {
    const p = resolvePrice({ medianKRW: 9_500, count: 4 }, "hansik", "lunch");
    expect(p).toEqual({ priceKRW: 9_500, source: "report", reportCount: 4 });
    expect(priceBadge(p)).toBeNull();
  });

  it("제보가 없으면 끼니별 카테고리 추정가와 추정 배지", () => {
    const lunch = resolvePrice(null, "ilsik", "lunch");
    const dinner = resolvePrice({ medianKRW: 0, count: 0 }, "ilsik", "dinner");
    expect(lunch).toEqual({
      priceKRW: 13_000,
      source: "estimate",
      reportCount: 0,
    });
    expect(dinner.priceKRW).toBe(25_000);
    expect(priceBadge(lunch)).toEqual({ kind: "estimate" });
  });

  it("값이 이상한 제보는 없는 것으로 본다", () => {
    expect(
      resolvePrice({ medianKRW: Number.NaN, count: 2 }, "bunsik", "lunch")
        .source,
    ).toBe("estimate");
  });
});
