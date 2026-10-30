import { describe, expect, it } from "vitest";
import {
  decideProxy,
  hasSessionCookie,
  isLoginPath,
  isProtectedPath,
  isTermsGatedPath,
  termsUrl,
} from "./routes";

describe("isProtectedPath (T4.8)", () => {
  it.each([
    "/me",
    "/me/settings",
    "/poll",
    "/poll/",
    "/poll/new",
    "/poll/new/x",
    "/welcome/terms",
    "/admin",
    "/admin/places",
  ])("로그인 필요: %s", (p) => expect(isProtectedPath(p)).toBe(true));
  it.each([
    "/",
    "/today",
    "/today/x",
    "/map",
    "/poll/AbCdEf1234",
    "/login",
    "/auth/callback",
    "/design-lab/auth/b",
    "/meet",
    "/polls",
    "/administrator",
  ])("열림: %s", (p) => expect(isProtectedPath(p)).toBe(false));
});

describe("isLoginPath", () => {
  it("로그인 화면만", () => {
    expect(isLoginPath("/login")).toBe(true);
    expect(isLoginPath("/login/")).toBe(true);
    expect(isLoginPath("/login/x")).toBe(false);
  });
});

describe("decideProxy", () => {
  const base = { search: "", nextParam: null };
  it("보호 경로 + 비로그인 → /login?next=경로(쿼리 포함)", () => {
    expect(
      decideProxy({
        ...base,
        pathname: "/me",
        search: "?tab=1",
        signedIn: false,
      }),
    ).toEqual({
      type: "redirect",
      location: "/login?next=%2Fme%3Ftab%3D1",
    });
  });
  it("보호 경로 + 로그인 → 통과", () => {
    expect(decideProxy({ ...base, pathname: "/me", signedIn: true })).toEqual({
      type: "pass",
    });
  });
  it("둘러보기 경로는 비로그인도 통과", () => {
    expect(
      decideProxy({ ...base, pathname: "/today", signedIn: false }),
    ).toEqual({ type: "pass" });
    expect(
      decideProxy({ ...base, pathname: "/poll/AbCdEf1234", signedIn: false }),
    ).toEqual({ type: "pass" });
  });
  it("/login + 로그인 → 검사한 next로", () => {
    expect(
      decideProxy({
        ...base,
        pathname: "/login",
        nextParam: "/poll/AbCdEf1234",
        signedIn: true,
      }),
    ).toEqual({ type: "redirect", location: "/poll/AbCdEf1234" });
    expect(
      decideProxy({
        ...base,
        pathname: "/login",
        nextParam: "//evil.com",
        signedIn: true,
      }),
    ).toEqual({ type: "redirect", location: "/today" });
  });
  it("랜딩 + 로그인 → /today, 비로그인 → 통과 (T4.28)", () => {
    expect(
      decideProxy({
        ...base,
        pathname: "/",
        search: "?utm_source=x",
        signedIn: true,
      }),
    ).toEqual({ type: "redirect", location: "/today" });
    expect(decideProxy({ ...base, pathname: "/", signedIn: false })).toEqual({
      type: "pass",
    });
  });
  it("/login + 비로그인 → 통과", () => {
    expect(
      decideProxy({ ...base, pathname: "/login", signedIn: false }),
    ).toEqual({ type: "pass" });
  });
});

describe("hasSessionCookie", () => {
  it("Supabase 세션 쿠키(분할 포함)만 본다", () => {
    expect(hasSessionCookie(["sb-abc-auth-token"])).toBe(true);
    expect(
      hasSessionCookie(["sb-abc-auth-token.0", "sb-abc-auth-token.1"]),
    ).toBe(true);
    expect(hasSessionCookie(["sb-abc-auth-token-code-verifier"])).toBe(false);
    expect(hasSessionCookie(["lm_auth_next", "ph_x"])).toBe(false);
    expect(hasSessionCookie([])).toBe(false);
  });
});

describe("isTermsGatedPath (T4.11)", () => {
  it.each([
    "/today",
    "/map",
    "/poll",
    "/poll/abc123defg",
    "/poll/new",
    "/me",
    "/me/account",
    "/admin",
  ])("동의 확인: %s", (p) => expect(isTermsGatedPath(p)).toBe(true));
  it.each([
    "/",
    "/login",
    "/welcome/terms",
    "/auth/sign-out",
    "/terms",
    "/privacy",
    "/design-lab",
    "/todays",
  ])("확인 안 함: %s", (p) => expect(isTermsGatedPath(p)).toBe(false));
  it("약관 주소는 next를 검사해 싣는다", () => {
    expect(termsUrl("/poll/abc?x=1")).toBe(
      "/welcome/terms?next=%2Fpoll%2Fabc%3Fx%3D1",
    );
    expect(termsUrl("//evil.com")).toBe("/welcome/terms?next=%2Ftoday");
  });
});
