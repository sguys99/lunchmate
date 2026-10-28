// 브라우저 계측 진입점. 홈 초기 번들에는 이 파일의 몇 줄만 들어가고,
// Sentry SDK는 첫 렌더가 끝난 뒤(브라우저가 한가할 때) 동적 import로 불러온다(tasks 2.4절 사용 규칙).
// 트레이드오프: SDK가 로드되기 전(보통 1~2초 이내)에 난 오류는 수집되지 않는다.
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

function whenIdle(task: () => void) {
  if (typeof window === "undefined") return;
  const run = () => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(task, { timeout: 4000 });
    } else {
      setTimeout(task, 2000);
    }
  };
  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
}

whenIdle(loadSentry);

// 라우트 전환 계측. SDK가 로드된 뒤의 전환부터 전달한다.
export function onRouterTransitionStart(
  url: string,
  navigationType: RouterTransitionType,
) {
  captureTransition?.(url, navigationType);
}
