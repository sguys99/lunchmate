// 브라우저용 Sentry 초기화. 이 파일은 반드시 동적 import로만 불러온다(홈 초기 번들 보호, tasks 2.4절).
// 호출자는 src/instrumentation-client.ts 이다.
import * as Sentry from "@sentry/nextjs";
import { sentryBaseOptions } from "./sentry-options";

let initialized = false;

/** DSN이 없으면 아무것도 하지 않는다. 라우터 전환 계측 함수를 돌려준다. */
export function initSentryClient(dsn: string | undefined) {
  if (!dsn || initialized) return Sentry.captureRouterTransitionStart;
  initialized = true;
  Sentry.init({
    ...sentryBaseOptions(dsn),
    // 개발 중에는 이벤트를 보내지 않는다.
    enabled: process.env.NODE_ENV === "production",
  });
  return Sentry.captureRouterTransitionStart;
}
