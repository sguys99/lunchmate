import { describe, expect, it } from "vitest";
import { detectInAppUserAgent, detectOs, parseAuthParams } from "./params";

describe("parseAuthParams", () => {
  it("쿼리가 없으면 로그인 유도, 정상, 인앱 아님, iOS, 투표, 카카오", () => {
    expect(parseAuthParams({})).toEqual({
      view: "prompt",
      state: "ready",
      inApp: null,
      os: "ios",
      trigger: "poll",
      provider: "kakao",
    });
  });

  it("view=inapp인데 inapp이 없으면 카카오톡으로 본다", () => {
    expect(parseAuthParams({ view: "inapp" }).inApp).toBe("kakao");
  });

  it("모르는 값은 기본값으로 돌린다", () => {
    const p = parseAuthParams(
      new URLSearchParams("view=x&inapp=line&os=win&trigger=y&provider=z"),
    );
    expect(p).toMatchObject({
      view: "prompt",
      inApp: null,
      os: "ios",
      trigger: "poll",
      provider: "kakao",
    });
  });

  it("대소문자와 배열 값을 처리한다", () => {
    const p = parseAuthParams({
      view: ["Terms", "inapp"],
      state: "Offline",
      inapp: "INSTAGRAM",
      os: "android",
    });
    expect(p).toMatchObject({
      view: "terms",
      state: "offline",
      inApp: "instagram",
      os: "android",
    });
  });
});

describe("UA 판정", () => {
  it("카카오톡, 인스타그램, 네이버 앱을 구분한다", () => {
    expect(
      detectInAppUserAgent(
        "Mozilla/5.0 (Linux; Android 14; wv) KAKAOTALK 10.8.0",
      ),
    ).toBe("kakao");
    expect(detectInAppUserAgent("Mozilla/5.0 Instagram 300.0")).toBe(
      "instagram",
    );
    expect(detectInAppUserAgent("Mozilla/5.0 NAVER(inapp; search; 1000)")).toBe(
      "naver",
    );
    expect(detectInAppUserAgent("Mozilla/5.0 Safari/605.1.15")).toBeNull();
  });

  it("OS를 구분한다", () => {
    expect(detectOs("Linux; Android 14")).toBe("android");
    expect(detectOs("iPhone; CPU iPhone OS 18_0")).toBe("ios");
    expect(detectOs("Macintosh")).toBeNull();
  });
});
