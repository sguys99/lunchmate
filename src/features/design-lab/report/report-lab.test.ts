import { describe, expect, it } from "vitest";
import { dateAfter, UNTIL_OPTIONS } from "./mock";
import { parseReportParams } from "./params";

describe("parseReportParams", () => {
  it("기본값", () => {
    expect(parseReportParams({})).toEqual({
      state: "ready",
      flow: "none",
      phase: "form",
      error: null,
      kind: "closed",
      target: "review",
      step: 1,
      menu: false,
    });
  });

  it("쿼리를 읽고 모르는 값은 기본값으로", () => {
    expect(
      parseReportParams({
        state: "offline",
        flow: "DEAL",
        phase: "dup",
        error: "banned-word",
        kind: "price",
        target: "deal",
        step: "3",
        menu: "open",
      }),
    ).toEqual({
      state: "offline",
      flow: "deal",
      phase: "dup",
      error: "banned-word",
      kind: "price",
      target: "deal",
      step: 3,
      menu: true,
    });
    expect(
      parseReportParams({ flow: "x", phase: "y", error: "z", kind: "w", step: "9" }),
    ).toMatchObject({
      flow: "none",
      phase: "form",
      error: null,
      kind: "closed",
      step: 4,
    });
  });
});

describe("종료일 선택지 (DEAL-01)", () => {
  it("기본 7일, 최대 30일", () => {
    expect(UNTIL_OPTIONS.map((o) => o.days)).toContain(7);
    expect(Math.max(...UNTIL_OPTIONS.map((o) => o.days))).toBe(30);
  });

  it("목업 오늘(10월 31일)에서 날짜를 센다", () => {
    expect(dateAfter(7)).toBe("11월 7일");
    expect(dateAfter(30)).toBe("11월 30일");
  });
});
