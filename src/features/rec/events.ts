// 오늘(홈) 분석 이벤트 (PRD 10.2절, T5.39). 만드는 함수는 순수 함수이고, 화면은 이벤트가 생기는 자리에서 todayEvent()로 보낸다.
// 속성에는 place_id만 넣는다. 장소명, 좌표(현위치 포함)는 넣지 않는다(CLAUDE.md 7장). track()이 금지 키를 한 번 더 거른다.
// 길찾기(directions_clicked)는 상세와 같은 흐름(features/place/directions-flow.ts)이 보내고,
// 홈 더 보기의 즐겨찾기(favorite_added, source rec)는 상세와 같은 useFavorite가 보낸다. 여기서 다시 보내지 않는다.
import type { AnalyticsEvent } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
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

export function recommendationReshuffled(
  countInSession: number,
): AnalyticsEvent {
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
 * card_swiped (PRD 10.2 position). D1에는 넘기기가 없어, 같은 뜻인 "대안을 큰 카드로 올림"에 보낸다(T5.39 결정).
 * position은 올린 카드의 묶음 안 순서(0부터, 0이 처음 큰 카드)다. 화면 좌표가 아니다.
 */
export function cardSwiped(position: number): AnalyticsEvent {
  return { name: "card_swiped", properties: { position } };
}

let lastShown: string | null = null;

/**
 * recommendation_shown 중복 막기. 같은 묶음(회차와 곳 목록이 같음)은 탭을 오가 화면이 다시 그려져도 한 번만 보낸다.
 * 처음이면 true. 새로고침하면 다시 보낸다(세션 상태와 같은 수명).
 */
export function firstShow(key: string): boolean {
  if (lastShown === key) return false;
  lastShown = key;
  return true;
}

/** 테스트 전용 */
export function resetShownForTest(): void {
  lastShown = null;
}

/** 이벤트 보내기. PostHog가 아직 없으면 track이 큐에 쌓는다 */
export function todayEvent(event: AnalyticsEvent): void {
  track(event);
}
