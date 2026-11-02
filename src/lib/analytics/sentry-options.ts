// Sentry 공통 옵션. 브라우저, Node 서버, Edge가 같은 설정을 쓰도록 한 곳에 모은다(T2.21).
// SDK 값은 import하지 않으므로(타입만) 번들에 아무것도 끌어오지 않는다. 훅은 제네릭이라 각 이벤트 타입에 그대로 맞는다.
import type { init } from "@sentry/nextjs";
import { scrubCoordinates } from "./scrub";

/** SDK의 dataCollection 옵션 타입. @sentry/nextjs가 타입 이름을 내보내지 않아 init 인자에서 꺼낸다. */
type DataCollection = NonNullable<
  NonNullable<Parameters<typeof init>[0]>["dataCollection"]
>;

/** 트레이스 샘플링 비율. 무료 플랜 한도와 번들 영향을 고려해 낮게 둔다. */
export const SENTRY_TRACES_SAMPLE_RATE = 0.1;

/**
 * 앱 동작과 무관한 알려진 소음(T8.16, docs/monitoring.md 2.3절). 실제 버그를 숨기지 않도록 아주 좁게 둔다.
 * ResizeObserver 경고는 브라우저가 한 프레임에 처리하지 못한 알림을 알리는 것이라 사용자 영향이 없다.
 * 카카오톡 인앱 브라우저 고유 오류는 베타에서 실제 이슈를 본 뒤 콘솔의 Inbound Filters(오류 메시지)로 더한다.
 */
export const SENTRY_IGNORE_ERRORS: readonly RegExp[] = [
  /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/,
];

/** 브라우저 확장 프로그램 스크립트에서 난 오류. 콘솔의 "browser extensions" 필터와 겹쳐도 무해하다. */
export const SENTRY_DENY_URLS: readonly RegExp[] = [
  /^(chrome|moz|safari|safari-web|ms-browser)-extension:\/\//i,
];

/** IP, 사용자 식별 헤더로 쓰이는 키. URL 쿼리에 섞여도 값을 가린다(MIGRATION.md의 v10 기본값 재현 목록). */
const IDENTITY_KEY_DENY = ["forwarded", "-ip", "remote-", "via", "-user"];

/**
 * SDK 자동 수집 범위(T10.10). SDK 11은 `sendDefaultPii`를 없애고 `dataCollection`으로 바꿨으며,
 * 지정하지 않으면 기본값이 "수집 허용"이다(userInfo true로 IP 추론, 쿠키, 헤더, 요청과 응답 본문, DB 쿼리 데이터).
 * 브라우저, Node, Edge 모두 이 값을 쓴다. 바꾸지 않는다.
 * - userInfo false: user.* 자동 채움, 수집 서버의 IP 추론(infer_ip "never", 세션 ip_address "{{auto}}" 없음), 서버 span의 client.address를 끈다.
 * - cookies false: 쿠키(Supabase 세션)를 모으지 않는다.
 * - httpHeaders: 요청 헤더는 User-Agent만 남기고(Referer, X-Forwarded-For, Authorization 등은 버림), 응답 헤더는 모으지 않는다.
 *   User-Agent는 처리방침의 "브라우저 정보"이며, 인앱 브라우저 오류 구분과 Sentry의 구형 브라우저, 크롤러 필터가 이 값을 쓴다.
 *   브라우저 SDK가 모으는 헤더는 Referer와 User-Agent 둘뿐이라 Referer 속 경로(초대 코드)도 함께 빠진다.
 * - httpBodies []: 요청과 응답 본문을 모으지 않는다(후기, 투표, 제보 입력).
 * - urlQueryParams: 쿼리는 디버깅에 남기되 IP 계열 키는 가린다. 좌표 쿼리는 beforeSend 스크러버가 가린다.
 * - 나머지(DB 쿼리 데이터, 큐, GraphQL, 생성형 AI, MCP)는 쓰지 않지만 기본값이 켜짐이라 명시해서 끈다.
 * 출처: sentry-javascript MIGRATION.md "sendDefaultPii is replaced by dataCollection",
 * @sentry/core 11.9.0 resolveDataCollectionOptions.js(기본값), @sentry/browser client.js(infer_ip 판정).
 */
export const SENTRY_DATA_COLLECTION: Readonly<DataCollection> = {
  userInfo: false,
  cookies: false,
  httpHeaders: { request: { allow: ["user-agent"] }, response: false },
  httpBodies: [],
  urlQueryParams: { deny: IDENTITY_KEY_DENY },
  databaseQueryData: false,
  queues: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  mcp: { inputs: false, outputs: false },
};

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
    // IP, 쿠키, 헤더, 요청과 응답 본문 같은 개인 식별 정보를 자동 수집하지 않는다(SENTRY_DATA_COLLECTION).
    // SDK 11에서 sendDefaultPii는 아무 효과가 없어 쓰지 않는다.
    dataCollection: SENTRY_DATA_COLLECTION,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    ignoreErrors: [...SENTRY_IGNORE_ERRORS],
    denyUrls: [...SENTRY_DENY_URLS],
    // Session Replay는 번들이 커서 넣지 않는다.
    beforeSend: <T>(event: T): T => scrubCoordinates(event),
    beforeBreadcrumb: <T>(breadcrumb: T): T => scrubCoordinates(breadcrumb),
    beforeSendSpan: <T>(span: T): T => scrubCoordinates(span),
  };
}
