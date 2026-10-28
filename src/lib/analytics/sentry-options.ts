// Sentry 공통 옵션. 브라우저, Node 서버, Edge가 같은 설정을 쓰도록 한 곳에 모은다.
// SDK를 import하지 않으므로 번들에 아무것도 끌어오지 않는다. 훅은 제네릭이라 이벤트 타입에 그대로 맞는다.
import { scrubCoordinates } from "./scrub";

/** 트레이스 샘플링 비율. 무료 플랜 한도와 번들 영향을 고려해 낮게 둔다. */
export const SENTRY_TRACES_SAMPLE_RATE = 0.1;

/** 좌표가 섞였을 수 있는 모든 이벤트 경로에 같은 스크러버를 적용한다. */
export function sentryBaseOptions(dsn: string) {
  return {
    dsn,
    // IP, 쿠키, 사용자 헤더 같은 개인 식별 정보를 자동 수집하지 않는다.
    sendDefaultPii: false,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    // 기본 스택 프레임 로컬 변수 등 부가 수집은 쓰지 않는다. Session Replay는 번들이 커서 넣지 않는다.
    beforeSend: <T>(event: T): T => scrubCoordinates(event),
    beforeSendTransaction: <T>(event: T): T => scrubCoordinates(event),
    beforeBreadcrumb: <T>(breadcrumb: T): T => scrubCoordinates(breadcrumb),
  };
}
