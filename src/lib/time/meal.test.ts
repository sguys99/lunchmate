import { describe, expect, it } from "vitest";

import { fromKstWallTime, getMeal, isLunchPeak, resolveMeal } from "@/lib/time";

const kst = (h: number, m = 0, s = 0, ms = 0) =>
  new Date(fromKstWallTime(2026, 10, 28, h, m).getTime() + s * 1000 + ms);

describe("getMeal (REC-01)", () => {
  it("KST 00:00은 점심", () => {
    expect(getMeal(kst(0))).toBe("lunch");
  });

  it("KST 14:59:59.999까지 점심", () => {
    expect(getMeal(kst(14, 59, 59, 999))).toBe("lunch");
  });

  it("KST 15:00부터 저녁", () => {
    expect(getMeal(kst(15))).toBe("dinner");
  });

  it("KST 23:59는 저녁", () => {
    expect(getMeal(kst(23, 59))).toBe("dinner");
  });

  it("UTC 기준 시각이 아니라 KST로 판정한다 (UTC 06:00 = KST 15:00)", () => {
    expect(getMeal(new Date("2026-10-28T06:00:00Z"))).toBe("dinner");
    expect(getMeal(new Date("2026-10-28T05:59:59.999Z"))).toBe("lunch");
  });
});

describe("resolveMeal", () => {
  it("수동 선택이 있으면 그것을 따른다", () => {
    expect(resolveMeal(kst(12), "dinner")).toBe("dinner");
    expect(resolveMeal(kst(19), "lunch")).toBe("lunch");
  });

  it("수동 선택이 없으면 시각으로 판정", () => {
    expect(resolveMeal(kst(12))).toBe("lunch");
    expect(resolveMeal(kst(19), null)).toBe("dinner");
  });
});

describe("isLunchPeak (PLACE-08)", () => {
  it("11:00 시작 포함", () => {
    expect(isLunchPeak(kst(10, 59, 59, 999))).toBe(false);
    expect(isLunchPeak(kst(11))).toBe(true);
  });

  it("13:30 끝 미포함", () => {
    expect(isLunchPeak(kst(13, 29, 59, 999))).toBe(true);
    expect(isLunchPeak(kst(13, 30))).toBe(false);
  });

  it("저녁 시간은 피크 아님", () => {
    expect(isLunchPeak(kst(18))).toBe(false);
  });
});
