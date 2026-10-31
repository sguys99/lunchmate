// 오늘(홈) 분석 이벤트 만들기 (PRD 10.2절). 순수 함수. 보내기(track 연결)는 T5.39에서 한다.
// 화면은 이벤트가 생기는 자리에서 todayEvent()를 부르고, 지금은 아무것도 보내지 않는다.
// 속성에는 place_id만 넣는다. 장소명, 좌표(현위치 포함)는 넣지 않는다(CLAUDE.md 7장).
import type { AnalyticsEvent } from "@/lib/analytics/events";
import type { Meal } from "@/lib/time";

export function recommendationShown(args: {
  meal: Meal;
  baseKind: "office" | "here";
  algoVersion: string;
  placeIds: readonly string[];
}): AnalyticsEvent {
  return {
    name: "recommendation_shown",
    properties: {
      meal: args.meal,
      origin: args.baseKind === "here" ? "current" : "office",
      algo_version: args.algoVersion,
      place_ids: args.placeIds,
    },
  };
}

export function recommendationReshuffled(countInSession: number): AnalyticsEvent {
  return {
    name: "recommendation_reshuffled",
    properties: { count_in_session: countInSession },
  };
}

export function justPickClicked(meal: Meal, placeId: string): AnalyticsEvent {
  return {
    name: "just_pick_clicked",
    properties: { meal, picked_place_id: placeId },
  };
}

/**
 * 이벤트를 보낼 자리. T5.39에서 track(event)로 바꾼다(그때 recommendation_shown 중복 방지도 함께 정한다).
 * 지금은 호출 지점만 정리해 두고 보내지 않는다.
 */
export function todayEvent(event: AnalyticsEvent): void {
  void event;
}
