// robots.txt와 sitemap.xml 내용 (T4.28, PRD APP-04). app/robots.ts, app/sitemap.ts가 쓰는 순수 함수.
//
// - 사이트맵은 랜딩(/)과 약관 3종(/terms, /privacy, /location). 약관은 T10.3 최종본(2026-11-16 시행, D-27)부터
//   noindex를 풀고 여기에 더했다. 약관 페이지는 auth 플래그가 꺼진 환경에서 404이므로, 플래그를 다시 끄면 여기서도 뺀다.
// - 베타 환영 페이지(/beta)는 막지 않는다. 페이지의 noindex 메타를 크롤러가 읽어야 색인에서 빠지기 때문이다. 사이트맵에도 넣지 않는다.
// - 막는 경로: 시안(/design-lab), 인증 처리(/auth), 로그인(/login), 약관 동의와 온보딩(/welcome), 나(/me),
//   투표(/poll, 초대 링크 /poll/<code> 포함, 초대 코드 보유자만 보는 곳), 관리자(/admin), 서버 함수(/api).
//   오늘과 지도(/today, /map)는 비로그인 둘러보기라 열려 있지만 (app) 레이아웃이 noindex라 사이트맵에 넣지 않는다.
// - robots.txt는 접근 제어가 아니다. 보호는 proxy와 RLS가 한다.
// - lastModified는 넣지 않는다(T10.11). 날짜를 코드에 고정하면 고칠 때마다 손으로 바꿔야 하고, 빌드 시각을 쓰면 내용이 그대로여도
//   배포마다 바뀌어 구글이 lastmod를 믿지 않게 된다. changeFrequency, priority는 구글이 무시하지만 다른 검색엔진용으로 둔다.
import type { Metadata, MetadataRoute } from "next";

export const DISALLOWED_PATHS = [
  "/design-lab",
  "/auth/",
  "/login",
  "/welcome",
  "/me",
  "/poll",
  "/admin",
  "/api/",
] as const;

export function robotsFor(base: string): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [...DISALLOWED_PATHS] }],
    sitemap: `${base}/sitemap.xml`,
  };
}

/** 사이트맵에 넣는 약관 문서 경로 */
export const LEGAL_PATHS = ["/terms", "/privacy", "/location"] as const;

export function sitemapFor(base: string): MetadataRoute.Sitemap {
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    ...LEGAL_PATHS.map((p) => ({
      url: `${base}${p}`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}

// ── T10.11 구조화 데이터, 약관 메타, 검색 등록 확인 ──────────────────────────────────────────────

/**
 * 랜딩 JSON-LD(schema.org WebApplication). 사실만 넣는다: 가격, 무료 표기(사용자 결정으로 넣지 않음),
 * 평점, 리뷰 수처럼 지어낼 수 있는 값은 넣지 않는다. 이 둘이 없으면 구글 리치 결과(소프트웨어 앱)는 뜨지 않지만
 * 이름, 주소, 설명을 검색엔진에 분명히 알리는 용도로 충분하다.
 */
export function landingJsonLd(input: {
  base: string;
  name: string;
  description: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: input.name,
    url: `${input.base}/`,
    description: input.description,
    inLanguage: "ko-KR",
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript",
  };
}

/**
 * <script type="application/ld+json"> 본문. `<`를 유니코드 이스케이프해 문자열 안의 `</script>`로
 * 태그가 닫히지 않게 한다(Next.js 공식 문서 guides/json-ld "Rendering JSON-LD").
 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** 루트 app/opengraph-image(랜딩 OG) 주소. 파일 규칙 경로라 정적이다 */
export const SITE_OG_IMAGE_PATH = "/opengraph-image";

/**
 * 약관 3종 공통 메타: canonical, 설명, Open Graph, Twitter.
 * 하위 페이지가 openGraph를 정하면 루트 opengraph-image 파일 규칙의 이미지가 빠지므로(2026-11-02 dev 응답으로 확인)
 * 랜딩 OG 이미지를 직접 넣는다.
 */
export function legalPageMetadata(input: {
  path: (typeof LEGAL_PATHS)[number];
  title: string;
  description: string;
  siteName: string;
  image: { width: number; height: number; alt: string };
}): Metadata {
  const image = { url: SITE_OG_IMAGE_PATH, type: "image/png", ...input.image };
  const fullTitle = `${input.title} | ${input.siteName}`;
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      url: input.path,
      siteName: input.siteName,
      title: fullTitle,
      description: input.description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: input.description,
      images: [image],
    },
  };
}

/**
 * 검색 등록 소유 확인 메타(구글 Search Console, 네이버 서치어드바이저, docs/launch-ops.md 4장).
 * 값은 서버 환경변수 GOOGLE_SITE_VERIFICATION, NAVER_SITE_VERIFICATION. 비어 있으면 그 메타를 넣지 않는다.
 * 둘 다 비면 undefined를 돌려 metadata.verification 자체를 생략한다.
 */
export function siteVerification(source: {
  GOOGLE_SITE_VERIFICATION?: string;
  NAVER_SITE_VERIFICATION?: string;
}): Metadata["verification"] {
  const google = source.GOOGLE_SITE_VERIFICATION?.trim();
  const naver = source.NAVER_SITE_VERIFICATION?.trim();
  if (!google && !naver) return undefined;
  return {
    ...(google ? { google } : {}),
    ...(naver ? { other: { "naver-site-verification": naver } } : {}),
  };
}
