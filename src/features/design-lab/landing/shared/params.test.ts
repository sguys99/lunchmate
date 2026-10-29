import { describe, expect, it } from "vitest";
import { isKakaoInAppUserAgent, parseLandingParams } from "./params";

describe("parseLandingParams", () => {
  it("쿼리가 없으면 정상, 인앱 아님", () => {
    expect(parseLandingParams({})).toEqual({ state: "ready", inApp: false });
  });

  it("랜딩에 없는 빈 상태는 정상으로 본다", () => {
    expect(parseLandingParams({ state: "empty" }).state).toBe("ready");
  });

  it("오프라인, 오류, 로딩과 인앱을 읽는다", () => {
    expect(
      parseLandingParams(new URLSearchParams("state=offline&inapp=kakao")),
    ).toEqual({ state: "offline", inApp: true });
    expect(parseLandingParams({ state: "error" }).state).toBe("error");
    expect(parseLandingParams({ state: ["loading"] }).state).toBe("loading");
  });
});

describe("isKakaoInAppUserAgent", () => {
  it("카카오톡 UA만 참", () => {
    expect(
      isKakaoInAppUserAgent(
        "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 KAKAOTALK 10.4.0",
      ),
    ).toBe(true);
    expect(isKakaoInAppUserAgent("Mozilla/5.0 (iPhone) Safari/604.1")).toBe(
      false,
    );
  });
});
