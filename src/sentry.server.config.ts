// Node.js 런타임 Sentry 초기화. src/instrumentation.ts의 register()에서 불러온다.
import * as Sentry from "@sentry/nextjs";
import { sentryBaseOptions } from "@/lib/analytics/sentry-options";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

// DSN이 없으면 init하지 않는다(no-op).
if (dsn) {
  Sentry.init({
    ...sentryBaseOptions(dsn),
    enabled: process.env.NODE_ENV === "production",
  });
}
