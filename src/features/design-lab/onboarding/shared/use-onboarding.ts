"use client";
// 온보딩 시안 공용 상태 (T4.1). 세 시안이 같은 흐름(1 위치 → 2 예산과 거리 → 3 못 먹는 음식 → 첫 추천)을 쓰고 화면만 다르다.
// 위치 상태 전이는 순수 함수(office.ts)에 두고, 여기서는 단계, 값, 검색, 안내 문구만 묶는다.
import { useReducer, useState } from "react";
import { onboardingLabCopy } from "@/copy/design-lab-onboarding";
import { searchRadiusFromWalkMinutes } from "@/lib/format";
import {
  countNearby,
  initialOfficeDraft,
  MOCK_CURRENT_LOCATION,
  officeReducer,
  PX_PER_M,
  searchMockPlaces,
  type MockSearchResult,
  type OfficeAction,
  type OfficeDraft,
  type PinMode,
} from "./office";
import type { OnboardingParams, OnboardingStep } from "./params";

const copy = onboardingLabCopy;

/** ONB-02 기본값 */
export const DEFAULTS = {
  lunch: 10_000,
  dinner: 20_000,
  walk: 10,
} as const;

export const RANGES = {
  lunch: { min: 5_000, max: 30_000, step: 1_000 },
  dinner: { min: 10_000, max: 60_000, step: 1_000 },
  walk: { min: 5, max: 20, step: 5 },
} as const;

/** state=empty, error 캡처용 미리 넣은 검색어 */
const PREFILL = {
  empty: "소담빌딩 별관",
  error: "소담빌딩",
} as const;

type SearchStatus = "idle" | "results" | "empty" | "error";

export type Onboarding = ReturnType<typeof useOnboarding>;

export function useOnboarding(params: OnboardingParams, mode: PinMode) {
  const { state } = params;
  const offline = state === "offline";
  const loading = state === "loading";

  const [step, setStep] = useState<OnboardingStep>(params.step);
  const [dir, setDir] = useState<"next" | "back">("next");
  const [visited, setVisited] = useState(0);

  // 위치
  const [office, dispatch] = useReducer(
    (d: OfficeDraft, a: OfficeAction) => officeReducer(d, a, mode),
    params.pinPlaced,
    initialOfficeDraft,
  );
  const [glide, setGlide] = useState(false);
  const [query, setQueryRaw] = useState<string>(
    state === "empty" ? PREFILL.empty : state === "error" ? PREFILL.error : "",
  );
  const [resultsOpen, setResultsOpen] = useState(
    state === "empty" || state === "error",
  );
  const [permNotice, setPermNotice] = useState(params.permDenied);
  const [announce, setAnnounce] = useState("");

  // 예산과 거리
  const [lunch, setLunch] = useState<number>(DEFAULTS.lunch);
  const [dinner, setDinner] = useState<number>(DEFAULTS.dinner);
  const [walk, setWalk] = useState<number>(
    state === "empty" ? RANGES.walk.min : DEFAULTS.walk,
  );

  // 못 먹는 음식
  const [foods, setFoods] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [custom, setCustom] = useState<string[]>([]);

  const results = searchMockPlaces(query);
  const searchStatus: SearchStatus =
    !query.trim() || !resultsOpen
      ? "idle"
      : state === "error"
        ? "error"
        : state === "empty" || results.length === 0
          ? "empty"
          : "results";

  const radiusM = searchRadiusFromWalkMinutes(walk);
  const radiusPx = radiusM * PX_PER_M;
  const nearby =
    state === "empty" || !office.pin ? 0 : countNearby(office.pin, radiusPx);

  function go(next: OnboardingStep, direction: "next" | "back") {
    setDir(direction);
    setStep(next);
    setVisited((v) => v + 1);
  }

  return {
    params,
    mode,
    offline,
    loading,
    /** 저장 실패를 보여 줄 단계(2, 3단계 캡처용) */
    saveError: state === "error" && step !== 1,
    step,
    dir,
    /** 단계가 바뀐 횟수. 첫 화면에는 전환 모션을 걸지 않는다(LCP) */
    visited,

    office,
    glide,
    pan(to: { x: number; y: number }) {
      setGlide(false);
      dispatch({ type: "pan", to });
    },
    place(at: { x: number; y: number }) {
      setGlide(mode === "center");
      dispatch({ type: "place", at });
      setAnnounce(copy.location.placedAnnounce);
    },
    query,
    setQuery(value: string) {
      setQueryRaw(value);
      setResultsOpen(true);
    },
    results,
    searchStatus,
    choose(result: MockSearchResult) {
      setGlide(true);
      dispatch({ type: "search-move", to: result.at });
      setQueryRaw(result.name);
      setResultsOpen(false);
      setAnnounce(
        mode === "center"
          ? copy.location.movedToCenter(result.name)
          : copy.location.movedTo(result.name),
      );
    },
    locate() {
      if (params.permDenied) {
        setPermNotice(true);
        return;
      }
      setGlide(true);
      dispatch({ type: "locate-move", to: MOCK_CURRENT_LOCATION });
      setAnnounce(copy.location.movedToCurrent);
    },
    permNotice,
    announce,

    lunch,
    setLunch,
    dinner,
    setDinner,
    walk,
    setWalk,
    radiusM,
    radiusPx,
    nearby,
    budgetIsDefault:
      lunch === DEFAULTS.lunch &&
      dinner === DEFAULTS.dinner &&
      walk === DEFAULTS.walk,

    foods,
    setFoods,
    allergies,
    setAllergies,
    custom,
    addCustom(raw: string): "added" | "duplicate" | "empty" {
      const item = raw.trim().slice(0, 20);
      if (!item) return "empty";
      if (custom.includes(item) || foods.includes(item)) return "duplicate";
      setCustom((c) => [...c, item]);
      return "added";
    },
    removeCustom(item: string) {
      setCustom((c) => c.filter((x) => x !== item));
    },
    avoidCount: foods.length + allergies.length + custom.length,
    avoidAll: [...foods, ...allergies, ...custom],

    /** 1단계 저장: 핀이 있을 때만 다음으로 */
    saveOffice() {
      if (!office.pin || offline || loading) return;
      go(2, "next");
    },
    next() {
      if (step === 1) return;
      if (step === 2) go(3, "next");
      else if (step === 3 && !offline) go("done", "next");
    },
    /** 건너뛰기: 이 단계 값을 기본값으로 두고 넘어간다 */
    skip() {
      if (step === 2) {
        setLunch(DEFAULTS.lunch);
        setDinner(DEFAULTS.dinner);
        setWalk(DEFAULTS.walk);
        go(3, "next");
      } else if (step === 3 && !offline) {
        setFoods([]);
        setAllergies([]);
        setCustom([]);
        go("done", "next");
      }
    },
    /** 나머지를 기본값으로 두고 바로 끝낸다(C) */
    finishWithDefaults() {
      if (offline) return;
      go("done", "next");
    },
    back() {
      if (step === 2) go(1, "back");
      else if (step === 3) go(2, "back");
    },
    goTo(target: 1 | 2 | 3) {
      if (target === 2 && !office.pin) return;
      if (target === 3 && !office.pin) return;
      go(target, step === "done" || target < step ? "back" : "next");
    },
    restart() {
      go(1, "back");
    },
  };
}
