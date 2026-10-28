import { describe, expect, expectTypeOf, it } from "vitest";
import {
  FORBIDDEN_PROPERTY_KEYS,
  sanitizeEventProperties,
  type AnalyticsEvent,
  type AnalyticsEventMap,
  type AnalyticsEventName,
} from "./events";
import { FILTERED } from "./scrub";

// 타입 테스트는 pnpm typecheck(tsc)가 검사한다. @ts-expect-error 줄에 오류가 없으면 typecheck가 실패한다.
describe("이벤트 타입", () => {
  it("PRD 10.2절 이벤트 이름을 모두 갖는다", () => {
    expectTypeOf<AnalyticsEventName>().toEqualTypeOf<
      | "onboarding_step_completed"
      | "recommendation_shown"
      | "recommendation_reshuffled"
      | "card_swiped"
      | "directions_clicked"
      | "feedback_submitted"
      | "poll_created"
      | "poll_link_shared"
      | "poll_invite_opened"
      | "poll_voted"
      | "poll_closed"
      | "party_searched"
      | "report_submitted"
      | "just_pick_clicked"
      | "wait_reported"
      | "deal_reported"
      | "deal_viewed"
      | "deal_checked"
      | "poll_result_shared"
      | "login_started"
      | "login_completed"
      | "feedback_prompt_shown"
      | "favorite_added"
      | "poll_candidate_added"
    >();
  });

  it("recommendation_shown은 algo_version을 필수로 갖는다", () => {
    expectTypeOf<
      AnalyticsEventMap["recommendation_shown"]["algo_version"]
    >().toEqualTypeOf<string>();
  });

  it("이름에 맞는 속성만 받는다", () => {
    const ok: AnalyticsEvent[] = [
      { name: "card_swiped", properties: { position: 2 } },
      {
        name: "recommendation_shown",
        properties: {
          meal: "lunch",
          origin: "office",
          algo_version: "v1",
          place_ids: ["1", "2", "3"],
        },
      },
    ];
    expect(ok).toHaveLength(2);

    const wrongSource: AnalyticsEvent = {
      name: "directions_clicked",
      // @ts-expect-error source는 rec, map, poll만 허용
      properties: { place_id: "1", source: "home", app_or_web: "app" },
    };
    const missing: AnalyticsEvent = {
      name: "onboarding_step_completed",
      // @ts-expect-error 필수 속성(skipped) 누락
      properties: { step: 1 },
    };
    // @ts-expect-error PRD에 없는 이벤트 이름
    const unknown: AnalyticsEvent = { name: "page_opened", properties: {} };
    expect([wrongSource, missing, unknown]).toHaveLength(3);
  });

  it("좌표와 개인 식별 키는 리터럴이든 변수든 타입에서 막는다", () => {
    const literal: AnalyticsEvent = {
      name: "card_swiped",
      // @ts-expect-error 좌표 키 금지
      properties: { position: 0, lat: 37.5 },
    };

    // 변수로 넘기면 초과 속성 검사가 빠지지만 금지 키는 never라서 막힌다.
    const withCoords = { position: 0, lng: 126.9 };
    const viaVariable: AnalyticsEvent = {
      name: "card_swiped",
      // @ts-expect-error lng는 never
      properties: withCoords,
    };
    const withNickname = {
      place_id: "1",
      source: "rec" as const,
      nickname: "a",
    };
    const pii: AnalyticsEvent = {
      name: "favorite_added",
      // @ts-expect-error nickname은 never
      properties: withNickname,
    };
    expect([literal, viaVariable, pii]).toHaveLength(3);
  });
});

describe("sanitizeEventProperties", () => {
  it("정상 속성은 그대로 둔다", () => {
    const props = {
      meal: "dinner",
      origin: "current",
      algo_version: "v1",
      place_ids: ["10", "20"],
    };
    expect(sanitizeEventProperties(props)).toEqual({
      properties: props,
      dropped: [],
    });
  });

  it("금지 키를 모두 제거한다", () => {
    for (const key of FORBIDDEN_PROPERTY_KEYS) {
      const { properties, dropped } = sanitizeEventProperties({
        [key]: "v",
        keep: 1,
      });
      expect(properties).toEqual({ keep: 1 });
      expect(dropped).toEqual([key]);
    }
  });

  it("대소문자, 접미형 좌표 키도 제거한다", () => {
    const { properties, dropped } = sanitizeEventProperties({
      Latitude: 37.5,
      office_lat: 37.5,
      centerLng: 127,
      Email: "a@b.kr",
      position: 3,
    });
    expect(properties).toEqual({ position: 3 });
    expect(dropped.sort()).toEqual(
      ["Email", "Latitude", "centerLng", "office_lat"].sort(),
    );
  });

  it("객체 값, 숫자 배열, NaN을 제거하고 undefined는 조용히 뺀다", () => {
    const { properties, dropped } = sanitizeEventProperties({
      nested: { lat: 37.5 },
      nums: [37.5, 127],
      bad: Number.NaN,
      skip: undefined,
      ok: null,
    });
    expect(properties).toEqual({ ok: null });
    expect(dropped.sort()).toEqual(["bad", "nested", "nums"]);
  });

  it("문자열 값 안의 좌표를 가린다", () => {
    const { properties } = sanitizeEventProperties({
      screen: "/map?lat=37.5665&lng=126.978",
      reason: "at 37.5665, 126.9780",
    });
    expect(properties.screen).toBe(`/map?lat=${FILTERED}&lng=${FILTERED}`);
    expect(properties.reason).toBe(`at ${FILTERED}`);
  });

  it("입력을 바꾸지 않는다", () => {
    const input = { lat: 1, keep: "a" };
    sanitizeEventProperties(input);
    expect(input).toEqual({ lat: 1, keep: "a" });
  });
});
