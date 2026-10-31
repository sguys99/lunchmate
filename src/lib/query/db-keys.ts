// 우리 DB(Supabase) 데이터의 TanStack Query 키와 쓰기 뒤 무효화 (T6.8~T6.24). 카카오 키는 src/lib/kakao/queries.ts.
// - 키에는 place_id, 날짜 키, 쪽 번호만 넣는다. 좌표, 장소명은 넣지 않는다(CLAUDE.md 7장).
// - 세션 메모리 캐시만(src/lib/query/client.ts). 로그아웃, 탈퇴 때는 dbKeys.all을 지운다.
import type { QueryClient } from "@tanstack/react-query";

export const dbKeys = {
  all: ["db"] as const,
  /** place_stats 묶음. id는 정렬해 같은 묶음이 같은 키가 되게 한다 */
  placeStats: (placeIds: readonly string[]) =>
    ["db", "place-stats", [...new Set(placeIds)].sort().join(",")] as const,
  placeStatsAll: ["db", "place-stats"] as const,
  placeReviews: (placeId: string) => ["db", "place-reviews", placeId] as const,
  placeDeals: (placeId: string) => ["db", "place-deals", placeId] as const,
  /** 내 기록(방문, 후기, 장소, 한도). 사용자마다 다르므로 로그아웃 때 함께 지운다 */
  me: ["db", "me"] as const,
  myVisits: (from: string, to: string, placeId?: string) =>
    ["db", "me", "visits", from, to, placeId ?? "all"] as const,
  myVisitsAll: ["db", "me", "visits"] as const,
  myReviews: (placeId?: string) =>
    ["db", "me", "reviews", placeId ?? "all"] as const,
  myReviewsAll: ["db", "me", "reviews"] as const,
  myPlaces: ["db", "me", "places"] as const,
  dailyLimits: ["db", "me", "daily-limits"] as const,
};

/** 쓰기 종류. 무엇을 다시 불러야 하는지 정한다 */
export type DbWriteKind =
  /** 👍/👎, 안 갔어요, 후기 저장, 수정, 삭제, 상세에서 쓰기 */
  | "review"
  /** 물은 시각 기록(띠 대상만 바뀐다) */
  | "prompt"
  /** 후기 신고, 할인 신고 */
  | "report"
  /** 식당 정보 제보 */
  | "place-report"
  /** 할인 등록, 아직 해요, 끝났어요, 되돌리기 */
  | "deal"
  /** 웨이팅 제보, 되돌리기 */
  | "wait"
  /** 즐겨찾기, 다시 안 갈 곳 */
  | "my-places";

/**
 * 쓰기 성공 뒤 관련 쿼리를 다시 부른다. placeId를 알면 그 식당 것만, 모르면 집계 전체.
 * 홈 추천이 쓰는 place_stats 묶음은 접두(placeStatsAll)로 함께 무효화된다.
 */
export function invalidateAfterWrite(
  client: QueryClient,
  kind: DbWriteKind,
  placeId?: string,
): Promise<void> {
  const keys: (readonly unknown[])[] = [];
  const placeScoped = (key: (id: string) => readonly unknown[]) =>
    keys.push(placeId ? key(placeId) : key("").slice(0, 2));
  switch (kind) {
    case "review":
      keys.push(dbKeys.myVisitsAll, dbKeys.myReviewsAll, dbKeys.dailyLimits);
      keys.push(dbKeys.placeStatsAll);
      placeScoped(dbKeys.placeReviews);
      break;
    case "prompt":
      keys.push(dbKeys.myVisitsAll);
      break;
    case "report":
      keys.push(dbKeys.dailyLimits);
      placeScoped(dbKeys.placeReviews);
      placeScoped(dbKeys.placeDeals);
      keys.push(dbKeys.placeStatsAll);
      break;
    case "place-report":
      keys.push(dbKeys.dailyLimits, dbKeys.placeStatsAll);
      break;
    case "deal":
      keys.push(dbKeys.dailyLimits, dbKeys.placeStatsAll);
      placeScoped(dbKeys.placeDeals);
      break;
    case "wait":
      keys.push(dbKeys.placeStatsAll);
      break;
    case "my-places":
      keys.push(dbKeys.myPlaces);
      break;
  }
  return Promise.all(
    keys.map((queryKey) => client.invalidateQueries({ queryKey })),
  ).then(() => undefined);
}

/** 로그아웃, 탈퇴 때 사용자 데이터 캐시 비우기 */
export function clearMyData(client: QueryClient): void {
  client.removeQueries({ queryKey: dbKeys.me });
  client.removeQueries({ queryKey: ["db", "place-reviews"] });
  client.removeQueries({ queryKey: ["db", "place-deals"] });
}
