"use client";
// 사무실 핀 놓기 상태 (T4.16에서 분리, T4.23 사무실 추가가 함께 쓴다). 온보딩 1단계와 나 탭 "사무실 추가"가 같은 규칙을 쓴다.
//
// 좌표 경로 (AC-ONB-3, T0.16, T0.18)
// - 검색 결과, 현위치 좌표(MapMoveTarget)는 moveMap()으로 지도 중심만 옮긴다. 핀 상태에는 "map-moved"(좌표 없음)만 보낸다.
// - 핀은 지도 컴포넌트가 사용자 동작(누르기, 끌기 끝, Enter)을 placePin(gesture)로 넘길 때만 생긴다.
// - 저장 요청 값은 officeSaveInput(office)로만 만든다(핀 좌표만).
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { onboardingCopy } from "@/copy/onboarding";
import type { GeoPermission, LocateResult } from "./geolocation";
import {
  canSaveOffice,
  EMPTY_OFFICE_DRAFT,
  officeReducer,
} from "./office-draft";
import type { MapMoveTarget, PinGesture } from "./pin";

const copy = onboardingCopy.location;

export type MapMover = (target: MapMoveTarget) => void;

export type PinPlacementDeps = {
  locate: () => Promise<LocateResult>;
  readPermission: () => Promise<GeoPermission>;
};

export function usePinPlacement({
  enabled,
  announce,
  deps,
}: {
  /** false면 핀 놓기 동작을 무시한다(온보딩 2, 3단계, 저장 중) */
  enabled: boolean;
  /** 스크린 리더 안내 한 줄 */
  announce: (message: string) => void;
  deps: PinPlacementDeps;
}) {
  const [office, dispatch] = useReducer(officeReducer, EMPTY_OFFICE_DRAFT);
  const [permission, setPermission] = useState<GeoPermission>("unknown");
  const [locating, setLocating] = useState(false);
  const [locateFailed, setLocateFailed] = useState(false);
  const moverRef = useRef<MapMover | null>(null);
  const depsRef = useRef(deps);
  useEffect(() => {
    depsRef.current = deps;
  });

  useEffect(() => {
    let alive = true;
    void depsRef.current.readPermission().then((p) => {
      if (alive) setPermission(p);
    });
    return () => {
      alive = false;
    };
  }, []);

  /** 지도 컴포넌트가 이동 함수를 등록한다 */
  const registerMover = useCallback((mover: MapMover | null) => {
    moverRef.current = mover;
  }, []);

  /** 검색, 현위치: 지도 중심만 옮기고 핀을 비운다 */
  const moveMap = useCallback(
    (target: MapMoveTarget, by: "search" | "current-location") => {
      moverRef.current?.(target);
      dispatch({ type: "map-moved", by });
    },
    [],
  );

  return {
    office,
    canSave: canSaveOffice(office),
    permission,
    /** 권한 거부를 알고 있으면 현위치 버튼을 숨긴다 */
    locateHidden: permission === "denied",
    locating,
    locateFailed,
    registerMover,
    /** 사용자의 핀 놓기 동작(지도 컴포넌트만 부른다) */
    placePin(gesture: PinGesture) {
      if (!enabled) return;
      dispatch({ type: "pin", gesture });
      announce(copy.placedAnnounce);
    },
    /** 검색 결과를 골랐다: 지도 이동만 */
    chooseSearchResult(name: string, target: MapMoveTarget) {
      moveMap(target, "search");
      announce(copy.movedTo(name));
    },
    async locate() {
      if (locating) return;
      setLocating(true);
      setLocateFailed(false);
      const r = await depsRef.current.locate();
      setLocating(false);
      if (r.ok) {
        moveMap(r.target, "current-location");
        announce(copy.movedToCurrent);
      } else if (r.reason === "denied") {
        // 안내는 시트의 role=status 안내가 읽는다(중복 낭독 방지)
        setPermission("denied");
      } else {
        setLocateFailed(true);
      }
    },
  };
}

export type PinPlacement = ReturnType<typeof usePinPlacement>;
