// AC-ONB-3: 현위치 버튼과 주소 검색 결과 좌표는 사무실 저장 요청에 들어가지 않는다 (T4.16, T0.18).
// 타입 단언(@ts-expect-error)은 pnpm typecheck가, 동작은 vitest가 확인한다.
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  canSaveOffice,
  EMPTY_OFFICE_DRAFT,
  officeReducer,
  officeSaveInput,
  type OfficeDraft,
  type OfficeSaveInput,
} from "./office-draft";
import {
  mapMoveTarget,
  pinFromGesture,
  type MapMoveTarget,
  type UserPinnedLatLng,
} from "./pin";

const SEARCH = { lat: 37.5013, lng: 127.0396 };
const CURRENT = { lat: 37.4979, lng: 127.0276 };
const TAP = { lat: 37.5021, lng: 127.0411 };
const DRAG = { lat: 37.5024, lng: 127.0418 };

describe("핀 좌표와 지도 이동 좌표는 타입이 다르다", () => {
  it("검색, 현위치 좌표는 핀 좌표나 저장 값으로 쓸 수 없다", () => {
    const search = mapMoveTarget(SEARCH, "search");
    const current = mapMoveTarget(CURRENT, "current-location");
    // @ts-expect-error 지도 이동 좌표는 핀 좌표가 아니다
    const asPin: UserPinnedLatLng = search;
    // @ts-expect-error 현위치 좌표는 저장 값이 아니다
    const asSave: OfficeSaveInput = current;
    // @ts-expect-error 맨 좌표도 핀 좌표가 아니다(pinFromGesture로만 만든다)
    const plain: UserPinnedLatLng = TAP;
    // @ts-expect-error 맨 좌표는 저장 값이 아니다
    const plainSave: OfficeSaveInput = TAP;
    // @ts-expect-error 핀 상태에 지도 이동 좌표를 넣을 수 없다
    const draft: OfficeDraft = { pin: search };
    void [asPin, asSave, plain, plainSave, draft];

    expectTypeOf<MapMoveTarget>().not.toExtend<UserPinnedLatLng>();
    expectTypeOf<UserPinnedLatLng>().not.toExtend<MapMoveTarget>();
  });

  it("지도 이동 동작에는 좌표를 실을 수 없다", () => {
    officeReducer(EMPTY_OFFICE_DRAFT, {
      type: "map-moved",
      by: "search",
      // @ts-expect-error 지도 이동 동작은 좌표를 받지 않는다
      to: SEARCH,
    });
  });
});

describe("핀 상태 리듀서 (D-07 안건 1)", () => {
  it("처음에는 핀이 없고 저장할 수 없다", () => {
    expect(canSaveOffice(EMPTY_OFFICE_DRAFT)).toBe(false);
    expect(officeSaveInput(EMPTY_OFFICE_DRAFT)).toBeNull();
  });

  it("검색 이동, 현위치 이동 직후에는 핀을 비운다", () => {
    const placed = officeReducer(EMPTY_OFFICE_DRAFT, {
      type: "pin",
      gesture: { kind: "map-tap", position: TAP },
    });
    expect(canSaveOffice(placed)).toBe(true);
    const afterSearch = officeReducer(placed, {
      type: "map-moved",
      by: "search",
    });
    expect(afterSearch.pin).toBeNull();
    expect(officeSaveInput(afterSearch)).toBeNull();
    const afterLocate = officeReducer(placed, {
      type: "map-moved",
      by: "current-location",
    });
    expect(afterLocate.pin).toBeNull();
  });

  it.each(["map-tap", "pin-drag-end", "keyboard-center"] as const)(
    "%s 동작으로 놓은 핀 좌표만 저장 값이 된다",
    (kind) => {
      let d = officeReducer(EMPTY_OFFICE_DRAFT, {
        type: "map-moved",
        by: "search",
      });
      d = officeReducer(d, { type: "pin", gesture: { kind, position: TAP } });
      expect(officeSaveInput(d)).toEqual({ lat: TAP.lat, lng: TAP.lng });
    },
  );

  it("핀을 끌어 옮기면 마지막 위치를 저장한다", () => {
    let d = officeReducer(EMPTY_OFFICE_DRAFT, {
      type: "pin",
      gesture: { kind: "map-tap", position: TAP },
    });
    d = officeReducer(d, {
      type: "pin",
      gesture: { kind: "pin-drag-end", position: DRAG },
    });
    expect(officeSaveInput(d)).toEqual(DRAG);
  });

  it("저장 값에는 위도, 경도 말고 다른 키가 없다", () => {
    const d = officeReducer(EMPTY_OFFICE_DRAFT, {
      type: "pin",
      gesture: {
        kind: "map-tap",
        position: { ...TAP, name: "소담빌딩" } as typeof TAP,
      },
    });
    expect(Object.keys(officeSaveInput(d)!).sort()).toEqual(["lat", "lng"]);
  });

  it("알 수 없는 동작이나 잘못된 좌표로는 핀이 생기지 않는다", () => {
    expect(
      pinFromGesture({
        kind: "search" as "map-tap",
        position: SEARCH,
      }),
    ).toBeNull();
    expect(
      pinFromGesture({ kind: "map-tap", position: { lat: NaN, lng: 1 } }),
    ).toBeNull();
  });
});
