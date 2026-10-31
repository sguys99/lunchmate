import { beforeEach, describe, expect, it, vi } from "vitest";
import { sanitizeEventProperties } from "@/lib/analytics/events";
import {
  cardSwiped,
  firstShow,
  justPickClicked,
  recommendationReshuffled,
  recommendationShown,
  resetShownForTest,
  todayEvent,
} from "./events";

const trackMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics/track", () => ({ track: trackMock }));

describe("오늘(홈) 분석 이벤트 (PRD 10.2절, T5.39에서 전송)", () => {
  it("recommendation_shown: 현위치는 origin current, place_id만 싣는다", () => {
    const e = recommendationShown({
      meal: "lunch",
      baseKind: "here",
      algoVersion: "v",
      placeIds: ["1", "2", "3"],
    });
    expect(e).toEqual({
      name: "recommendation_shown",
      properties: {
        meal: "lunch",
        origin: "current",
        algo_version: "v",
        place_ids: ["1", "2", "3"],
      },
    });
    expect(sanitizeEventProperties(e.properties).dropped).toEqual([]);
  });

  it("다시 뽑기 횟수와 그냥 골라줘 결과", () => {
    expect(recommendationReshuffled(2).properties).toEqual({
      count_in_session: 2,
    });
    expect(justPickClicked("dinner", "9").properties).toEqual({
      meal: "dinner",
      picked_place_id: "9",
    });
  });
});

describe("T5.39 전송", () => {
  beforeEach(() => {
    trackMock.mockClear();
    resetShownForTest();
  });

  it("todayEvent는 track으로 그대로 보낸다", () => {
    const e = recommendationReshuffled(1);
    todayEvent(e);
    expect(trackMock).toHaveBeenCalledWith(e);
  });

  it("card_swiped는 position만 싣는다", () => {
    const e = cardSwiped(2);
    expect(e).toEqual({ name: "card_swiped", properties: { position: 2 } });
    expect(sanitizeEventProperties(e.properties).dropped).toEqual([]);
  });

  it("같은 묶음의 recommendation_shown은 한 번만", () => {
    expect(firstShow("1:a,b,c")).toBe(true);
    expect(firstShow("1:a,b,c")).toBe(false);
    expect(firstShow("2:d,e,f")).toBe(true);
    expect(firstShow("1:a,b,c")).toBe(true);
  });
});
