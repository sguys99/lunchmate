import { readFileSync } from "node:fs";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

// 서비스 워커 버전(T8.4): 빌드마다 바뀌는 값. 등록 주소 /sw.js?v=에 붙어 새 배포 때 새 워커가 설치되고 이전 캐시를 지운다.
// Vercel은 커밋 SHA, 로컬 빌드는 빌드 시각(src/lib/sw/register-script.ts).
const swVersion =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || Date.now().toString(36);

// 앱 버전(T9.4 베타 의견에 함께 보내는 값, src/lib/app-version): package.json version
const appVersion = (
  JSON.parse(readFileSync(`${process.cwd()}/package.json`, "utf8")) as {
    version?: string;
  }
).version;

const nextConfig: NextConfig = {
  /* config options here */
  env: { LM_SW_VERSION: swVersion, LM_APP_VERSION: appVersion ?? "0.0.0" },
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // 탭을 오가며 돌아온 화면(오늘, 지도, 나)은 60초 동안 브라우저 메모리의 직전 화면을 그대로 쓴다.
    // 기본값 0이면 탭을 누를 때마다 서버 데이터를 다시 받는 동안 스켈레톤이 떴다(로그인 상태 오늘 복귀 약 0.3~0.8초).
    // 설정 저장(me/actions의 revalidatePath)은 이 캐시를 바로 비운다. 즐겨찾기, 다시 안 갈 곳처럼 다른 탭 서버 데이터에
    // 들어가는 값은 최대 60초 늦게 반영될 수 있다. 카카오 장소 값은 서버 데이터에 없다(세션 메모리 캐시 그대로, CLAUDE.md 7장).
    // 출처: node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/staleTimes.md
    staleTimes: { dynamic: 60 },
  },
  // design-lab 화면은 루트 DESIGN.md 프런트매터를 서버에서 읽는다(getScreenTokens, T1.14, T1.20).
  // 시안 B 일러스트 확인 페이지(T2.8까지 유지)는 보존된 b.DESIGN.md를 읽는다. 함수 번들에 문서가 들어가도록 명시한다.
  outputFileTracingIncludes: {
    "/design-lab/**": ["./DESIGN.md", "./docs/design/candidates/b.DESIGN.md"],
    // 투표 링크 미리보기 이미지의 서버 글꼴(KS X 1001 woff 두 개, T7.14, D-17 안건 4)
    "/api/og/poll/**": ["./src/features/poll/share/og-fonts/*.woff"],
  },
  // 웹 글꼴(목록 CSS와 woff2 조각)은 버전 경로라 내용이 바뀌지 않는다. 글꼴을 바꾸면 WEB_FONTS_VERSION과 폴더를 올린다
  // (src/lib/fonts/web-fonts.ts, scripts/fonts/build-font-subsets.py).
  async headers() {
    return [
      // 서비스 워커 스크립트는 HTTP 캐시에 두지 않는다(Next.js PWA 가이드 "Securing your application", T8.4)
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
      {
        source: "/fonts/:version/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// 소스맵 업로드는 SENTRY_AUTH_TOKEN이 있을 때만 한다(T0.33 이후 Vercel에 등록).
// 토큰이 없는 로컬 빌드와 CI도 그대로 통과해야 한다.
const uploadSourcemaps = Boolean(process.env.SENTRY_AUTH_TOKEN);

export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  // tunnelRoute는 쓰지 않는다. 광고 차단기 우회 이득보다 서버 부하, proxy 설정, rate limit 관리 부담이 커서 MVP에서는 보류.
  sourcemaps: { disable: !uploadSourcemaps },
  // onRouterTransitionStart는 instrumentation-client.ts에서 직접 내보낸다.
  suppressOnRouterTransitionStartWarning: true,
});
