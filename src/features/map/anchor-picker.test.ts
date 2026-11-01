// 지도에서 기준 찍기 좌표 경로 (D-15 안건 10, D-16 안건 9, CLAUDE.md 7장, T0.16, T0.18).
// onConfirm은 사용자가 놓은 핀(UserPinnedLatLng)만 받는다. 현위치, 검색 좌표, 맨 좌표는 타입에서 막힌다.
// 타입 단언(@ts-expect-error)은 pnpm typecheck가 확인한다.
import { describe, expectTypeOf, it } from "vitest";
import {
  mapMoveTarget,
  pinFromGesture,
  type UserPinnedLatLng,
} from "@/features/onboarding/pin";
import type { AnchorPickerProps } from "./anchor-picker";

type Confirm = AnchorPickerProps["onConfirm"];

describe("AnchorPicker onConfirm 타입", () => {
  it("사용자가 놓은 핀만 받는다", () => {
    const confirm: Confirm = () => undefined;
    const pin = pinFromGesture({
      kind: "map-tap",
      position: { lat: 37.5, lng: 127.03 },
    }) as UserPinnedLatLng;
    confirm(pin);
    // @ts-expect-error 현위치 좌표는 기준이 될 수 없다
    confirm(mapMoveTarget({ lat: 37.49, lng: 127.02 }, "current-location"));
    // @ts-expect-error 검색 좌표도 기준이 될 수 없다
    confirm(mapMoveTarget({ lat: 37.49, lng: 127.02 }, "search"));
    // @ts-expect-error 맨 좌표도 넣을 수 없다
    confirm({ lat: 37.49, lng: 127.02 });
    expectTypeOf<Parameters<Confirm>[0]>().toEqualTypeOf<UserPinnedLatLng>();
  });
});
