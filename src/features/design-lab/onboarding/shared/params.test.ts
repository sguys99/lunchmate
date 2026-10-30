import { describe, expect, it } from "vitest";
import { parseOnboardingParams } from "./params";

describe("parseOnboardingParams", () => {
  it("기본은 1단계, 정상, 권한 허용, 핀 없음", () => {
    expect(parseOnboardingParams({})).toEqual({
      step: 1,
      state: "ready",
      permDenied: false,
      pinPlaced: false,
    });
  });

  it("2단계 이후는 핀을 놓은 상태로 연다", () => {
    expect(parseOnboardingParams({ step: "2" }).pinPlaced).toBe(true);
    expect(parseOnboardingParams({ step: "done" }).step).toBe("done");
  });

  it("상태, 권한, 핀 쿼리를 읽는다", () => {
    const p = parseOnboardingParams(
      new URLSearchParams("state=offline&perm=denied&pin=placed&step=9"),
    );
    expect(p).toEqual({
      step: 1,
      state: "offline",
      permDenied: true,
      pinPlaced: true,
    });
  });
});
