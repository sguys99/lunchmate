// PostHog 지연 초기화. 이 파일은 posthog-js를 정적으로 import하지 않는다.
// 초기화 때만 import("posthog-js")로 청크(약 104KB gzip)를 받으므로 홈 초기 번들 증가는 0이다(tasks 2.4절).
// 이벤트 전송은 track.ts의 track()만 쓴다. 초기화 전에 들어온 이벤트는 작은 큐에 모았다가 초기화 후 보낸다(T2.20).
import type { CaptureResult, PostHogConfig, Properties } from "posthog-js";
import { scrubCoordinates } from "./scrub";

const DEFAULT_HOST = "https://us.i.posthog.com";

// autocapture, 히트맵이 붙이는 요소 정보. autocapture를 꺼 두지만 설정이 바뀌어도 새지 않게 전송 직전에 한 번 더 뺀다.
// 요소 텍스트, href, 클릭 위치(화면 좌표)가 여기에 들어간다.
const ELEMENT_PROPERTY_KEYS = [
  "$elements",
  "$elements_chain",
  "$el_text",
  "$external_click_url",
  "$heatmap_data",
] as const;

/**
 * 전송 직전 필터(before_send). 모든 이벤트(직접 보낸 것, 자동 수집, $set 사람 속성)에 적용된다.
 * 1) 요소 정보 제거 2) 속성 전체에서 좌표 키와 URL 쿼리, 문자열 속 좌표 가림 3) GeoIP 보강 끄기.
 * null을 돌려주면 이벤트가 버려진다.
 */
export function posthogBeforeSend(result: CaptureResult): CaptureResult | null {
  const scrubbed = scrubCoordinates(result);
  const properties: Properties = { ...scrubbed.properties };
  for (const key of ELEMENT_PROPERTY_KEYS) delete properties[key];
  scrubbed.properties = { ...properties, $geoip_disable: true };
  return scrubbed;
}

/**
 * 개인 정보와 좌표가 섞일 여지를 줄인 보수적 옵션(T2.20 판단).
 * autocapture는 끈다. 근거: PRD 10.2절 이벤트만으로 지표(North Star, 수락률, 응답률)를 모두 계산할 수 있고,
 * autocapture는 클릭한 요소의 텍스트(식당명 같은 카카오 장소 데이터), href의 쿼리(좌표), 클릭 화면 좌표를 모으며,
 * 이벤트량이 무료 한도를 빨리 소모한다. 다시 켜야 하면 mask 옵션과 before_send 요소 제거가 남아 있다.
 */
export function posthogConfig(
  host: string | undefined,
): Partial<PostHogConfig> {
  return {
    api_host: host || DEFAULT_HOST,
    autocapture: false,
    // 혹시 autocapture나 툴바가 켜져도 요소 텍스트와 속성(href, value)을 모으지 않는다.
    mask_all_text: true,
    mask_all_element_attributes: true,
    // 페이지뷰는 capturePageview()로 라우터 전환에 맞춰 수동 전송한다. URL 쿼리의 좌표는 before_send가 가린다.
    capture_pageview: false,
    capture_pageleave: false,
    // 로그인 전 방문자는 사람 프로필을 만들지 않는다.
    person_profiles: "identified_only",
    disable_session_recording: true,
    disable_surveys: true,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    // 예외 자동 수집은 Sentry가 맡는다. 오류 메시지와 스택에 좌표가 섞일 경로를 하나로 줄인다.
    capture_exceptions: false,
    before_send: posthogBeforeSend,
  };
}

type PostHogClient = typeof import("posthog-js").default;

let loading: Promise<PostHogClient | null> | undefined;
let client: PostHogClient | undefined;

type QueuedCapture = { event: string; properties: Properties };
/** 초기화 전 이벤트 큐 상한. 키가 없어 초기화가 영영 안 되는 환경에서 메모리가 늘지 않게 막는다. */
export const MAX_QUEUED_EVENTS = 50;
const queue: QueuedCapture[] = [];

/** 초기화됐으면 바로 보내고, 아니면 큐에 넣는다. 속성 정리는 호출자(track)가 끝낸 상태여야 한다. */
export function captureOrQueue(event: string, properties: Properties): void {
  if (client) {
    client.capture(event, properties);
    return;
  }
  if (queue.length >= MAX_QUEUED_EVENTS) queue.shift();
  queue.push({ event, properties });
}

function flushQueue(posthog: PostHogClient): void {
  for (const item of queue.splice(0)) {
    posthog.capture(item.event, item.properties);
  }
}

/** 테스트 전용. 모듈 상태를 처음으로 되돌린다. */
export function resetPostHogForTest(): void {
  loading = undefined;
  client = undefined;
  queue.length = 0;
}

/** 키가 없으면 null을 돌려주고 아무것도 로드하지 않는다. 여러 번 불러도 한 번만 초기화한다. */
export function initPostHog(
  key: string | undefined,
  host: string | undefined,
): Promise<PostHogClient | null> {
  if (!key) return Promise.resolve(null);
  loading ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(key, posthogConfig(host));
    client = posthog;
    flushQueue(posthog);
    return posthog;
  });
  return loading;
}
