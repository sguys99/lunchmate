"use client";
// 카카오 검색 쿼리 (T4.16, T4.17). 결과는 TanStack Query 세션 메모리에만 둔다(CLAUDE.md 7장, T0.16).
// 래퍼(src/lib/kakao/local.ts)가 1회 재시도하므로 여기서는 재시도하지 않는다.
import { useQuery } from "@tanstack/react-query";
import {
  nearbyRestaurants,
  searchLocation,
  type NearbyRestaurant,
} from "@/lib/kakao/local";
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
  return useQuery<{ places: NearbyRestaurant[]; capped: boolean }>({
    queryKey: [
      "kakao",
      "nearby-fd6",
      pin ? pin.lat.toFixed(5) : null,
      pin ? pin.lng.toFixed(5) : null,
    ],
    queryFn: () => nearbyRestaurants(pin!, NEARBY_FETCH_RADIUS),
    enabled: enabled && pin !== null,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}
