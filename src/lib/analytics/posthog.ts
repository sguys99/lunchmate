// PostHog 지연 초기화. 이 파일은 posthog-js를 정적으로 import하지 않는다.
// 초기화 때만 import("posthog-js")로 청크(약 104KB gzip)를 받으므로 홈 초기 번들 증가는 0이다(tasks 2.4절).
// T0.35는 설치와 진입점까지만 만든다. 실제 마운트와 이벤트 전송은 T2.20에서 한다.
import type { CaptureResult, PostHogConfig } from "posthog-js";
import { scrubCoordinates } from "./scrub";

const DEFAULT_HOST = "https://us.i.posthog.com";

/** 전송 직전 필터. 좌표를 가리고 GeoIP 보강을 끈다. null을 돌려주면 이벤트가 버려진다. */
export function posthogBeforeSend(result: CaptureResult): CaptureResult | null {
  const scrubbed = scrubCoordinates(result);
  scrubbed.properties = { ...scrubbed.properties, $geoip_disable: true };
  return scrubbed;
}

/** 개인 정보와 좌표가 섞일 여지를 줄인 보수적 옵션. 변경은 T2.20에서 이벤트 설계와 함께 판단한다. */
export function posthogConfig(
  host: string | undefined,
): Partial<PostHogConfig> {
  return {
    api_host: host || DEFAULT_HOST,
    // autocapture는 클릭한 요소의 텍스트, href 등을 모으므로 좌표가 섞일 수 있다. T2.20에서 필터와 함께 재검토.
    autocapture: false,
    // 페이지뷰는 라우터 전환에 맞춰 수동 전송한다(T2.20). URL 쿼리의 좌표는 before_send가 한 번 더 가린다.
    capture_pageview: false,
    capture_pageleave: false,
    // 로그인 전 방문자는 사람 프로필을 만들지 않는다.
    person_profiles: "identified_only",
    disable_session_recording: true,
    disable_surveys: true,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    before_send: posthogBeforeSend,
  };
}

type PostHogClient = typeof import("posthog-js").default;

let loading: Promise<PostHogClient | null> | undefined;

/** 키가 없으면 null을 돌려주고 아무것도 로드하지 않는다. 여러 번 불러도 한 번만 초기화한다. */
export function initPostHog(
  key: string | undefined,
  host: string | undefined,
): Promise<PostHogClient | null> {
  if (!key) return Promise.resolve(null);
  loading ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(key, posthogConfig(host));
    return posthog;
  });
  return loading;
}
