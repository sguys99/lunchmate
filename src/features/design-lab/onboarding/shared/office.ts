// 온보딩 1단계 사무실 위치의 목업 지도 좌표와 상태 전이 (T4.1 시안, ONB-01, AC-ONB-3).
// 순수 함수만 둔다(React, DOM 없음). 실제 구현(T4.16)도 같은 원칙을 따른다:
//   - 검색 결과와 현위치는 지도 중심(center)만 옮긴다. 핀(pin)은 바꾸지 않는다.
//   - 핀은 사용자가 지도를 누르거나(tap) 직접 움직여 맞췄을 때(center 방식)만 생긴다.
//   - 저장 요청(officeSavePayload)은 핀 좌표만 담는다. 이름, 주소, 검색 좌표는 담지 않는다.
// 좌표는 목업 지도 세계 좌표(px)다. 1px = 1/PX_PER_M m.

export type Point = { readonly x: number; readonly y: number };

/** 목업 지도 세계 크기(px) */
export const WORLD = { width: 1200, height: 1000 } as const;
/** 목업 축척: 1m = 0.3px. 도보 10분 반경 515m가 약 155px로 그려진다 */
export const PX_PER_M = 0.3;

/** 처음 지도 중심(가상 동네 한가운데) */
export const START_CENTER: Point = { x: 600, y: 500 };
/** ?pin=placed, ?step=2 이후 캡처용 핀(소담빌딩 입구 근처) */
export const SAMPLE_PIN: Point = { x: 606, y: 506 };
/** 현위치 측위 결과(목업). 지도 중심 이동에만 쓴다 */
export const MOCK_CURRENT_LOCATION: Point = { x: 690, y: 600 };

export type MockSearchResult = {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly at: Point;
};

/** 가상 동네의 검색 대상. 이름과 주소는 모두 가상이다 */
export const MOCK_SEARCH_RESULTS: readonly MockSearchResult[] = [
  {
    id: "sodam",
    name: "소담빌딩",
    address: "소담로 24",
    at: { x: 612, y: 488 },
  },
  {
    id: "sodam-station",
    name: "소담역 2번 출구",
    address: "소담로 지하 10",
    at: { x: 470, y: 560 },
  },
  {
    id: "neuti",
    name: "느티타워",
    address: "느티길 8",
    at: { x: 760, y: 420 },
  },
  {
    id: "hanbit",
    name: "한빛스퀘어",
    address: "한빛대로 51",
    at: { x: 540, y: 330 },
  },
];

/** 검색 결과는 최대 3개(3개 이하 원칙). 빈 검색어는 결과 없음 */
export function searchMockPlaces(query: string): MockSearchResult[] {
  const q = query.trim().replace(/\s+/g, "");
  if (!q) return [];
  return MOCK_SEARCH_RESULTS.filter(
    (r) =>
      r.name.replace(/\s+/g, "").includes(q) ||
      r.address.replace(/\s+/g, "").includes(q),
  ).slice(0, 3);
}

/* ---------- 상태 전이 ---------- */

/** tap: 지도를 눌러 핀을 놓는다. center: 지도를 움직여 가운데 고정 핀에 맞춘다 */
export type PinMode = "tap" | "center";

export type OfficeDraft = {
  readonly center: Point;
  /** 사용자가 직접 놓은 핀. null이면 저장할 수 없다 */
  readonly pin: Point | null;
};

export type OfficeAction =
  /** 검색 결과를 골라 지도 중심만 옮김 */
  | { readonly type: "search-move"; readonly to: Point }
  /** 현위치 버튼으로 지도 중심만 옮김 */
  | { readonly type: "locate-move"; readonly to: Point }
  /** 사용자가 지도를 끌거나 방향키로 움직임 */
  | { readonly type: "pan"; readonly to: Point }
  /** 사용자가 지도 한 점을 누름(또는 Enter로 가운데) */
  | { readonly type: "place"; readonly at: Point };

export function initialOfficeDraft(pinPlaced: boolean): OfficeDraft {
  return pinPlaced
    ? { center: SAMPLE_PIN, pin: SAMPLE_PIN }
    : { center: START_CENTER, pin: null };
}

export function officeReducer(
  draft: OfficeDraft,
  action: OfficeAction,
  mode: PinMode,
): OfficeDraft {
  switch (action.type) {
    case "search-move":
    case "locate-move":
      // 지도만 옮긴다. center 방식은 가운데 핀이 검색 좌표에 그대로 겹치므로 핀을 비워 다시 맞추게 한다.
      return mode === "center"
        ? { center: action.to, pin: null }
        : { center: action.to, pin: draft.pin };
    case "pan":
      return mode === "center"
        ? { center: action.to, pin: action.to }
        : { center: action.to, pin: draft.pin };
    case "place":
      return mode === "center"
        ? { center: action.at, pin: action.at }
        : { center: draft.center, pin: action.at };
  }
}

/** 저장 요청 본문. 핀 좌표만 담는다(이름, 주소, 검색 좌표 없음, AC-ONB-3) */
export function officeSavePayload(
  draft: OfficeDraft,
): { readonly x: number; readonly y: number } | null {
  return draft.pin ? { x: draft.pin.x, y: draft.pin.y } : null;
}

/* ---------- 근처 식당 점(목업) ---------- */

/** 결정적 의사 난수(시드 고정) */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** 동네에 흩어진 식당 점 72개. 중심에 몰리게 반지름에 제곱근을 쓴다 */
export const MOCK_PLACE_DOTS: readonly Point[] = (() => {
  const rnd = lcg(20261030);
  const dots: Point[] = [];
  for (let i = 0; i < 72; i++) {
    const r = 340 * Math.sqrt(rnd());
    const t = rnd() * Math.PI * 2;
    dots.push({
      x: Math.round(START_CENTER.x + r * Math.cos(t)),
      y: Math.round(START_CENTER.y + r * Math.sin(t) * 0.9),
    });
  }
  return dots;
})();

/** 카카오 검색 상한(15건 x 3페이지) */
export const NEARBY_MAX = 45;

/** 핀에서 반경 안의 식당 점 수(최대 45) */
export function countNearby(pin: Point, radiusPx: number): number {
  const r2 = radiusPx * radiusPx;
  const n = MOCK_PLACE_DOTS.filter(
    (d) => (d.x - pin.x) ** 2 + (d.y - pin.y) ** 2 <= r2,
  ).length;
  return Math.min(NEARBY_MAX, n);
}
