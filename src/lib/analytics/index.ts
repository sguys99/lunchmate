// 분석, 관측 초기화 진입점. 지금은 PostHog 지연 로딩 함수만 노출한다(T0.35).
// 호출 위치(루트 레이아웃의 클라이언트 Provider)와 이벤트 연결은 T2.20에서 만든다.
// Sentry 브라우저 초기화는 src/instrumentation-client.ts가 맡는다.
import { clientEnv } from "@/lib/env/client";
import { initPostHog } from "./posthog";

/**
 * 첫 렌더 이후 브라우저가 한가할 때 PostHog를 초기화한다. 서버에서 호출하면 아무 일도 하지 않는다.
 * 첫 상호작용(pointerdown, keydown) 중 먼저 오는 쪽이나 4초 타임아웃에서 시작한다.
 */
export function scheduleAnalytics(): void {
  if (typeof window === "undefined") return;
  const { NEXT_PUBLIC_POSTHOG_KEY: key, NEXT_PUBLIC_POSTHOG_HOST: host } =
    clientEnv();
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
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(start, { timeout: 4000 });
  } else {
    setTimeout(start, 4000);
  }
}

export { initPostHog } from "./posthog";
export { scrubCoordinates, scrubString } from "./scrub";
