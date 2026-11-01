// 회식 모드 분석 이벤트 (T7.30, PRD 10.2 party_searched). 만드는 함수는 순수 함수다.
// 속성은 PRD 그대로(headcount, budget, room, alcohol, result_count). 장소 id, 이름, 좌표는 넣지 않는다(CLAUDE.md 7장).
import type { AnalyticsEvent } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import type { PartyConditions } from "./conditions";

export function partySearched(
  c: PartyConditions,
  resultCount: number,
): AnalyticsEvent {
  return {
    name: "party_searched",
    properties: {
      headcount: c.headcount,
      budget: c.budget,
      room: c.room,
      alcohol: c.alcohol,
      result_count: resultCount,
    },
  };
}

let lastSearched: string | null = null;

/** 같은 조건과 결과 수는 화면이 다시 그려져도 한 번만 보낸다. 처음이면 true */
export function firstSearch(key: string): boolean {
  if (lastSearched === key) return false;
  lastSearched = key;
  return true;
}

export function partyEvent(event: AnalyticsEvent): void {
  track(event);
}
