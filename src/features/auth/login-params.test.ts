import { describe, expect, it } from "vitest";
import {
  loginContext,
  parseLoginParams,
  parseLoginView,
  resolveInAppEnv,
} from "./login-params";

describe("parseLoginParams", () => {
  it("초대 링크 복귀를 지킨다 (AUTH-03)", () => {
    expect(parseLoginParams({ next: "/poll/AbCdEf1234" })).toEqual({
      next: "/poll/AbCdEf1234",
      context: "poll",
      error: null,
    });
  });
  it("외부 주소는 기본 경로", () => {
    expect(parseLoginParams({ next: "https://evil.com" }).next).toBe("/today");
    expect(parseLoginParams({ next: ["//evil.com", "/me"] }).next).toBe(
      "/today",
    );
  });
  it("오류는 cancelled 아니면 failed로만", () => {
    expect(parseLoginParams({ error: "cancelled" }).error).toBe("cancelled");
    expect(parseLoginParams({ error: "<script>" }).error).toBe("failed");
    expect(parseLoginParams({}).error).toBeNull();
  });
});

describe("loginContext", () => {
  it.each([
    ["/poll/AbCdEf1234", "poll"],
    ["/poll", "default"],
    ["/poll/new", "default"],
    ["/me", "me"],
    ["/me/settings", "me"],
    ["/today", "default"],
  ] as const)("%s → %s", (next, ctx) => {
    expect(loginContext(next)).toBe(ctx);
  });
});

describe("resolveInAppEnv (T4.10)", () => {
  const kakaoIos =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.5";
  it("UA로 판정한다", () => {
    expect(resolveInAppEnv({}, kakaoIos, false)).toEqual({
      inApp: "kakaotalk",
      os: "ios",
    });
    expect(resolveInAppEnv({}, null, false)).toEqual({
      inApp: null,
      os: null,
    });
  });
  it("쿼리 흉내는 개발 환경(allowOverride)에서만", () => {
    const q = { inapp: "instagram", os: "android" };
    expect(resolveInAppEnv(q, null, false).inApp).toBeNull();
    expect(resolveInAppEnv(q, null, true)).toEqual({
      inApp: "instagram",
      os: "android",
    });
    expect(resolveInAppEnv({ inapp: "evil" }, null, true).inApp).toBeNull();
  });
  it("view=inapp만 안내 화면", () => {
    expect(parseLoginView({ view: "inapp" })).toBe("inapp");
    expect(parseLoginView({ view: "x" })).toBe("login");
  });
});
