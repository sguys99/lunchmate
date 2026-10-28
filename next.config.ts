import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // design-lab 화면은 루트 DESIGN.md 프런트매터를 서버에서 읽는다(getScreenTokens, T1.14, T1.20).
  // 시안 B 일러스트 확인 페이지(T2.8까지 유지)는 보존된 b.DESIGN.md를 읽는다. 함수 번들에 문서가 들어가도록 명시한다.
  outputFileTracingIncludes: {
    "/design-lab/**": [
      "./DESIGN.md",
      "./docs/design/candidates/b.DESIGN.md",
    ],
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
