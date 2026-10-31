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
    shift >=
    Math.max(RESEARCH_MIN_SHIFT_M, input.radiusM * RESEARCH_SHIFT_RATIO)
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

/* ---------- 시트 3단과 지도 만지면 접힘 (2026-10-31 실기기 피드백 반영, D-09 메모) ---------- */

/**
 * 시트 높이 3단. low는 손잡이와 개수 한 줄(약 88px)만 남기고 하단 탭도 아래로 숨긴다(모바일만).
 * 지도를 끌거나 확대, 축소하는 순간 low로 내려가고, 시트를 누르거나 위로 끌면 반쯤으로 돌아온다.
 */
export type SheetSnap = "low" | "half" | "full";
export const SHEET_ORDER: readonly SheetSnap[] = ["low", "half", "full"];

export type SheetEvent =
  /** 사용자가 지도를 끌거나 확대, 축소했다 */
  | "mapGesture"
  /** 마커나 목록에서 식당을 골랐다 */
  | "select"
  /** 낮게 접힌 시트를 눌렀다 */
  | "sheetTap"
  /** 숨은 하단 탭에 키보드 초점이 왔다 */
  | "tabFocus"
  /** 손잡이 버튼 */
  | "handle";

export function nextSnap(
  snap: SheetSnap,
  event: SheetEvent,
  desktop: boolean,
): SheetSnap {
  // 데스크톱은 좌 리스트 칸이라 높이 단계가 없다
  if (desktop) return snap;
  switch (event) {
    case "mapGesture":
      return "low";
    case "select":
      return "half";
    case "sheetTap":
    case "tabFocus":
      return snap === "low" ? "half" : snap;
    case "handle":
      return snap === "half" ? "full" : "half";
  }
}

/** 하단 탭을 숨기는가. 지도 탭 모바일에서 시트가 낮게 접혔을 때만 */
export function tabsHidden(snap: SheetSnap, desktop: boolean): boolean {
  return !desktop && snap === "low";
}

/** 낮게 단계에서 보이는 시트 높이(손잡이 28 + 한 줄 44 + 아래 16). 홈 인디케이터 칸은 더한다 */
export const LOW_SHEET_PX = 88;
/** 끝까지 열어도 위에 남기는 틈 */
export const SHEET_TOP_GAP_PX = 8;
/** 반쯤 높이: 탭 위 지도 칸의 48% (DESIGN.md 5장 "지도") */
export const HALF_RATIO = 0.48;

export type SheetLayout = {
  /** 단계별 시트 윗변 y(칸 위 기준 px) */
  readonly top: Readonly<Record<SheetSnap, number>>;
  /** 단계별 시트가 보이는 바닥이 칸 아래에서 떨어진 거리(탭이 보이면 탭 높이, 숨으면 0) */
  readonly floor: Readonly<Record<SheetSnap, number>>;
};

/**
 * 시트 칸(stage)은 하단 탭 아래까지 이어진다(지도도 탭 아래까지 그려 두어 탭이 숨을 때 지도 크기가 바뀌지 않는다).
 * tabLift: 하단 탭 높이(홈 인디케이터 칸 포함), safeBottom: 홈 인디케이터 칸.
 */
export function sheetLayout(input: {
  stage: number;
  tabLift: number;
  safeBottom: number;
}): SheetLayout {
  const stage = Math.max(0, input.stage);
  const tabLift = Math.max(0, Math.min(input.tabLift, stage));
  const mapArea = Math.max(0, stage - tabLift);
  const fullTop = Math.min(SHEET_TOP_GAP_PX, mapArea);
  const halfH = Math.min(
    Math.max(0, mapArea - SHEET_TOP_GAP_PX),
    Math.round(mapArea * HALF_RATIO),
  );
  const halfTop = stage - tabLift - halfH;
  const lowTop = Math.max(
    halfTop,
    stage - (LOW_SHEET_PX + Math.max(0, input.safeBottom)),
  );
  return {
    top: { low: lowTop, half: halfTop, full: fullTop },
    floor: { low: 0, half: tabLift, full: tabLift },
  };
}

/** 지도 칸 아래가 시트(와 탭)에 가리는 높이 */
export function sheetCover(
  layout: SheetLayout,
  snap: SheetSnap,
  stage: number,
) {
  return Math.max(0, stage - layout.top[snap]);
}

const FLICK_PX_PER_MS = 0.5;

/**
 * 끌기를 놓았을 때 단계: 가장 가까운 단계. 빠르게 튕기면 끌기 시작한 단계에서 그 방향으로 한 단계(위로 튕기면 더 높게).
 * v: px/ms, 아래로 양수.
 */
export function snapAfterDrag(input: {
  layout: SheetLayout;
  start: SheetSnap;
  top: number;
  v: number;
}): SheetSnap {
  const { layout, start, top, v } = input;
  if (Math.abs(v) > FLICK_PX_PER_MS) {
    const i = SHEET_ORDER.indexOf(start);
    const j = Math.min(
      SHEET_ORDER.length - 1,
      Math.max(0, v < 0 ? i + 1 : i - 1),
    );
    return SHEET_ORDER[j] ?? start;
  }
  let best: SheetSnap = start;
  for (const s of SHEET_ORDER) {
    if (Math.abs(layout.top[s] - top) < Math.abs(layout.top[best] - top))
      best = s;
  }
  return best;
}
