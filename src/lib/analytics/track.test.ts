// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const posthogMock = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
}));
vi.mock("posthog-js", () => ({ default: posthogMock }));

import type { AnalyticsEvent } from "./events";
import { MAX_QUEUED_EVENTS, initPostHog, resetPostHogForTest } from "./posthog";
import {
  maskUrlValue,
  posthogBeforeSend,
  posthogConfig,
} from "./posthog-config";
import { FILTERED } from "./scrub";
import { capturePageview, track } from "./track";
import type { CaptureResult } from "posthog-js";

beforeEach(() => {
  resetPostHogForTest();
  posthogMock.init.mockClear();
  posthogMock.capture.mockClear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("track", () => {
  it("초기화 전 이벤트를 큐에 모았다가 초기화 후 보낸다", async () => {
    track({ name: "card_swiped", properties: { position: 1 } });
    expect(posthogMock.capture).not.toHaveBeenCalled();

    await initPostHog("phc_test", undefined);
    expect(posthogMock.init).toHaveBeenCalledOnce();
    expect(posthogMock.capture).toHaveBeenCalledWith("card_swiped", {
      position: 1,
    });

    track({ name: "poll_voted", properties: { is_first_vote: true } });
    expect(posthogMock.capture).toHaveBeenLastCalledWith("poll_voted", {
      is_first_vote: true,
    });
  });

  it("큐는 상한을 넘으면 오래된 것부터 버린다", async () => {
    for (let i = 0; i < MAX_QUEUED_EVENTS + 5; i++) {
      track({
        name: "recommendation_reshuffled",
        properties: { count_in_session: i },
      });
    }
    await initPostHog("phc_test", undefined);
    expect(posthogMock.capture).toHaveBeenCalledTimes(MAX_QUEUED_EVENTS);
    expect(posthogMock.capture.mock.calls[0]?.[1]).toEqual({
      count_in_session: 5,
    });
  });

  it("타입을 우회한 좌표, 개인 정보 속성을 제거하고 개발 모드에서 경고한다", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await initPostHog("phc_test", undefined);
    const sneaky = {
      name: "card_swiped",
      properties: { position: 0, lat: 37.5, nickname: "test_a" },
    } as unknown as AnalyticsEvent;
    track(sneaky);
    expect(posthogMock.capture).toHaveBeenCalledWith("card_swiped", {
      position: 0,
    });
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0]?.[0])).toContain("lat, nickname");
  });

  it("페이지뷰 URL의 좌표 쿼리를 가린다", async () => {
    await initPostHog("phc_test", undefined);
    capturePageview("https://a.kr/map?lat=37.5665&lng=126.978&tab=list");
    expect(posthogMock.capture).toHaveBeenCalledWith("$pageview", {
      $current_url: `https://a.kr/map?lat=${FILTERED}&lng=${FILTERED}&tab=list`,
    });
  });
});

describe("posthogConfig", () => {
  it("autocapture, 페이지뷰 자동 수집, 녹화, 예외 수집을 끄고 요소 텍스트를 가린다", () => {
    const config = posthogConfig(undefined);
    expect(config).toMatchObject({
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: true,
      capture_heatmaps: false,
      capture_exceptions: false,
      mask_all_text: true,
      mask_all_element_attributes: true,
    });
    expect(config.before_send).toBe(posthogBeforeSend);
  });
});

describe("posthogBeforeSend", () => {
  const base = (properties: Record<string, unknown>): CaptureResult =>
    ({ uuid: "u", event: "x", properties }) as CaptureResult;

  it("PostHog가 붙이는 URL 속성과 사람 속성의 좌표를 가린다", () => {
    const out = posthogBeforeSend({
      ...base({
        $current_url: "https://a.kr/map?lat=37.5665&lng=126.978",
        $referrer: "https://a.kr/?x=127.02&y=37.49",
        $pathname: "/map",
      }),
      $set_once: { $initial_current_url: "https://a.kr/?lat=37.5665" },
    });
    const json = JSON.stringify(out);
    expect(json).not.toMatch(/37\.\d|126\.\d|127\.\d/);
    expect(out?.properties.$pathname).toBe("/map");
    expect(out?.properties.$geoip_disable).toBe(true);
  });

  it("autocapture 요소 정보와 히트맵 좌표를 뺀다", () => {
    const out = posthogBeforeSend(
      base({
        $elements_chain: 'a:href="/map?lat=37.5"',
        $el_text: "김밥천국",
        $heatmap_data: { "/": [{ x: 10, y: 20 }] },
        keep: 1,
      }),
    );
    expect(out?.properties).toEqual({ keep: 1, $geoip_disable: true });
  });

  it("카드 순서 position(정수)은 남긴다", () => {
    const out = posthogBeforeSend(base({ position: 2 }));
    expect(out?.properties.position).toBe(2);
  });
});

