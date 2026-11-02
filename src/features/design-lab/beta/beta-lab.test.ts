// 베타 환영 시안 쿼리 해석 (T9.3).
import { describe, expect, it } from "vitest";
import { betaLabCopy } from "@/copy/design-lab-beta";
import { BETA_LOGIN_HREF, installTarget, isKakao, parseBetaParams } from "./params";

describe("parseBetaParams", () => {
  it("기본은 카카오톡 아이폰(초대 링크를 처음 여는 곳)", () => {
    expect(parseBetaParams({})).toMatchObject({ state: "ready", device: "kakao-ios", card: 1, open: "install", others: false });
  });
  it("모르는 값은 기본값", () => {
    expect(parseBetaParams({ device: "symbian", card: "9", open: "x" })).toMatchObject({ device: "kakao-ios", card: 1, open: "install" });
  });
  it("기기와 설치 방법", () => {
    expect(isKakao("kakao-android")).toBe(true);
    expect(installTarget("kakao-android")).toBe("android");
    expect(installTarget("desktop")).toBe("desktop");
  });
});

describe("베타 로그인 주소", () => {
  it("내부 경로만 쓴다", () => {
    const u = new URL(BETA_LOGIN_HREF, "https://lunchmate-kr.vercel.app");
    expect(u.origin).toBe("https://lunchmate-kr.vercel.app");
    expect(u.pathname).toBe("/login");
    expect(u.searchParams.get("next")).toBe("/today");
  });
  it("외부 브라우저 안내는 카카오톡 메뉴 위치를 OS별로 말한다", () => {
    expect(betaLabCopy.steps.external.body("ios")).toContain("오른쪽 아래");
    expect(betaLabCopy.steps.external.body("android")).toContain("오른쪽 위");
  });
});
