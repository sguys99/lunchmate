import { describe, expect, it } from "vitest";
import { DISALLOWED_PATHS, robotsFor, sitemapFor } from "./seo";

const BASE = "https://example.test";

/** robots.txt 규칙처럼 접두사로 막히는지 본다 */
function blocked(path: string): boolean {
  return DISALLOWED_PATHS.some((p) => path.startsWith(p));
}

describe("robotsFor", () => {
  it("사이트맵 주소를 기준 URL로 만든다", () => {
    expect(robotsFor(BASE).sitemap).toBe(`${BASE}/sitemap.xml`);
  });

  it("비공개, 로그인, 시안 경로를 막는다 (T4.28)", () => {
    for (const p of [
      "/design-lab",
      "/design-lab/landing/b",
      "/auth/callback",
      "/auth/sign-in",
      "/login",
      "/welcome/terms",
      "/welcome/onboarding",
      "/me",
      "/me/account",
      "/poll",
      "/poll/abcdefghij",
      "/admin",
      "/api/og",
    ]) {
      expect(blocked(p), p).toBe(true);
    }
  });

  it("랜딩과 약관은 열어 둔다", () => {
    for (const p of ["/", "/terms", "/privacy", "/location"]) {
      expect(blocked(p), p).toBe(false);
    }
  });
});

describe("sitemapFor", () => {
  it("랜딩과 약관 3종을 넣는다(T10.3 최종본부터 색인 허용)", () => {
    const urls = sitemapFor(BASE).map((e) => e.url);
    expect(urls).toEqual([
      `${BASE}/`,
      `${BASE}/terms`,
      `${BASE}/privacy`,
      `${BASE}/location`,
    ]);
    for (const u of urls) expect(blocked(new URL(u).pathname)).toBe(false);
  });

  it("베타 환영 페이지와 앱 경로는 넣지 않는다", () => {
    const paths = sitemapFor(BASE).map((e) => new URL(e.url).pathname);
    for (const p of ["/beta", "/today", "/map", "/login"]) {
      expect(paths, p).not.toContain(p);
    }
  });
});
