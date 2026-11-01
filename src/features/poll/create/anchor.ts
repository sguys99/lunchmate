// 투표방 기준점과 반경 (T7.6, D-15 안건 10). 순수 함수.
// 기준점은 방장 사무실 핀(저장 값) 또는 방장이 지도에서 찍은 점이다. 현위치 좌표는 넣지 않는다(T0.16-1).
// 반경은 후보까지 가장 먼 거리 + 여유. 친구 브라우저가 이 반경으로 FD6를 찾아 후보 이름을 맞춘다(T5.12a).
// 후보 좌표는 세션 메모리에서 거리 계산에만 쓰고 서버로 보내지 않는다(숫자 반경만 저장).
// 홈 첫 로드에 들어가는 파일이라 카카오 모듈(resolve-place-names, rec/candidates)을 가져오지 않는다.
import { searchRadiusFromWalkMinutes } from "@/lib/format/number";
import type { LatLng } from "@/lib/map/types";
import type { PollAnchor } from "./intent";

/** DB polls_radius_range와 같다 */
export const RADIUS_MIN_M = 100;
export const RADIUS_MAX_M = 3000;
/** 가장 먼 후보 바깥 여유 */
export const RADIUS_MARGIN_M = 200;
/** 좌표를 모를 때 반경. T5.12a 이름 찾기 기본 반경(DEFAULT_RESOLVE_RADIUS, 도보 20분)과 같다 */
export const DEFAULT_ANCHOR_RADIUS_M = searchRadiusFromWalkMinutes(20);

const EARTH_RADIUS_M = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** 두 좌표 사이 직선거리(m, 하버사인). rec/candidates.ts straightDistanceM과 같은 식 */
export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function clampRadius(m: number): number {
  return Math.min(RADIUS_MAX_M, Math.max(RADIUS_MIN_M, Math.round(m)));
}

/**
 * 기준점과 후보 좌표(아는 것만)로 반경을 정한다. 좌표를 아는 후보가 없으면 이름 찾기 기본 반경.
 * outside: 반경 상한(3km)을 넘어 이름을 못 찾을 수 있는 후보가 있다(시트가 "기준 바꾸기"를 강조).
 */
export function anchorFor(
  base: LatLng,
  positions: readonly (LatLng | null | undefined)[],
): PollAnchor & { outside: boolean } {
  const known = positions.filter((p): p is LatLng => Boolean(p));
  if (known.length === 0)
    return {
      lat: base.lat,
      lng: base.lng,
      radiusM: clampRadius(DEFAULT_ANCHOR_RADIUS_M),
      outside: false,
    };
  const far = Math.max(...known.map((p) => distanceM(base, p)));
  const want = far + RADIUS_MARGIN_M;
  return {
    lat: base.lat,
    lng: base.lng,
    radiusM: clampRadius(want),
    outside: want > RADIUS_MAX_M,
  };
}
