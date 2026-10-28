// 분석, 관측 진입점. PostHog 지연 로딩(T0.35)과 이벤트 전송 track()(T2.20)을 노출한다.
// scheduleAnalytics()를 부르는 위치(루트 레이아웃의 클라이언트 Provider)와 capturePageview() 연결은 앱 셸 쪽에서 한다.
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
export { capturePageview, track } from "./track";
export type {
  AnalyticsEvent,
  AnalyticsEventMap,
  AnalyticsEventName,
} from "./events";
export { scrubCoordinates, scrubString } from "./scrub";
