import { describe, expect, it } from "vitest";
import {
  DETAIL_EMPTY,
  DETAIL_FULL,
  DETAIL_SPARSE,
  medianPrice,
  representativePrice,
} from "./detail-mock";
import { parsePlaceParams } from "./params";

describe("parsePlaceParams", () => {
  it("기본값", () => {
    expect(parsePlaceParams({})).toEqual({
      state: "ready",
      fail: "fetch",
      from: null,
      data: "full",
      snap: "half",
      poll: false,
    });
  });

  it("쿼리를 읽고 모르는 값은 기본값으로", () => {
    expect(
      parsePlaceParams({
        state: "error",
        fail: "name",
        from: "HOME",
        data: "sparse",
        snap: "full",
        poll: "on",
      }),
    ).toEqual({
      state: "error",
      fail: "name",
      from: "home",
      data: "sparse",
      snap: "full",
      poll: true,
    });
    expect(parsePlaceParams({ from: "sheet", fail: "x" }).from).toBeNull();
  });
});

describe("medianPrice", () => {
  it("홀수 개는 가운데 값", () => {
    expect(medianPrice([9000, 8000, 11000])).toBe(9000);
  });
  it("짝수 개는 가운데 두 값 평균을 500원 단위로 내림", () => {
    expect(medianPrice([8000, 9000, 9500, 12000])).toBe(9000);
  });
  it("제보가 없으면 null", () => {
    expect(medianPrice([])).toBeNull();
  });
});

describe("representativePrice", () => {
  it("제보가 있으면 중앙값, 없으면 추정", () => {
    expect(representativePrice(DETAIL_FULL)).toEqual({
      value: 9000,
      estimate: false,
    });
    expect(representativePrice(DETAIL_SPARSE).estimate).toBe(true);
    expect(representativePrice(DETAIL_EMPTY).estimate).toBe(true);
  });
});

describe("목업 규칙", () => {
  it("태그는 5개 이하, 많은 순", () => {
    for (const d of [DETAIL_FULL, DETAIL_SPARSE, DETAIL_EMPTY]) {
      expect(d.tags.length).toBeLessThanOrEqual(5);
      const counts = d.tags.map((t) => t.count);
      expect(counts).toEqual([...counts].sort((a, b) => b - a));
    }
  });
  it("빈 상태는 후기 0건, 가격 제보 0건", () => {
    expect(DETAIL_EMPTY.reviews).toEqual([]);
    expect(DETAIL_EMPTY.priceReports).toEqual([]);
    expect(DETAIL_EMPTY.thumbs).toEqual({ up: 0, down: 0 });
  });
});
