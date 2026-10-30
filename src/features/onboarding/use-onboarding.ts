"use client";
// 온보딩 흐름 상태 (T4.16~T4.21). 1 위치 → 2 예산과 거리 → 3 못 먹는 음식 → 저장 뒤 첫 추천(/today)으로.
//
// 좌표 경로 (AC-ONB-3)
// - 검색 결과, 현위치 좌표(MapMoveTarget)는 moveMap()으로 지도 중심만 옮긴다. 핀 상태에는 "map-moved"(좌표 없음)만 보낸다.
// - 핀은 지도 컴포넌트가 사용자 동작(누르기, 끌기 끝, Enter)을 placePin(gesture)로 넘길 때만 생긴다.
// - 저장 요청의 office는 officeSaveInput(핀)에서만 만든다.
//
// 건너뛰기 (ONB-04, D-07 안건 3): 그 단계를 "시작 값"(기본값, 또는 둘러보기에서 이어받은 값, T4.20)으로 두고 다음으로.
// "여기까지 하고 시작"(C 단축): 지금까지 고른 값은 그대로, 나머지는 시작 값으로 두고 바로 저장한다.
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { onboardingCopy } from "@/copy/onboarding";
import { searchRadiusFromWalkMinutes } from "@/lib/format";
import { useOnlineStatus } from "@/lib/network";
import {
  CUSTOM_AVOID_MAX_ITEMS,
  CUSTOM_AVOID_MAX_LENGTH,
  type AvoidChoice,
  type Prefs,
} from "./constants";
import type { GeoPermission, LocateResult } from "./geolocation";
import {
  canSaveOffice,
  EMPTY_OFFICE_DRAFT,
  officeReducer,
  officeSaveInput,
} from "./office-draft";
import type { MapMoveTarget, PinGesture } from "./pin";
import type {
  FinishOnboardingRequest,
  FinishOnboardingResponse,
} from "./request";

const copy = onboardingCopy;

export type OnboardingStep = 1 | 2 | 3;

export type OnboardingDeps = {
  submit: (req: FinishOnboardingRequest) => Promise<FinishOnboardingResponse>;
  locate: () => Promise<LocateResult>;
  readPermission: () => Promise<GeoPermission>;
  navigate: (location: string) => void;
  /** onboarding_step_completed (PRD 10.2, T4.29) */
  stepCompleted?: (step: OnboardingStep, skipped: boolean) => void;
};

export type MapMover = (target: MapMoveTarget) => void;

export type CustomAddResult = "added" | "duplicate" | "empty" | "limit";

