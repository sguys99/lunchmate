// 분석, 관측 진입점. PostHog 지연 로딩(T0.35)과 이벤트 전송 track()(T2.20)을 노출한다.
// scheduleAnalytics()를 부르는 위치(루트 레이아웃의 클라이언트 Provider)와 capturePageview() 연결은 앱 셸 쪽에서 한다.
// Sentry 브라우저 초기화는 src/instrumentation-client.ts가 맡는다.
import { initPostHog } from "./posthog";

/** NEXT_PUBLIC_ 값은 빌드 시 문자열로 치환된다. 빈 문자열은 미설정으로 본다(env/keys.ts cleanEnv와 같은 규칙). */
function publicValue(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

/** load 뒤 SDK를 받기 전에 기다리는 시간(ms). Sentry(src/instrumentation-client.ts)와 같은 값 */
const START_DELAY_MS = 3000;

/**
 * 첫 화면이 뜬 뒤 PostHog를 초기화한다. 서버에서 호출하면 아무 일도 하지 않는다.
 * 첫 상호작용(pointerdown, keydown)이나 load 뒤 3초 + 유휴 시점(최대 4초 더) 중 먼저 오는 쪽에서 시작한다.
 * load 직후에 받으면 SDK 청크(약 104KB gzip)가 느린 망에서 첫 화면(LCP)과 대역폭을 나눠 쓴다(T8.10, docs/design/g8-lighthouse.md).
 */
export function scheduleAnalytics(): void {
  if (typeof window === "undefined") return;
  // clientEnv()를 거치지 않고 두 값만 직접 읽는다. env 검증 모듈(키 목록, 오류 클래스)이 홈 첫 번들에 실리지 않게 하려는 것이다
  // (T8.11). 형식 검증은 서버 시작 때(instrumentation → env/server.ts → clientEnv) 이미 끝난다. Sentry DSN도 같은 방식이다.
  const key = publicValue(process.env.NEXT_PUBLIC_POSTHOG_KEY);
  const host = publicValue(process.env.NEXT_PUBLIC_POSTHOG_HOST);
  if (!key) return;

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    window.removeEventListener("pointerdown", start);
    window.removeEventListener("keydown", start);
    void initPostHog(key, host).catch(() => {
      // 분석 로딩 실패가 앱 동작에 영향을 주지 않게 삼킨다.
    });
  };
  window.addEventListener("pointerdown", start, { once: true, passive: true });
  window.addEventListener("keydown", start, { once: true });
  const idle = () => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(start, { timeout: 4000 });
    } else {
      start();
    }
  };
  const later = () => setTimeout(idle, START_DELAY_MS);
  if (document.readyState === "complete") later();
  else window.addEventListener("load", later, { once: true });
}

export { initPostHog } from "./posthog";
export { capturePageview, track } from "./track";
export type {
  AnalyticsEvent,
  AnalyticsEventMap,
  AnalyticsEventName,
} from "./events";
export { scrubCoordinates, scrubString } from "./scrub";
