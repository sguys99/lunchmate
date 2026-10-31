"use client";
// 카카오 검색 쿼리 (T4.16, T4.17). 결과는 TanStack Query 세션 메모리에만 둔다(CLAUDE.md 7장, T0.16).
// 래퍼(src/lib/kakao/local.ts)가 1회 재시도하므로 여기서는 재시도하지 않는다.
import { useQuery } from "@tanstack/react-query";
import { searchLocation } from "@/lib/kakao/local";
import { nearbyCountQuery } from "@/lib/kakao/queries";
import { NEARBY_FETCH_RADIUS } from "./nearby";
import type { UserPinnedLatLng } from "./pin";

/** 검색어(입력이 멈추거나 제출한 값, 2자 이상)로 위치를 찾는다 */
export function useLocationSearch(term: string) {
  const query = term.trim();
  const result = useQuery({
    queryKey: ["kakao", "location-search", query],
    queryFn: () => searchLocation(query),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  return { query, ...result };
}

/** 핀 둘레 도보 20분 반경의 음식점(가까운 순 최대 45곳). 2단계에서 슬라이더가 이 안에서 다시 센다 */
export function useNearbyRestaurants(
  pin: UserPinnedLatLng | null,
  enabled: boolean,
) {
  // 쿼리 키와 옵션은 공통 래퍼(src/lib/kakao/queries.ts, T5.12)가 정한다. 핀이 없으면 쓰이지 않는 자리 값으로 만든다
  return useQuery({
    ...nearbyCountQuery(pin ?? { lat: 0, lng: 0 }, NEARBY_FETCH_RADIUS),
    enabled: enabled && pin !== null,
  });
}
