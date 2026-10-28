// 오류 경계(error.tsx, global-error.tsx)가 잡은 오류를 Sentry로 보낸다 (T2.18, APP-06).
//
// Sentry SDK는 홈 초기 번들에 넣지 않는다(tasks 2.4절). instrumentation-client.ts가 브라우저가 한가할 때
// 불러오는데, 그보다 먼저 오류가 나면 여기서 같은 지연 청크(sentry-client)를 불러와 초기화한 뒤 보낸다.
// initSentryClient는 한 번만 초기화하므로 두 경로가 겹쳐도 안전하다. DSN이 없으면 SDK를 받지 않는다.
// 좌표 스크러빙은 sentry-options의 beforeSend가 맡는다(T2.21). 여기서는 오류 객체를 그대로 넘긴다.
// 서버 컴포넌트 오류는 instrumentation.ts의 onRequestError가 이미 보낸다. 브라우저에서 다시 보내도
// Sentry가 같은 digest로 묶어 보여 주므로 따로 거르지 않는다.

/** 오류 객체의 digest(서버 오류 식별자). 없거나 문자열이 아니면 undefined */
export function errorDigest(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.length > 0 ? digest : undefined;
}

/** 브라우저에서만 동작한다. 보고 실패는 화면에 영향을 주지 않게 삼킨다. */
export async function reportError(error: unknown): Promise<void> {
  if (typeof window === "undefined") return;
  // NEXT_PUBLIC_ 값은 빌드 시 문자열로 치환된다.
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return;
  try {
    const { initSentryClient } = await import("@/lib/analytics/sentry-client");
    initSentryClient(dsn);
    const { captureException } = await import("@sentry/nextjs");
    captureException(error);
  } catch {
    // 모니터링 실패가 오류 화면을 다시 깨뜨리지 않게 한다.
  }
}
