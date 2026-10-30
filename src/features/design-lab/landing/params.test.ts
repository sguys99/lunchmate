import { describe, expect, it } from "vitest";
import { parseLandingParams } from "./params";

describe("parseLandingParams", () => {
  it("쿼리가 없으면 정상, 인앱 아님, 플래그 켜짐", () => {
    expect(parseLandingParams({})).toEqual({
      preview: { loading: false, offline: false, inApp: null },
      flagsOff: false,
    });
  });

  it("랜딩에 없는 빈 상태, 오류는 정상으로 본다", () => {
    expect(parseLandingParams({ state: "empty" }).preview).toMatchObject({
      loading: false,
      offline: false,
    });
    expect(parseLandingParams({ state: "error" }).preview).toMatchObject({
      loading: false,
      offline: false,
    });
  });

  it("오프라인, 로딩, 인앱, 플래그 꺼짐을 읽는다", () => {
    expect(
      parseLandingParams(new URLSearchParams("state=offline&inapp=kakao")),
    ).toEqual({
      preview: { loading: false, offline: true, inApp: "kakaotalk" },
      flagsOff: false,
    });
    expect(parseLandingParams({ state: ["loading"] }).preview.loading).toBe(
      true,
    );
    expect(parseLandingParams({ flags: "off" }).flagsOff).toBe(true);
  });
});
