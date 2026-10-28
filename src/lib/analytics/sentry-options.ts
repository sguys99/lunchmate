// Sentry 공통 옵션. 브라우저, Node 서버, Edge가 같은 설정을 쓰도록 한 곳에 모은다(T2.21).
// SDK를 import하지 않으므로 번들에 아무것도 끌어오지 않는다. 훅은 제네릭이라 각 이벤트 타입에 그대로 맞는다.
import { scrubCoordinates } from "./scrub";

/** 트레이스 샘플링 비율. 무료 플랜 한도와 번들 영향을 고려해 낮게 둔다. */
export const SENTRY_TRACES_SAMPLE_RATE = 0.1;

/**
 * 좌표가 섞였을 수 있는 모든 전송 경로에 같은 스크러버를 적용한다.
 * - beforeSend: 오류 이벤트. request(url, query_string, data, headers의 Referer), extra, contexts, tags,
 *   transaction 이름, 이벤트에 붙은 브레드크럼까지 통째로 훑는다.
 * - beforeBreadcrumb: fetch, xhr(data.url, http.query), navigation(from, to), console 메시지.
 * - beforeSendSpan: SDK 11 기본값인 span 스트리밍(traceLifecycle "stream")의 span 이름과 속성(url.full, url.query).
 *   beforeSendTransaction은 stream 모드에서 호출되지 않고 v12에서 빠지므로 쓰지 않는다.
 * 어떤 훅도 null을 돌려주지 않는다. 좌표만 가리고 오류 자체는 보낸다.
 */
export function sentryBaseOptions(dsn: string) {
  return {
    dsn,
    // IP, 쿠키, 사용자 헤더, 요청 body 같은 개인 식별 정보를 자동 수집하지 않는다. 바꾸지 않는다.
    sendDefaultPii: false,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    // Session Replay는 번들이 커서 넣지 않는다.
    beforeSend: <T>(event: T): T => scrubCoordinates(event),
    beforeBreadcrumb: <T>(breadcrumb: T): T => scrubCoordinates(breadcrumb),
    beforeSendSpan: <T>(span: T): T => scrubCoordinates(span),
  };
}
