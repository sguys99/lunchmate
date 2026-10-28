// 분석 이벤트 전송 래퍼. 화면 코드는 posthog-js를 직접 부르지 않고 track()만 쓴다(T2.20).
// posthog-js는 scheduleAnalytics()가 첫 렌더 뒤에 동적 import한다. 그 전에 부른 track()은 큐에 쌓였다가 초기화 후 전송된다.
import type { AnalyticsEvent } from "./events";
import { sanitizeEventProperties } from "./events";
import { captureOrQueue } from "./posthog";
import { scrubString } from "./scrub";

const isDev = process.env.NODE_ENV !== "production";

/**
 * PRD 10.2절 이벤트를 보낸다. 서버에서 부르면 아무 일도 하지 않는다.
 * 타입을 우회해 금지 키(좌표, 개인 식별 정보)가 들어오면 제거하고, 개발 모드에서는 콘솔에 경고한다.
 *
 * @example track({ name: "card_swiped", properties: { position: 1 } })
 */
export function track(event: AnalyticsEvent): void {
  if (typeof window === "undefined") return;
  const { properties, dropped } = sanitizeEventProperties(event.properties);
  if (dropped.length > 0 && isDev) {
    console.warn(
      `[analytics] ${event.name}: 허용하지 않는 속성을 제거했습니다 (${dropped.join(", ")}). PRD 10.2절 속성만 보냅니다.`,
    );
  }
  captureOrQueue(event.name, properties);
}

/**
 * 라우터 전환 때 페이지뷰를 보낸다(capture_pageview는 꺼 둠). 쿼리의 좌표 파라미터는 가린다.
 * PostHog가 자동으로 붙이는 $current_url도 before_send에서 같은 방식으로 가려진다.
 */
export function capturePageview(url: string): void {
  if (typeof window === "undefined") return;
  captureOrQueue("$pageview", { $current_url: scrubString(url) });
}
