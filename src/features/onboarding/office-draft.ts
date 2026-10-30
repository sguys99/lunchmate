// 온보딩 1단계 핀 상태 (T4.16, ONB-01, D-07 안건 1, AC-ONB-3). 순수 함수(React, DOM 없음).
//
// - 핀은 사용자가 놓는다(pinFromGesture). 처음, 검색 이동, 현위치 이동 직후에는 비어 있다.
// - 검색, 현위치 동작("map-moved")은 좌표를 싣지 않는다. 리듀서는 그 좌표를 볼 수도 저장할 수도 없다.
// - 저장 요청 값(officeSaveInput)은 핀 좌표만 담는다. 이름, 주소, 검색 좌표, 현위치 좌표는 없다.
import { pinFromGesture, type PinGesture, type UserPinnedLatLng } from "./pin";

export type OfficeDraft = {
  /** 사용자가 놓은 핀. null이면 저장 버튼이 꺼진다 */
  readonly pin: UserPinnedLatLng | null;
};

export type OfficeAction =
  /** 검색 결과 또는 현위치로 지도 중심이 옮겨짐(좌표 없음). 핀을 비운다 */
  | { readonly type: "map-moved"; readonly by: "search" | "current-location" }
  /** 사용자가 핀을 놓음 */
  | { readonly type: "pin"; readonly gesture: PinGesture }
  /** 핀 지우기 */
  | { readonly type: "clear" };

export const EMPTY_OFFICE_DRAFT: OfficeDraft = { pin: null };

export function officeReducer(
  draft: OfficeDraft,
  action: OfficeAction,
): OfficeDraft {
  switch (action.type) {
    case "map-moved":
    case "clear":
      return EMPTY_OFFICE_DRAFT;
    case "pin": {
      const pin = pinFromGesture(action.gesture);
      return pin ? { pin } : draft;
    }
  }
}

declare const officeSaveBrand: unique symbol;

/** 사무실 저장 요청 값. officeSaveInput()으로만 만든다(핀 좌표만) */
export type OfficeSaveInput = {
  readonly lat: number;
  readonly lng: number;
  readonly [officeSaveBrand]: true;
};

export function officeSaveInput(draft: OfficeDraft): OfficeSaveInput | null {
  if (!draft.pin) return null;
  return { lat: draft.pin.lat, lng: draft.pin.lng } as OfficeSaveInput;
}

/** 저장 버튼을 켤 수 있는가: 핀을 놓는 동작이 있었을 때만 */
export function canSaveOffice(draft: OfficeDraft): boolean {
  return draft.pin !== null;
}
