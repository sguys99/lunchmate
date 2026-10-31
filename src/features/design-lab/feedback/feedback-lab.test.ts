// 식후 피드백 시안 쿼리와 가격 칩 (T6.1)
import { describe, expect, it } from "vitest";
import { pricePresets } from "./mock";
import { isNameFail, parseFeedbackParams } from "./params";
import { bandMode, shortWon } from "./shared";

describe("parseFeedbackParams", () => {
  it("기본값은 홈, 묻는 띠, 좋았어요, 1단계", () => {
    expect(parseFeedbackParams({})).toEqual({
      state: "ready",
      fail: "save",
      view: "home",
      flow: "ask",
      answer: "up",
      step: 1,
      mine: false,
    });
  });

  it("쿼리를 읽고 모르는 값은 기본값으로", () => {
    const p = parseFeedbackParams({
      state: "error",
      fail: "NAME",
      view: "detail",
      flow: "edit",
      answer: "skipped",
      step: "3",
      mine: "on",
    });
    expect(p).toMatchObject({ view: "detail", flow: "edit", answer: "skipped", step: 3, mine: true });
    expect(isNameFail(p)).toBe(true);
    expect(parseFeedbackParams({ flow: "x", step: "9", answer: "meh" })).toMatchObject({
      flow: "ask",
      step: 1,
      answer: "up",
    });
  });

  it("띠는 로딩이면 뼈대, 물을 곳 없음과 오프라인은 숨김", () => {
    expect(bandMode(parseFeedbackParams({ state: "loading" }))).toBe("skeleton");
    expect(bandMode(parseFeedbackParams({ state: "empty" }))).toBe("none");
    expect(bandMode(parseFeedbackParams({ state: "offline" }))).toBe("none");
    expect(bandMode(parseFeedbackParams({ state: "error" }))).toBe("live");
  });
});

describe("pricePresets", () => {
  it("추정가를 천 원 단위로 맞춰 가운데 둔다", () => {
    expect(pricePresets(9000, 3)).toEqual([8000, 9000, 10000]);
    expect(pricePresets(9500, 4)).toEqual([9000, 10000, 11000, 12000]);
  });

  it("1천 원 아래로 내려가지 않고 겹치는 값은 하나만", () => {
    expect(pricePresets(800, 3)).toEqual([1000, 2000]);
  });
});

describe("shortWon", () => {
  it("천 원 단위는 짧게, 나머지는 정확히", () => {
    expect(shortWon(9000)).toBe("9천 원");
    expect(shortWon(10000)).toBe("1만 원");
    expect(shortWon(11000)).toBe("1만 1천 원");
    expect(shortWon(9500)).toBe("9,500원");
  });
});
