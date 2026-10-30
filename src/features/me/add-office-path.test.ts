// @vitest-environment jsdom
// 사무실 추가 좌표 경로 (T4.23, AC-ONB-3, T0.16, T0.18): 나 탭 "사무실 추가"도 온보딩과 같이
// 사용자가 놓은 핀(UserPinnedLatLng)에서 만든 OfficeSaveInput만 저장 요청에 실을 수 있다.
// 타입 단언(@ts-expect-error)은 pnpm typecheck가, 동작은 vitest가 확인한다.
import { act, renderHook } from "@testing-library/react";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  officeSaveInput,
  type OfficeSaveInput,
} from "@/features/onboarding/office-draft";
import {
  mapMoveTarget,
  pinFromGesture,
  type UserPinnedLatLng,
} from "@/features/onboarding/pin";
import { usePinPlacement } from "@/features/onboarding/use-pin-placement";
import type { AddOfficeRequest } from "./requests";

const SEARCH = { lat: 37.5013, lng: 127.0396 };
const CURRENT = { lat: 37.4979, lng: 127.0276 };
const TAP = { lat: 37.5021, lng: 127.0411 };

describe("AddOfficeRequest.office 타입", () => {
  it("OfficeSaveInput만 받는다(검색, 현위치, 맨 좌표, 핀 좌표 그대로 모두 불가)", () => {
    const search = mapMoveTarget(SEARCH, "search");
    const current = mapMoveTarget(CURRENT, "current-location");
    const pin = pinFromGesture({
      kind: "map-tap",
      position: TAP,
    }) as UserPinnedLatLng;
    // @ts-expect-error 검색 좌표는 저장 요청에 넣을 수 없다
    const a: AddOfficeRequest = { name: "판교", office: search };
    // @ts-expect-error 현위치 좌표는 저장 요청에 넣을 수 없다
    const b: AddOfficeRequest = { name: "판교", office: current };
    // @ts-expect-error 맨 좌표도 넣을 수 없다
    const c: AddOfficeRequest = { name: "판교", office: TAP };
    // @ts-expect-error 핀 좌표도 officeSaveInput을 거쳐야 한다
    const d: AddOfficeRequest = { name: "판교", office: pin };
    void [a, b, c, d];
    expectTypeOf<AddOfficeRequest["office"]>().toEqualTypeOf<OfficeSaveInput>();
  });
});

describe("usePinPlacement (사무실 추가 화면이 쓰는 상태)", () => {
  function setup() {
    const announce = vi.fn();
    const mover = vi.fn();
    const hook = renderHook(() =>
      usePinPlacement({
        enabled: true,
        announce,
        deps: {
          locate: async () => ({
            ok: true as const,
            target: mapMoveTarget(CURRENT, "current-location"),
          }),
          readPermission: async () => "prompt" as const,
        },
      }),
    );
    act(() => hook.result.current.registerMover(mover));
    return { hook, mover };
  }

  it("현위치, 검색은 지도만 옮기고 저장 값을 만들지 않는다", async () => {
    const { hook, mover } = setup();
    await act(() => hook.result.current.locate());
    act(() =>
      hook.result.current.chooseSearchResult(
        "판교역",
        mapMoveTarget(SEARCH, "search"),
      ),
    );
    expect(mover.mock.calls).toEqual([[CURRENT], [SEARCH]]);
    expect(hook.result.current.canSave).toBe(false);
    expect(officeSaveInput(hook.result.current.office)).toBeNull();
  });

  it("지도를 누른 핀 좌표만 저장 값이 되고, 검색 이동 뒤에는 다시 비운다", () => {
    const { hook } = setup();
    act(() => hook.result.current.placePin({ kind: "map-tap", position: TAP }));
    expect(officeSaveInput(hook.result.current.office)).toEqual(TAP);
    act(() =>
      hook.result.current.chooseSearchResult(
        "판교역",
        mapMoveTarget(SEARCH, "search"),
      ),
    );
    expect(officeSaveInput(hook.result.current.office)).toBeNull();
  });

  it("enabled가 false면(저장 중) 핀 동작을 무시한다", () => {
    const hook = renderHook(() =>
      usePinPlacement({
        enabled: false,
        announce: vi.fn(),
        deps: {
          locate: async () => ({
            ok: false as const,
            reason: "unavailable" as const,
          }),
          readPermission: async () => "prompt" as const,
        },
      }),
    );
    act(() => hook.result.current.placePin({ kind: "map-tap", position: TAP }));
    expect(hook.result.current.canSave).toBe(false);
  });
});
