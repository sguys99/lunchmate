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
    for (const p of ["/", "/terms", "/privacy"]) {
      expect(blocked(p), p).toBe(false);
    }
  });
});

describe("sitemapFor", () => {
  it("랜딩만 넣는다(약관 초안은 noindex)", () => {
    const urls = sitemapFor(BASE).map((e) => e.url);
    expect(urls).toEqual([`${BASE}/`]);
    for (const u of urls) expect(blocked(new URL(u).pathname)).toBe(false);
  });
});
