// 사무실 핀과 지도 이동 좌표를 타입으로 나눈다 (T4.16, ONB-01, AC-ONB-3, T0.16, T0.18).
//
// 규칙
// - 저장할 수 있는 좌표는 UserPinnedLatLng 하나뿐이다. 이 타입은 pinFromGesture()로만 만들 수 있고,
//   pinFromGesture는 사용자의 핀 놓기 동작(지도 누르기, 핀 끌기 끝, 키보드 Enter)만 받는다.
// - 검색 결과와 현위치 좌표는 MapMoveTarget이다. 지도 중심을 옮기는 데만 쓰고(moveMap), 핀 상태(office-draft.ts)와
//   저장 요청(OfficeSaveInput)에는 들어갈 수 없다. 두 브랜드는 서로 대입되지 않는다(pin.test.ts의 타입 단언).
// - 두 경로는 모듈도 나뉜다: 핀 상태 리듀서는 MapMoveTarget을 import하지 않고, 지도 이동 동작에는 좌표를 싣지 않는다.
import type { LatLng } from "@/lib/map/types";

declare const pinnedBrand: unique symbol;
declare const moveBrand: unique symbol;

/** 사용자가 지도에 직접 놓은 핀 좌표. 저장 가능한 유일한 좌표 */
export type UserPinnedLatLng = LatLng & { readonly [pinnedBrand]: true };

/** 지도 이동 전용 좌표(검색 결과, 현위치). 저장 불가 */
export type MapMoveTarget = LatLng & {
  readonly [moveBrand]: "search" | "current-location";
};

/** 사용자의 핀 놓기 동작 */
export type PinGesture =
  | { readonly kind: "map-tap"; readonly position: LatLng }
  | { readonly kind: "pin-drag-end"; readonly position: LatLng }
  /** 키보드: 방향키로 지도를 옮긴 뒤 Enter로 지도 가운데에 핀 */
  | { readonly kind: "keyboard-center"; readonly position: LatLng };

export const PIN_GESTURES: readonly PinGesture["kind"][] = [
  "map-tap",
  "pin-drag-end",
  "keyboard-center",
];

function isFiniteLatLng(p: LatLng): boolean {
  return Number.isFinite(p.lat) && Number.isFinite(p.lng);
}

/** 사용자의 핀 놓기 동작에서만 핀 좌표를 만든다. 다른 값(검색, 현위치)은 넣을 수 없다 */
export function pinFromGesture(gesture: PinGesture): UserPinnedLatLng | null {
  if (!PIN_GESTURES.includes(gesture.kind)) return null;
  if (!isFiniteLatLng(gesture.position)) return null;
  return {
    lat: gesture.position.lat,
    lng: gesture.position.lng,
  } as UserPinnedLatLng;
}

/** 검색 결과, 현위치 좌표를 지도 이동 전용으로 표시한다 */
export function mapMoveTarget(
  position: LatLng,
  source: "search" | "current-location",
): MapMoveTarget {
  void source;
  return { lat: position.lat, lng: position.lng } as MapMoveTarget;
}
