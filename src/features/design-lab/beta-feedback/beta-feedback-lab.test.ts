// 베타 의견 시안 쿼리 해석 (T9.4). 경로 지우기 테스트는 src/features/beta-feedback/beta-feedback.test.ts로 옮겼다.
import { describe, expect, it } from "vitest";
import { parseBetaFeedbackParams } from "./params";

describe("parseBetaFeedbackParams", () => {
  it("기본값", () => {
    const p = parseBetaFeedbackParams({});
    expect(p).toMatchObject({ state: "ready", fail: "send", view: null, flow: "compose", step: 2, cat: "bug" });
  });
  it("값 해석", () => {
    const p = parseBetaFeedbackParams({ state: "error", fail: "limit", view: "entry", step: "1", cat: "IDEA" });
    expect(p).toMatchObject({ state: "error", fail: "limit", view: "entry", step: 1, cat: "idea" });
  });
});
