// robots.txt와 sitemap.xml 내용 (T4.28, PRD APP-04). app/robots.ts, app/sitemap.ts가 쓰는 순수 함수.
//
// - 사이트맵은 랜딩(/)과 약관 3종(/terms, /privacy, /location). 약관은 T10.3 최종본(2026-11-16 시행, D-27)부터
//   noindex를 풀고 여기에 더했다. 약관 페이지는 auth 플래그가 꺼진 환경에서 404이므로, 플래그를 다시 끄면 여기서도 뺀다.
// - 베타 환영 페이지(/beta)는 막지 않는다. 페이지의 noindex 메타를 크롤러가 읽어야 색인에서 빠지기 때문이다. 사이트맵에도 넣지 않는다.
// - 막는 경로: 시안(/design-lab), 인증 처리(/auth), 로그인(/login), 약관 동의와 온보딩(/welcome), 나(/me),
//   투표(/poll, 초대 링크 /poll/<code> 포함, 초대 코드 보유자만 보는 곳), 관리자(/admin), 서버 함수(/api).
//   오늘과 지도(/today, /map)는 비로그인 둘러보기라 열려 있지만 (app) 레이아웃이 noindex라 사이트맵에 넣지 않는다.
// - robots.txt는 접근 제어가 아니다. 보호는 proxy와 RLS가 한다.
import type { MetadataRoute } from "next";

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
