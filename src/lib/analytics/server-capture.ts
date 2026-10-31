// 서버에서 보내는 분석 이벤트 (T4.29). 로그인 시작과 완료는 폼 POST와 OAuth 리다이렉트 사이에서 일어나
// 브라우저의 posthog-js(첫 렌더 뒤 지연 로딩)가 아직 없거나 페이지가 곧 떠나므로, 라우트 핸들러에서 PostHog
// HTTP 캡처 API로 직접 보낸다. posthog-node 같은 새 의존성 없이 fetch 한 번이다.
//
// 지키는 것
// - 이벤트 이름과 속성은 events.ts 타입(PRD 10.2절) 그대로, 전송 직전에 sanitizeEventProperties로 한 번 더 거른다.
// - distinct_id는 익명 id만 쓴다(브라우저 PostHog 쿠키의 distinct_id, 없으면 서버가 만든 무작위 UUID).
//   Supabase user id나 닉네임, 토큰은 보내지 않는다. $process_person_profile=false로 사람 프로필을 만들지 않고
//   (클라이언트 person_profiles: "identified_only"와 같은 결), $geoip_disable로 서버 IP 위치 보강을 끈다.
// - 분석 실패가 로그인 리다이렉트를 막지 않는다. 전송은 after()로 응답 뒤에 돌리고, 짧은 타임아웃을 두며 예외를 삼킨다.
//
// 출처 (2026-10-30 확인): PostHog Docs "Capture API"(POST <host>/i/v0/e/, api_key, event, distinct_id, properties,
// $process_person_profile false로 익명 이벤트), PostHog 튜토리얼 "Next.js analytics"(쿠키 ph_<token>_posthog의
// distinct_id를 서버에서 읽기)
import type { AnalyticsEvent, AnalyticsPropertyValue } from "./events";
import { sanitizeEventProperties } from "./events";
import { POSTHOG_DEFAULT_HOST } from "./posthog";

/**
 * 로그인 시작부터 콜백까지 같은 익명 id를 잇는 쿠키. /auth/sign-in이 넣고 /auth/callback이 읽은 뒤 지운다.
 * 값은 PostHog 익명 id 또는 무작위 UUID라 개인 식별 정보가 아니다.
 */
export const ANALYTICS_ID_COOKIE = "lm_aid";

export function analyticsIdCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/auth",
    maxAge: 60 * 10,
  };
}

/** 서버 전송 타임아웃. 응답 뒤(after)에 돌지만 함수 실행 시간을 늘리지 않게 짧게 둔다 */
export const SERVER_CAPTURE_TIMEOUT_MS = 1500;

/** posthog-js가 브라우저에 두는 쿠키 이름(persistence localStorage+cookie). 토큰의 +, /, = 는 치환된다 */
export function posthogCookieName(key: string): string {
  const safe = key
    .replace(/\+/g, "PL")
    .replace(/\//g, "SL")
    .replace(/=/g, "EQ");
  return `ph_${safe}_posthog`;
}

// 익명 id로 받아들일 모양. posthog-js 기본(UUIDv7)과 서버 UUID를 담는다. @는 막아 이메일이 id로 들어오지 않게 한다.
const DISTINCT_ID_RE = /^[A-Za-z0-9_.:-]{8,128}$/;

export function isSafeDistinctId(v: unknown): v is string {
  return typeof v === "string" && DISTINCT_ID_RE.test(v);
}

/** PostHog 쿠키 값에서 distinct_id를 꺼낸다. 값은 JSON이며 인코딩돼 있을 수 있다. 모양이 이상하면 null */
export function readPosthogDistinctId(raw: string | undefined): string | null {
  if (!raw) return null;
  for (const candidate of [raw, safeDecode(raw)]) {
    if (candidate === null) continue;
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && "distinct_id" in parsed) {
        const id = (parsed as { distinct_id: unknown }).distinct_id;
        return isSafeDistinctId(id) ? id : null;
      }
    } catch {
      // 다음 후보(디코드한 값)로
    }
  }
  return null;
}

function safeDecode(v: string): string | null {
  try {
    return decodeURIComponent(v);
  } catch {
    return null;
  }
}

/**
 * 이벤트에 쓸 익명 id. 우선순위: 로그인 왕복 쿠키(lm_aid) → 브라우저 PostHog 쿠키 → 새 UUID.
 * lm_aid를 먼저 보는 이유는 login_started와 login_completed가 같은 id로 묶여야 퍼널이 이어지기 때문이다.
 */
export function resolveAnalyticsId(input: {
  carried: string | undefined;
  posthogCookie: string | undefined;
  generate: () => string;
}): string {
  if (isSafeDistinctId(input.carried)) return input.carried;
  return readPosthogDistinctId(input.posthogCookie) ?? input.generate();
}

export type ServerCaptureConfig = { key: string; host: string };

/** 공개 키가 없으면 null(전송하지 않음). 호스트 기본값은 브라우저 설정과 같다 */
export function serverCaptureConfig(env: {
  NEXT_PUBLIC_POSTHOG_KEY?: string;
  NEXT_PUBLIC_POSTHOG_HOST?: string;
}): ServerCaptureConfig | null {
  const key = env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  return {
    key,
    host: (env.NEXT_PUBLIC_POSTHOG_HOST || POSTHOG_DEFAULT_HOST).replace(
      /\/+$/,
      "",
    ),
  };
}

/** HTTP 캡처 API 본문(api_key는 전송할 때 붙인다) */
export type CapturePayload = {
  event: string;
  distinct_id: string;
  properties: Record<string, AnalyticsPropertyValue>;
  timestamp: string;
};

/** 속성은 PRD 이름만 남기고(금지 키, 좌표 제거) 익명 처리 표시를 덧붙인다 */
export function buildCapturePayload(
  event: AnalyticsEvent,
  distinctId: string,
  now: Date,
): CapturePayload {
  const { properties } = sanitizeEventProperties(event.properties);
  return {
    event: event.name,
    distinct_id: distinctId,
    properties: {
      ...properties,
      $process_person_profile: false,
      $geoip_disable: true,
      $lib: "lunchmate-server",
    },
    timestamp: now.toISOString(),
  };
}

/** 한 번 보낸다. 성공 여부만 돌려주고 절대 throw하지 않는다(재시도 없음: 응답 뒤라 사용자 영향 없음) */
export async function sendServerEvent(
  config: ServerCaptureConfig | null,
  payload: CapturePayload | null,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = SERVER_CAPTURE_TIMEOUT_MS,
): Promise<boolean> {
  if (!config || !payload) return false;
  try {
    const res = await fetchImpl(`${config.host}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, api_key: config.key }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 응답 뒤에 작업을 돌린다(Next after). 요청 범위 밖이라 after가 throw하면 기다리지 않고 바로 돌린다.
 * 어떤 경우에도 호출한 쪽(리다이렉트 응답)으로 예외가 나가지 않는다.
 */
export function runAfterResponse(
  task: () => Promise<unknown>,
  schedule: (fn: () => Promise<void>) => void,
): void {
  const safe = async () => {
    try {
      await task();
    } catch {
      // 분석 실패는 무시한다
    }
  };
  try {
    schedule(safe);
  } catch {
    void safe();
  }
}
