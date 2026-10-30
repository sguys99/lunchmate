import { describe, expect, it } from "vitest";
import {
  DEFAULT_NEXT,
  NEXT_MAX_LENGTH,
  parseInternalPath,
  sanitizeNext,
} from "./redirect";

describe("sanitizeNext (AUTH-03, 오픈 리다이렉트 방지)", () => {
  it.each([
    ["/today", "/today"],
    ["/poll/AbCdEf1234", "/poll/AbCdEf1234"],
    ["/poll/AbCdEf1234?from=share", "/poll/AbCdEf1234?from=share"],
    ["/map?lat=1", "/map?lat=1"],
    ["/me#settings", "/me"],
    ["/today/../me", "/me"],
    ["/%ED%88%AC%ED%91%9C", "/%ED%88%AC%ED%91%9C"],
    ["/search?q=https://example.com", "/search?q=https://example.com"],
  ])("내부 경로 %s → %s", (raw, expected) => {
    expect(sanitizeNext(raw)).toBe(expected);
  });

  it.each([
    // 외부 주소, 스킴
    "https://evil.com",
    "http://evil.com/today",
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,hi",
    "mailto:a@b.c",
    "evil.com",
    "today",
    "",
    " /today",
    // 프로토콜 상대 주소
    "//evil.com",
    "///evil.com",
    "//evil.com/today",
    // 역슬래시 (브라우저가 /로 바꾼다)
    "/\\evil.com",
    "\\\\evil.com",
    "/\\/evil.com",
    "/today\\..\\x",
    // 제어 문자 (브라우저 URL 파서가 지운다)
    "/\t/evil.com",
    "/\n/evil.com",
    "/\r/evil.com",
    "/\u0000/evil.com",
    "/today\u007f",
    // 점 구간 정규화로 // 가 되는 경우
    "/.//evil.com",
    "/%2e%2e//evil.com",
    "/./%2e//evil.com",
  ])("거부: %j → 기본 경로", (raw) => {
    expect(sanitizeNext(raw)).toBe(DEFAULT_NEXT);
  });

  it("문자열이 아니면 기본 경로", () => {
    for (const raw of [undefined, null, 1, {}, ["/me"], true]) {
      expect(sanitizeNext(raw)).toBe(DEFAULT_NEXT);
    }
  });

  it("너무 긴 값은 거부", () => {
    const long = `/${"a".repeat(NEXT_MAX_LENGTH)}`;
    expect(sanitizeNext(long)).toBe(DEFAULT_NEXT);
    const ok = `/${"a".repeat(NEXT_MAX_LENGTH - 1)}`;
    expect(sanitizeNext(ok)).toBe(ok);
  });

  it("로그인 흐름으로 되돌아가는 고리는 기본 경로", () => {
    for (const raw of [
      "/login",
      "/login?next=/me",
      "/login/x",
      "/auth/callback?code=x",
      "/auth",
      "/auth/sign-in",
    ]) {
      expect(sanitizeNext(raw)).toBe(DEFAULT_NEXT);
    }
    // 이름만 비슷한 경로는 통과
    expect(sanitizeNext("/loginhelp")).toBe("/loginhelp");
    expect(sanitizeNext("/authors")).toBe("/authors");
  });

  it("fallback을 바꿀 수 있다", () => {
    expect(sanitizeNext("//evil.com", "/")).toBe("/");
  });

  it("결과는 항상 같은 출처의 절대 URL로 풀린다", () => {
    const base = "https://lunchmate.example";
    for (const raw of [
      "/x",
      "//evil.com",
      "/\\evil.com",
      "/.//evil.com",
      "https://evil.com",
    ]) {
      expect(new URL(sanitizeNext(raw), base).origin).toBe(base);
    }
  });
});

describe("parseInternalPath", () => {
  it("거부하면 null", () => {
    expect(parseInternalPath("//evil.com")).toBeNull();
    expect(parseInternalPath("/ok")).toBe("/ok");
  });
});
