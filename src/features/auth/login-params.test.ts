import { describe, expect, it } from "vitest";
import { loginContext, parseLoginParams } from "./login-params";

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
