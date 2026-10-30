// robots.txt와 sitemap.xml 내용 (T4.28, PRD APP-04). app/robots.ts, app/sitemap.ts가 쓰는 순수 함수.
//
// - 사이트맵은 랜딩(/) 하나. 약관(/terms)과 개인정보 처리방침(/privacy)은 초안이라 noindex이고 auth 플래그가 꺼진
//   프로덕션에서는 404다. 최종 전문으로 noindex를 풀 때(T4.14 이후) 여기에 더한다.
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

export function sitemapFor(base: string): MetadataRoute.Sitemap {
  return [{ url: `${base}/`, changeFrequency: "weekly", priority: 1 }];
}
