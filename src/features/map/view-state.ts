// 지도 탭 화면 상태 판정 (T5.30 MAP-05, T5.32, D-09 안건 6, 7). 순수 함수.
//
// - 지도 SDK 상태: loading → ready, 또는 failed(목록 보기로 자동 전환). "지도 다시 불러오기"는 retry.
//   ready 뒤 인증 실패(onAuthFailure)도 failed로 본다.
// - 화면 모드: 위치 없음, 오프라인(받은 목록 없음), 카카오 오류가 먼저이고, 그다음 지도 실패면 목록 보기.
// - 다시 찾기 버튼: 사용자가 지도를 옮겼고(코드가 옮긴 것 제외) 지도 가운데가 지금 검색 기준점에서
//   충분히 멀어졌을 때만 보인다. 기준점 좌표는 검색에만 쓰고 저장하지 않는다(CLAUDE.md 7장).
import { straightDistanceM } from "@/features/rec/candidates";
import type { LatLng } from "@/lib/map/types";

/* ---------- 지도 SDK ---------- */

export type MapLoad = {
  readonly status: "loading" | "ready" | "failed";
  /** 다시 불러오기 회차. 지도 칸 key로 써서 새로 만든다 */
  readonly attempt: number;
};

export type MapLoadEvent = "loaded" | "failed" | "retry";

export const INITIAL_MAP_LOAD: MapLoad = { status: "loading", attempt: 0 };

export function mapLoadReducer(state: MapLoad, event: MapLoadEvent): MapLoad {
  switch (event) {
    case "loaded":
      return state.status === "failed" ? state : { ...state, status: "ready" };
    case "failed":
      return { ...state, status: "failed" };
    case "retry":
      return { status: "loading", attempt: state.attempt + 1 };
  }
}

/* ---------- 화면 모드 ---------- */

export type MapScreenMode =
  | "needLocation"
  | "locating"
  | "loadFailed"
  | "offline"
  | "kakaoError"
  /** 지도 + 시트(데스크톱 좌 칸) */
  | "map"
  /** 지도 SDK 실패: 목록만 (T5.32) */
  | "list";

export function mapScreenMode(input: {
  loadFailed: boolean;
  /** 기준점: 있으면 좌표, 찾는 중이면 locating, 쓸 수 없으면 none */
  base: "ready" | "locating" | "none";
  online: boolean;
  /** 받은 식당 목록이 세션 메모리에 있는가 */
  hasPlaces: boolean;
  kakaoError: boolean;
  mapStatus: MapLoad["status"];
}): MapScreenMode {
  if (input.loadFailed) return "loadFailed";
  if (input.base === "none") return "needLocation";
  if (input.base === "locating") return "locating";
  if (!input.online && !input.hasPlaces) return "offline";
  if (input.kakaoError && !input.hasPlaces) return "kakaoError";
  return input.mapStatus === "failed" ? "list" : "map";
}

/* ---------- 이 지역에서 다시 찾기 ---------- */

/** 이만큼(m) 또는 반경의 20% 중 큰 값 이상 옮겨야 버튼이 보인다(손 떨림으로 뜨지 않게) */
export const RESEARCH_MIN_SHIFT_M = 40;
export const RESEARCH_SHIFT_RATIO = 0.2;

export function researchVisible(input: {
  /** 사용자가 끌기나 방향키로 지도를 옮겼는가 */
  userMoved: boolean;
  mapCenter: LatLng | null;
  searchCenter: LatLng | null;
  radiusM: number;
}): boolean {
  if (!input.userMoved || !input.mapCenter || !input.searchCenter) {
    return false;
  }
  const shift = straightDistanceM(input.mapCenter, input.searchCenter);
  return (
    shift >= Math.max(RESEARCH_MIN_SHIFT_M, input.radiusM * RESEARCH_SHIFT_RATIO)
  );
}

/* ---------- 넓히기 ---------- */

/** 빈 상태 "N분까지 넓히기" 값: 5분 더, 온보딩 상한 20분. 이미 상한이면 null */
export const WALK_MAX_MINUTES = 20;
export const WALK_EXPAND_STEP = 5;

export function expandedWalk(walk: number): number | null {
  if (walk >= WALK_MAX_MINUTES) return null;
  return Math.min(WALK_MAX_MINUTES, walk + WALK_EXPAND_STEP);
}