describe("posthogBeforeSend 초대 코드 가림 (T10.10)", () => {
  const CODE = "Ab3xK9pQz2";
  const ORIGIN = "https://lunchmate-kr.vercel.app";

  // posthog-js 1.438이 자동으로 붙이는 URL, 경로 속성을 이벤트 종류별로 흉내 낸다.
  const urlProps = (path: string) => ({
    $current_url: `${ORIGIN}${path}?from=kakao#top`,
    $pathname: path,
    $host: "lunchmate-kr.vercel.app",
    $referrer: `${ORIGIN}/login?next=%2Fpoll%2F${CODE}`,
    $referring_domain: "lunchmate-kr.vercel.app",
    $prev_pageview_pathname: `/poll/${CODE}`,
    $session_entry_url: `${ORIGIN}/poll/${CODE}?utm_source=kakao`,
    $session_entry_pathname: `/poll/${CODE}`,
    $session_entry_referrer: "$direct",
    $initial_person_info: { r: "$direct", u: `${ORIGIN}/poll/${CODE}` },
  });

  it.each(["$pageview", "$web_vitals", "$pageleave", "poll_joined", "$set"])(
    "%s 이벤트의 어떤 속성에도 초대 코드가 남지 않는다",
    (event) => {
      const out = posthogBeforeSend({
        uuid: "u",
        event,
        properties: {
          ...urlProps(`/poll/${CODE}`),
          $web_vitals_LCP_event: {
            name: "LCP",
            value: 1200,
            $current_url: `${ORIGIN}/poll/${CODE}/result`,
          },
          note: `opened /poll/${CODE} from share`,
        },
        $set: { $current_url: `${ORIGIN}/poll/${CODE}` },
        $set_once: {
          $initial_current_url: `${ORIGIN}/poll/${CODE}?lat=37.5665`,
          $initial_pathname: `/poll/${CODE}`,
          $initial_referrer: `https://talk.kakao.com/poll/${CODE}`,
          $initial_referring_domain: "talk.kakao.com",
        },
      } as CaptureResult);
      const json = JSON.stringify(out);
      expect(json).not.toContain(CODE);
      expect(json).not.toMatch(/37\.\d/);

      const p = out?.properties ?? {};
      expect(p.$current_url).toBe(`${ORIGIN}/poll/[code]`);
      expect(p.$pathname).toBe("/poll/[code]");
      expect(p.$referrer).toBe(`${ORIGIN}/login`);
      expect(p.$prev_pageview_pathname).toBe("/poll/[code]");
      expect(p.$session_entry_url).toBe(`${ORIGIN}/poll/[code]`);
      expect(p.$session_entry_referrer).toBe("$direct");
      expect(p.$host).toBe("lunchmate-kr.vercel.app");
      expect(p.$referring_domain).toBe("lunchmate-kr.vercel.app");
      expect(p.$web_vitals_LCP_event).toMatchObject({
        value: 1200,
        $current_url: `${ORIGIN}/poll/[code]/result`,
      });
      expect(out?.$set_once).toMatchObject({
        $initial_current_url: `${ORIGIN}/poll/[code]`,
        $initial_pathname: "/poll/[code]",
        $initial_referrer: "https://talk.kakao.com/poll/[code]",
        $initial_referring_domain: "talk.kakao.com",
      });
    },
  );

  it("코드가 없는 경로는 그대로, 쿼리와 해시만 버린다", () => {
    const out = posthogBeforeSend({
      uuid: "u",
      event: "$pageview",
      properties: {
        $current_url: `${ORIGIN}/today?q=국밥#card-2`,
        $pathname: "/poll",
        $referrer: "$direct",
        card_id: "c1",
      },
    } as CaptureResult);
    expect(out?.properties).toMatchObject({
      $current_url: `${ORIGIN}/today`,
      $pathname: "/poll",
      $referrer: "$direct",
      card_id: "c1",
    });
  });

  it.each([
    [`${ORIGIN}/poll/${CODE}`, `${ORIGIN}/poll/[code]`],
    [`${ORIGIN}/poll/[code]`, `${ORIGIN}/poll/[code]`],
    [`/poll/${CODE}/result?x=1`, "/poll/[code]/result"],
    ["$direct", "$direct"],
    ["", ""],
  ])("maskUrlValue(%s) → %s", (input, expected) => {
    expect(maskUrlValue(input)).toBe(expected);
  });
});
