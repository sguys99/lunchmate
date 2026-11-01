// 브라우저 계측 진입점. 홈 초기 번들에는 이 파일의 몇 줄만 들어가고,
// Sentry SDK는 첫 화면이 뜬 뒤(load 뒤 3초, 이어서 브라우저가 한가할 때) 동적 import로 불러온다(tasks 2.4절 사용 규칙).
// load 직후에 받으면 느린 망에서 첫 화면(LCP)과 대역폭을 나눠 쓴다(T8.10, docs/design/g8-lighthouse.md).
// 트레이드오프: SDK가 로드되기 전(load 뒤 약 3~4초)에 난 오류는 수집되지 않는다.
import type { RouterTransitionType } from "next";

type CaptureTransition = (url: string, type: RouterTransitionType) => void;
let captureTransition: CaptureTransition | undefined;

function loadSentry() {
  // NEXT_PUBLIC_ 값은 빌드 시 문자열로 치환된다. DSN이 없으면 SDK 청크를 아예 받지 않는다.
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return;
  import("@/lib/analytics/sentry-client")
    .then(({ initSentryClient }) => {
      captureTransition = initSentryClient(dsn);
    })
    .catch(() => {
      // 모니터링 로딩 실패가 앱 동작에 영향을 주지 않게 삼킨다.
    });
}

/** load 뒤 SDK를 받기 전에 기다리는 시간(ms). PostHog(src/lib/analytics/index.ts)와 같은 값 */
const START_DELAY_MS = 3000;

function whenIdle(task: () => void) {
  if (typeof window === "undefined") return;
  const run = () => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(task, { timeout: 4000 });
    } else {
      setTimeout(task, 2000);
    }
  };
  const later = () => setTimeout(run, START_DELAY_MS);
  if (document.readyState === "complete") later();
  else window.addEventListener("load", later, { once: true });
}

whenIdle(loadSentry);

// 라우트 전환 계측. SDK가 로드된 뒤의 전환부터 전달한다.
export function onRouterTransitionStart(
  url: string,
  navigationType: RouterTransitionType,
) {
  captureTransition?.(url, navigationType);
}
