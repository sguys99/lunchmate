// PostHog 초기화 옵션과 전송 직전 필터. posthog.ts의 initPostHog()가 posthog-js와 함께 동적 import한다.
// 홈 첫 로드에 싣지 않으려고 큐(posthog.ts)와 나눴다(T8.11). 서버 캡처(server-capture.ts)는 기본 호스트만 가져다 쓴다.
import type { CaptureResult, PostHogConfig, Properties } from "posthog-js";
import { SECRET_SEGMENTS, pageviewPath } from "./pageview";
import { scrubCoordinates } from "./scrub";

export const POSTHOG_DEFAULT_HOST = "https://us.i.posthog.com";

// autocapture, 히트맵이 붙이는 요소 정보. autocapture를 꺼 두지만 설정이 바뀌어도 새지 않게 전송 직전에 한 번 더 뺀다.
// 요소 텍스트, href, 클릭 위치(화면 좌표)가 여기에 들어간다.
const ELEMENT_PROPERTY_KEYS = [
  "$elements",
  "$elements_chain",
  "$el_text",
  "$external_click_url",
  "$heatmap_data",
] as const;

// posthog-js가 자동으로 붙이는 URL, 경로 속성. 이름 끝으로 판정해 새 속성이 생겨도 따라간다.
// 예: $current_url, $pathname, $referrer, $initial_current_url, $initial_pathname, $initial_referrer,
// $session_entry_url, $session_entry_pathname, $session_entry_referrer, $prev_pageview_pathname.
// $referring_domain처럼 도메인만 담는 속성은 해당하지 않는다.
const URL_PROPERTY_KEY_RE = /(url|pathname|referrer|href)$/i;

// 키 이름과 상관없이 문자열 어디에든 남은 비밀 세그먼트. 퍼센트 인코딩된 중첩 경로(?next=%2Fpoll%2F코드)도 잡는다.
const SECRET_SEGMENT_RES = SECRET_SEGMENTS.map(
  ([prefix, label]) =>
    [
      new RegExp(`((?:/|%2F)${prefix}(?:/|%2F))(?!${escapeRegExp(label)})[^/?#&\\s"'%]+`, "gi"),
      label,
    ] as const,
);

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * URL, 경로 값을 페이지뷰와 같은 규칙(pageviewPath)으로 바꾼다. 쿼리와 해시는 버린다(좌표, 검색어, 로그인 뒤 돌아갈 경로).
 * 절대 URL은 origin + 가린 경로, "/"로 시작하는 경로는 가린 경로, 그 밖의 값("$direct" 등)은 그대로 둔다.
 */
export function maskUrlValue(value: string): string {
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return url.origin + pageviewPath(url.pathname);
    } catch {
      return maskSecretSegments(value);
    }
  }
  if (value.startsWith("/")) return pageviewPath(value);
  return value;
}

function maskSecretSegments(value: string): string {
  let out = value;
  for (const [re, label] of SECRET_SEGMENT_RES) {
    out = out.replace(re, (_, head: string) => head + label);
  }
  return out;
}

/** 이벤트 속성을 깊이 훑어 URL 속성은 maskUrlValue로, 나머지 문자열은 비밀 세그먼트만 가린다. 입력은 바꾸지 않는다. */
function maskSecrets(value: unknown, key?: string): unknown {
  if (typeof value === "string") {
    return key !== undefined && URL_PROPERTY_KEY_RE.test(key)
      ? maskSecretSegments(maskUrlValue(value))
      : maskSecretSegments(value);
  }
  if (Array.isArray(value)) return value.map((item) => maskSecrets(item));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = maskSecrets(v, k);
    return out;
  }
  return value;
}

/**
 * 전송 직전 필터(before_send). 모든 이벤트(직접 보낸 것, 자동 수집, $set 사람 속성)에 적용된다.
 * 1) 요소 정보 제거 2) 속성 전체에서 좌표 키와 URL 쿼리, 문자열 속 좌표 가림 3) GeoIP 보강 끄기
 * 4) URL과 경로 속성(이벤트 종류 무관, $set과 $set_once 포함)의 쿼리 제거와 투표 초대 코드 가림(T10.10).
 * 초대 코드는 투표방 조회 권한이라 분석 도구에 남기지 않는다(CLAUDE.md 7장).
 * null을 돌려주면 이벤트가 버려진다.
 */
export function posthogBeforeSend(result: CaptureResult): CaptureResult | null {
  const scrubbed = scrubCoordinates(result);
  if (scrubbed.$set) scrubbed.$set = maskSecrets(scrubbed.$set) as Properties;
  if (scrubbed.$set_once) {
    scrubbed.$set_once = maskSecrets(scrubbed.$set_once) as Properties;
  }
  scrubbed.properties = maskSecrets(scrubbed.properties) as Properties;
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
    api_host: host || POSTHOG_DEFAULT_HOST,
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
