// Edge 런타임 Sentry 초기화(proxy 등). src/instrumentation.ts의 register()에서 불러온다.
import * as Sentry from "@sentry/nextjs";
import { sentryBaseOptions } from "@/lib/analytics/sentry-options";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    ...sentryBaseOptions(dsn),
    enabled: process.env.NODE_ENV === "production",
  });
}
