import * as Sentry from "@sentry/nextjs";

// 서버 시작 시 환경변수를 한 번 검증한다. 잘못된 값이면 서버가 뜨지 않는다.
// 검증 후 Sentry를 초기화한다(DSN이 없으면 각 config 파일이 init하지 않는다).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateAllEnv } = await import("@/lib/env/server");
    validateAllEnv();
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// 서버 컴포넌트, 라우트 핸들러, proxy의 요청 오류를 Sentry로 보낸다.
export const onRequestError = Sentry.captureRequestError;
