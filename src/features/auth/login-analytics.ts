// login_started, login_completed 서버 전송 (T4.29, PRD 10.2절: provider, in_app_browser).
//
// 결정 (2026-10-30, T4.29)
// - 클라이언트가 아니라 라우트 핸들러에서 보낸다. 브랜드 버튼은 /login, 랜딩, 로그인 유도 시트 세 곳 모두
//   /auth/sign-in으로 폼 POST하므로 진입점과 관계없이 한 곳에서 빠짐없이 잡힌다. 브라우저 쪽은 posthog-js가
//   아직 로드되지 않았을 수 있고(첫 렌더 뒤 지연 로딩) 곧바로 제공자 화면으로 떠나 큐가 사라진다.
// - login_started는 제공자 인증 화면으로 실제로 보낼 때만 보낸다(입력 오류, 인앱 구글 안내, Supabase 실패 제외).
// - login_completed는 세션 교환에 성공했을 때만 보낸다. 약관 화면이나 온보딩으로 가는 것과 무관하다.
// - in_app_browser는 요청 UA의 인앱 판정 결과(boolean)만 쓴다. UA 원문은 보내지 않는다(src/lib/inapp.ts).
// - provider는 화면 id(kakao, naver, google). 콜백의 app_metadata.provider(custom:kakao 등)는 화면 id로 바꾸고,
//   목록 밖 값이면 보내지 않는다.
import type { AnalyticsEvent } from "@/lib/analytics/events";
import {
  ANALYTICS_ID_COOKIE,
  buildCapturePayload,
  posthogCookieName,
  resolveAnalyticsId,
  sendServerEvent,
  type CapturePayload,
  type ServerCaptureConfig,
} from "@/lib/analytics/server-capture";
import { detectInApp } from "@/lib/inapp";
import type { LoginProvider } from "./providers";

export type LoginEventName = "login_started" | "login_completed";

/** PRD 10.2절 속성 그대로: provider, in_app_browser */
export function loginEvent(
  name: LoginEventName,
  provider: LoginProvider,
  userAgent: string | null,
): AnalyticsEvent {
  return {
    name,
    properties: { provider, in_app_browser: detectInApp(userAgent) !== null },
  };
}

type CookieReader = { get(name: string): { value: string } | undefined };

/** 요청 쿠키에서 이번 로그인 왕복의 익명 id를 정한다(lm_aid → PostHog 쿠키 → 새 UUID) */
export function loginAnalyticsId(
  cookies: CookieReader,
  config: ServerCaptureConfig | null,
  generate: () => string = () => crypto.randomUUID(),
): string {
  return resolveAnalyticsId({
    carried: cookies.get(ANALYTICS_ID_COOKIE)?.value,
    posthogCookie: config
      ? cookies.get(posthogCookieName(config.key))?.value
      : undefined,
    generate,
  });
}

/** 보낼 본문. 키가 없으면 null */
export function loginCapturePayload(
  config: ServerCaptureConfig | null,
  event: AnalyticsEvent,
  distinctId: string,
  now: Date = new Date(),
): CapturePayload | null {
  return config ? buildCapturePayload(event, distinctId, now) : null;
}

/** 전송. sendServerEvent와 같이 throw하지 않는다 */
export function sendLoginEvent(
  config: ServerCaptureConfig | null,
  event: AnalyticsEvent,
  distinctId: string,
  fetchImpl?: typeof fetch,
): Promise<boolean> {
  return sendServerEvent(
    config,
    loginCapturePayload(config, event, distinctId),
    fetchImpl,
  );
}