export function useOnboarding({
  next,
  initialPrefs,
  initialAvoid,
  deps,
}: {
  next: string;
  initialPrefs: Prefs;
  initialAvoid: AvoidChoice;
  deps: OnboardingDeps;
}) {
  const online = useOnlineStatus();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [visited, setVisited] = useState(0);
  const [office, dispatch] = useReducer(officeReducer, EMPTY_OFFICE_DRAFT);
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [avoid, setAvoid] = useState<AvoidChoice>(initialAvoid);
  const [announce, setAnnounce] = useState("");
  const [permission, setPermission] = useState<GeoPermission>("unknown");
  const [locating, setLocating] = useState(false);
  const [locateFailed, setLocateFailed] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [saveError, setSaveError] = useState(false);

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

  const go = useCallback((target: OnboardingStep) => {
    setStep(target);
    setVisited((v) => v + 1);
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

  async function finish(finalAvoid: AvoidChoice, finalPrefs: Prefs) {
    const officeInput = officeSaveInput(office);
    if (!officeInput || finishing) return;
    if (!online) return;
    setFinishing(true);
    setSaveError(false);
    setAnnounce(copy.finishing);
    const res = await depsRef.current
      .submit({
        office: officeInput,
        prefs: finalPrefs,
        avoid: finalAvoid,
        next,
      })
      .catch((): FinishOnboardingResponse => ({ ok: false, error: "save" }));
    if (res.ok) {
      depsRef.current.navigate(res.location);
      return;
    }
    setFinishing(false);
    setSaveError(true);
    setAnnounce(copy.states.saveError.title);
  }

  const radiusM = searchRadiusFromWalkMinutes(prefs.walk);

  return {
    next,
    step,
    visited,
    online,
    office,
    canSave: canSaveOffice(office),
    prefs,
    avoid,
    initialPrefs,
    radiusM,
    announce,
    permission,
    /** 권한 거부를 알고 있으면 현위치 버튼을 숨긴다 */
    locateHidden: permission === "denied",
    locating,
    locateFailed,
    finishing,
    saveError,

    registerMover,
    /** 사용자의 핀 놓기 동작(지도 컴포넌트만 부른다) */
    placePin(gesture: PinGesture) {
      if (step !== 1) return;
      dispatch({ type: "pin", gesture });
      setAnnounce(copy.location.placedAnnounce);
    },
    /** 검색 결과를 골랐다: 지도 이동만 */
    chooseSearchResult(name: string, target: MapMoveTarget) {
      moveMap(target, "search");
      setAnnounce(copy.location.movedTo(name));
    },
    async locate() {
      if (locating) return;
      setLocating(true);
      setLocateFailed(false);
      const r = await depsRef.current.locate();
      setLocating(false);
      if (r.ok) {
        moveMap(r.target, "current-location");
        setAnnounce(copy.location.movedToCurrent);
      } else if (r.reason === "denied") {
        // 안내는 시트의 role=status 안내가 읽는다(중복 낭독 방지)
        setPermission("denied");
      } else {
        setLocateFailed(true);
      }
    },

    setLunch: (lunch: number) => setPrefs((p) => ({ ...p, lunch })),
    setDinner: (dinner: number) => setPrefs((p) => ({ ...p, dinner })),
    setWalk: (walk: number) => setPrefs((p) => ({ ...p, walk })),
    setFoods: (foods: string[]) => setAvoid((a) => ({ ...a, foods })),
    setAllergies: (allergies: string[]) =>
      setAvoid((a) => ({ ...a, allergies })),
    addCustom(raw: string): CustomAddResult {
      const item = raw.trim().slice(0, CUSTOM_AVOID_MAX_LENGTH);
      if (!item) return "empty";
      if (
        avoid.custom.includes(item) ||
        avoid.foods.includes(item) ||
        avoid.allergies.includes(item)
      )
        return "duplicate";
      if (avoid.custom.length >= CUSTOM_AVOID_MAX_ITEMS) return "limit";
      setAvoid((a) => ({ ...a, custom: [...a.custom, item] }));
      return "added";
    },
    removeCustom: (item: string) =>
      setAvoid((a) => ({ ...a, custom: a.custom.filter((x) => x !== item) })),

    /** 1단계 "이 위치로 저장": 핀이 있을 때만 다음으로(저장 요청은 마칠 때 한 번) */
    saveOffice() {
      if (!canSaveOffice(office)) return;
      depsRef.current.stepCompleted?.(1, false);
      go(2);
    },
    /** 주 버튼: 2 → 3, 3 → 저장 */
    primary() {
      if (step === 1) return;
      if (step === 2) {
        depsRef.current.stepCompleted?.(2, false);
        go(3);
        return;
      }
      depsRef.current.stepCompleted?.(3, false);
      void finish(avoid, prefs);
    },
    /** 건너뛰기: 이 단계를 시작 값으로 두고 다음으로 */
    skip() {
      if (step === 2) {
        setPrefs(initialPrefs);
        depsRef.current.stepCompleted?.(2, true);
        go(3);
      } else if (step === 3) {
        setAvoid(initialAvoid);
        depsRef.current.stepCompleted?.(3, true);
        void finish(initialAvoid, prefs);
      }
    },
    /** 여기까지 하고 시작(C 단축): 지금까지 고른 값 그대로, 손대지 않은 3단계는 시작 값 */
    finishNow() {
      if (step !== 2) return;
      depsRef.current.stepCompleted?.(2, false);
      depsRef.current.stepCompleted?.(3, true);
      void finish(avoid, prefs);
    },
    goTo(target: OnboardingStep) {
      if (finishing || target === step) return;
      if (target > 1 && !canSaveOffice(office)) return;
      go(target);
    },
    back() {
      if (step > 1 && !finishing) go((step - 1) as OnboardingStep);
    },
  };
}

export type Onboarding = ReturnType<typeof useOnboarding>;
