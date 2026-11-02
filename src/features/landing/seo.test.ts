import { describe, expect, it } from "vitest";
import {
  DISALLOWED_PATHS,
  LEGAL_PATHS,
  landingJsonLd,
  legalPageMetadata,
  robotsFor,
  serializeJsonLd,
  SITE_OG_IMAGE_PATH,
  siteVerification,
  sitemapFor,
} from "./seo";

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

describe("sitemapFor lastModified", () => {
  it("넣지 않는다(정적 날짜와 빌드 시각 모두 의미가 없다, T10.11)", () => {
    for (const e of sitemapFor(BASE)) expect(e.lastModified).toBeUndefined();
  });
});

describe("landingJsonLd (T10.11)", () => {
  const ld = landingJsonLd({
    base: BASE,
    name: "런치메이트",
    description: "설명",
  });

  it("WebApplication 하나, 주소는 기준 URL의 /", () => {
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("WebApplication");
    expect(ld.url).toBe(`${BASE}/`);
    expect(ld.inLanguage).toBe("ko-KR");
  });

  it("가격, 무료 표기, 평점처럼 지어낸 값은 넣지 않는다", () => {
    for (const k of [
      "offers",
      "price",
      "isAccessibleForFree",
      "aggregateRating",
      "review",
    ]) {
      expect(ld, k).not.toHaveProperty(k);
    }
    expect(JSON.stringify(ld)).not.toMatch(/무료|free/i);
  });
});

describe("serializeJsonLd", () => {
  it("<를 이스케이프해 script 태그가 닫히지 않는다", () => {
    const out = serializeJsonLd({ name: "</script><b>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out)).toEqual({ name: "</script><b>" });
  });
});

describe("legalPageMetadata (T10.11)", () => {
  it("canonical, 설명, Open Graph, Twitter를 같은 경로와 제목으로 만든다", () => {
    for (const path of LEGAL_PATHS) {
      const m = legalPageMetadata({
        path,
        title: "이용약관",
        description: "설명입니다.",
        siteName: "런치메이트",
        image: { width: 1200, height: 600, alt: "대체 글" },
      });
      expect(m.alternates?.canonical).toBe(path);
      expect(m.description).toBe("설명입니다.");
      expect(m.openGraph).toMatchObject({
        url: path,
        locale: "ko_KR",
        siteName: "런치메이트",
        title: "이용약관 | 런치메이트",
      });
      expect(m.twitter).toMatchObject({ card: "summary_large_image" });
      // openGraph를 정하면 루트 파일 규칙 이미지가 빠지므로 랜딩 OG를 직접 넣는다
      expect(m.openGraph?.images).toEqual([
        {
          url: SITE_OG_IMAGE_PATH,
          type: "image/png",
          width: 1200,
          height: 600,
          alt: "대체 글",
        },
      ]);
      expect(m.robots).toBeUndefined();
    }
  });
});

describe("siteVerification (T10.11)", () => {
  it("둘 다 비면 생략한다", () => {
    expect(siteVerification({})).toBeUndefined();
    expect(
      siteVerification({
        GOOGLE_SITE_VERIFICATION: " ",
        NAVER_SITE_VERIFICATION: "",
      }),
    ).toBeUndefined();
  });

  it("구글은 google, 네이버는 naver-site-verification 메타로", () => {
    expect(
      siteVerification({
        GOOGLE_SITE_VERIFICATION: "g-token",
        NAVER_SITE_VERIFICATION: "n-token",
      }),
    ).toEqual({
      google: "g-token",
      other: { "naver-site-verification": "n-token" },
    });
  });

  it("한쪽만 있으면 그쪽만", () => {
    expect(siteVerification({ NAVER_SITE_VERIFICATION: "n" })).toEqual({
      other: { "naver-site-verification": "n" },
    });
    expect(siteVerification({ GOOGLE_SITE_VERIFICATION: "g" })).toEqual({
      google: "g",
    });
  });
});
