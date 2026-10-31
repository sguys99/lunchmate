import { describe, expect, it } from "vitest";
import { sanitizeEventProperties } from "@/lib/analytics/events";
import {
  justPickClicked,
  recommendationReshuffled,
  recommendationShown,
} from "./events";

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
