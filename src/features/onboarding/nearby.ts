// 2단계 "이 거리 안의 식당 약 N곳" 계산 (ONB-02, D-07 안건 5). 순수 함수.
// 카카오 FD6 검색은 가장 넓은 반경(도보 20분)으로 가까운 순 최대 45곳을 한 번만 받고, 슬라이더를 움직이면
// 그 안에서 반경 안 개수만 다시 센다(요청 없음). 가까운 순 45곳 중 k곳이 반경 안이고 k < 45이면 반경 안 식당은 정확히 k곳이다.
// 45곳 모두 반경 안이고 카카오 상한에 닿았으면 "45곳 이상"이다.
import { KAKAO_RESULT_CAP, type NearbyRestaurant } from "@/lib/kakao/local";
import { searchRadiusFromWalkMinutes } from "@/lib/format";
import { PREF_RANGES } from "./constants";

/** 한 번에 받는 반경: 도보 최대 분(20분)의 반경 */
export const NEARBY_FETCH_RADIUS = searchRadiusFromWalkMinutes(
  PREF_RANGES.walk.max,
);

export type NearbyCount = { count: number; atLeast: boolean };

export function countNearby(
  places: readonly NearbyRestaurant[],
  capped: boolean,
  radius: number,
): NearbyCount {
  const inside = places.filter((p) => p.distance <= radius).length;
  const atLeast =
    capped && inside >= KAKAO_RESULT_CAP && inside === places.length;
  return { count: Math.min(inside, KAKAO_RESULT_CAP), atLeast };
}
