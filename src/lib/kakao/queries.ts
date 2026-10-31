// 카카오 로컬 검색의 TanStack Query 키와 옵션 (T5.12). 화면은 이 옵션으로만 카카오 결과를 캐시한다.
//
// 캐시 규칙 (CLAUDE.md 7장, research-notes T0.16-3)
// - 세션 메모리(QueryClient)만. persist, localStorage, 서버 캐시 금지. gcTime은 src/lib/query 기본값(5분)을 따른다.
// - 재시도는 래퍼(local.ts)가 1회 하므로 여기서는 retry: false (두 번 겹쳐 4회가 되지 않게).
// - 이름이 들어 있는 결과는 모두 KAKAO_PLACES_KEY 아래에 둔다. 장소 이름 해석(T5.12a)의 1단계가
//   이 접두로 세션 메모리를 훑는다. 새 검색 화면을 만들면 이 파일에 옵션을 추가한다.
// - 쿼리 키의 좌표는 메모리 안에서만 쓰인다. 키를 로그, 분석 이벤트, 서버로 보내지 않는다.
import { queryOptions } from "@tanstack/react-query";
import type { Bounds, LatLng } from "@/lib/map/types";
import {
  nearbyRestaurants,
  searchRestaurants,
  searchRestaurantsInRect,
  toKakaoRect,
} from "./local";

/** 이름이 들어 있는 카카오 장소 결과의 공통 접두 */
export const KAKAO_PLACES_KEY = ["kakao", "places"] as const;

/** 좌표 키는 소수 5자리(약 1m)로 맞춰 같은 핀의 미세한 떨림이 새 요청이 되지 않게 한다 */
const coord = (p: LatLng) => [p.lat.toFixed(5), p.lng.toFixed(5)] as const;

export const kakaoKeys = {
  all: ["kakao"] as const,
  places: KAKAO_PLACES_KEY,
  radius: (center: LatLng, radius: number) =>
    [
      ...KAKAO_PLACES_KEY,
      "radius",
      ...coord(center),
      Math.round(radius),
    ] as const,
  rect: (bounds: Bounds, sortFrom: LatLng) =>
    [
      ...KAKAO_PLACES_KEY,
      "rect",
      toKakaoRect(bounds),
      ...coord(sortFrom),
    ] as const,
  /** 온보딩 개수 세기(이름 없음). 이름 해석 대상이 아니라 places 접두 밖에 둔다 */
  nearbyCount: (center: LatLng, radius: number) =>
    ["kakao", "nearby-fd6", ...coord(center), Math.round(radius)] as const,
};

/** 결과를 다시 받지 않는 시간. 같은 화면 왕복에서 호출 한도를 아낀다(gcTime 5분 안) */
export const KAKAO_PLACES_STALE_MS = 5 * 60 * 1000;

/** 기준점 반경 FD6 전체 정보(추천, 지도, 이름 해석) */
export function restaurantsInRadiusQuery(center: LatLng, radius: number) {
  return queryOptions({
    queryKey: kakaoKeys.radius(center, radius),
    queryFn: () => searchRestaurants(center, radius),
    staleTime: KAKAO_PLACES_STALE_MS,
    retry: false,
  });
}

/** 사각 영역 FD6(이름 해석의 사분면 추가 검색) */
export function restaurantsInRectQuery(bounds: Bounds, sortFrom: LatLng) {
  return queryOptions({
    queryKey: kakaoKeys.rect(bounds, sortFrom),
    queryFn: () => searchRestaurantsInRect(bounds, sortFrom),
    staleTime: KAKAO_PLACES_STALE_MS,
    retry: false,
  });
}

/** 온보딩 "이 거리 안의 식당 약 N곳"(이름 없음) */
export function nearbyCountQuery(center: LatLng, radius: number) {
  return queryOptions({
    queryKey: kakaoKeys.nearbyCount(center, radius),
    queryFn: () => nearbyRestaurants(center, radius),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}
