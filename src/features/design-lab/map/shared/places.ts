// 지도 시안 목업 식당과 필터 (T5.1, MAP-02, MAP-03). 순수 함수만 둔다(React, 네트워크 없음).
// 이름, 위치는 모두 지어낸 값이다. 실제 카카오 장소 데이터를 쓰지 않는다 (CLAUDE.md 7장).
// 위치는 기준점(회사 핀)에서 동쪽(x), 남쪽(y)으로 떨어진 m 값이다. 직선거리 = 도보 분 x 67 ÷ 1.3.
import { MOCK_PLACES } from "@/features/design-lab/mock";
import type { CategorySlug } from "@/features/place/categories";
import { WALK_DETOUR_FACTOR, WALK_SPEED_M_PER_MIN } from "@/lib/format";

export type MapPlace = {
  id: string;
  name: string;
  category: CategorySlug;
  walkMinutes: number;
  priceKRW: number;
  priceSource: "report" | "estimate";
  /** 👍 비율. 후기 3건 미만이면 null */
  thumbsUpRate: number | null;
  /** 추천 이유 1줄(명사형) */
  reason: string;
  favorite: boolean;
  /** 기준점에서 떨어진 거리(m). x 동쪽, y 남쪽 */
  at: { x: number; y: number };
};

/** 기본 허용 도보 분(온보딩 기본값 10분)과 빈 상태에서 제안할 값 */
export const WALK_LIMIT_MINUTES = 10;
export const WALK_EXPAND_MINUTES = 15;

/** 도보 분 → 검색 반경(m). CLAUDE.md 8장: 도보 분 x 67 ÷ 1.3 */
export function radiusMeters(minutes: number): number {
  return Math.round((minutes * WALK_SPEED_M_PER_MIN) / WALK_DETOUR_FACTOR);
}

/** 식당마다 방향(도)만 정하고 거리는 도보 분에서 계산한다. 마커가 겹치지 않게 고른 값 */
const BEARING: Record<string, number> = {
  "mock-gukbap": 35,
  "mock-asian": 120,
  "mock-ilsik": 200,
  "mock-hansik": 305,
  "mock-yangsik": 70,
  "mock-salad": 165,
  "mock-bunsik": 250,
  "mock-jungsik": 340,
  "mock-gogi": 140,
  "mock-fastfood": 15,
  "mock-cafe": 95,
  "mock-pub": 225,
};

const FAVORITES = new Set(["mock-gukbap", "mock-hansik", "mock-cafe"]);

function polar(bearingDeg: number, distance: number) {
  const rad = (bearingDeg * Math.PI) / 180;
  // 방위각: 0도 북쪽, 시계 방향. 화면 y는 아래가 남쪽이라 -cos
  return {
    x: Math.round(Math.sin(rad) * distance),
    y: Math.round(-Math.cos(rad) * distance),
  };
}

const BASE_PLACES: readonly MapPlace[] = MOCK_PLACES.map((p) => ({
  id: p.id,
  name: p.name,
  category: p.category,
  walkMinutes: p.walkMinutes,
  priceKRW: p.priceKRW,
  priceSource: p.priceSource,
  thumbsUpRate: p.thumbsUpRate,
  reason: p.reason.replace(/^도보 약 \d+분, /, ""),
  favorite: FAVORITES.has(p.id),
  at: polar(BEARING[p.id] ?? 0, radiusMeters(p.walkMinutes) * 0.92),
}));

/** 먹자골목: 서로 60m 안에 모인 세 곳. 겹치면 클러스터로 묶이는 모습(MAP-02)을 보이려고 둔다 */
const ALLEY: readonly MapPlace[] = [
  {
    id: "alley-kalguksu",
    name: "골목 칼국수",
    category: "hansik",
    walkMinutes: 7,
    priceKRW: 9000,
    priceSource: "report",
    thumbsUpRate: 82,
    reason: "비 오는 날 많이 찾는 칼국수",
    favorite: false,
    at: { x: -250, y: 230 },
  },
  {
    id: "alley-udon",
    name: "작은 우동집",
    category: "ilsik",
    walkMinutes: 7,
    priceKRW: 8000,
    priceSource: "estimate",
    thumbsUpRate: null,
    reason: "혼밥 자리가 많은 우동",
    favorite: false,
    at: { x: -205, y: 262 },
  },
  {
    id: "alley-gimbap",
    name: "오늘 김밥",
    category: "bunsik",
    walkMinutes: 8,
    priceKRW: 5000,
    priceSource: "report",
    thumbsUpRate: 71,
    reason: "가볍게 먹는 김밥",
    favorite: false,
    at: { x: -262, y: 288 },
  },
];

export const ALLEY_IDS: readonly string[] = ALLEY.map((p) => p.id);

export const MAP_PLACES: readonly MapPlace[] = [...BASE_PLACES, ...ALLEY];

export function findMapPlace(id: string | null): MapPlace | null {
  if (!id) return null;
  return MAP_PLACES.find((p) => p.id === id) ?? null;
}

/* ---------- 필터 (MAP-03) ---------- */

export type MapFilters = {
  category: CategorySlug | null;
  /** 1만 원 이하만 */
  cheap: boolean;
  /** 도보 5분 안만 */
  near: boolean;
  /** 👍 상위(80% 이상)만 */
  top: boolean;
  favorites: boolean;
};

export const EMPTY_FILTERS: MapFilters = {
  category: null,
  cheap: false,
  near: false,
  top: false,
  favorites: false,
};

export const CHEAP_MAX_KRW = 10_000;
export const NEAR_MAX_MINUTES = 5;
export const TOP_MIN_RATE = 80;

export function activeFilterCount(f: MapFilters): number {
  return (
    (f.category ? 1 : 0) +
    (f.cheap ? 1 : 0) +
    (f.near ? 1 : 0) +
    (f.top ? 1 : 0) +
    (f.favorites ? 1 : 0)
  );
}

/** 걷는 거리 안 식당을 필터로 거르고 가까운 순으로 둔다(같으면 이름 순) */
export function filterPlaces(
  places: readonly MapPlace[],
  filters: MapFilters,
  walkLimit: number = WALK_LIMIT_MINUTES,
): MapPlace[] {
  return places
    .filter((p) => p.walkMinutes <= walkLimit)
    .filter((p) => !filters.category || p.category === filters.category)
    .filter((p) => !filters.cheap || p.priceKRW <= CHEAP_MAX_KRW)
    .filter((p) => !filters.near || p.walkMinutes <= NEAR_MAX_MINUTES)
    .filter(
      (p) =>
        !filters.top ||
        (p.thumbsUpRate !== null && p.thumbsUpRate >= TOP_MIN_RATE),
    )
    .filter((p) => !filters.favorites || p.favorite)
    .sort(
      (a, b) =>
        a.walkMinutes - b.walkMinutes || a.name.localeCompare(b.name, "ko"),
    );
}

/** 목록에 있는 카테고리만 칩으로 보인다(빈 칩을 만들지 않는다) */
export function categoriesIn(places: readonly MapPlace[]): CategorySlug[] {
  const seen = new Set<CategorySlug>();
  for (const p of places) seen.add(p.category);
  return [...seen];
}

/* ---------- 좌표 ---------- */

const M_PER_DEG_LAT = 111_320;

/** 기준점에서 떨어진 m를 위경도로. 목업 지도와 실제 지도가 같은 값을 쓴다 */
export function offsetToLatLng(
  origin: { lat: number; lng: number },
  at: { x: number; y: number },
): { lat: number; lng: number } {
  const mPerDegLng = M_PER_DEG_LAT * Math.cos((origin.lat * Math.PI) / 180);
  return {
    lat: origin.lat - at.y / M_PER_DEG_LAT,
    lng: origin.lng + at.x / mPerDegLng,
  };
}

/* ---------- 클러스터 (MAP-02) ---------- */

export type MarkerGroups = {
  singles: MapPlace[];
  /** 골목 세 곳 중 2곳 이상이 목록에 있고 펼치지 않았으면 하나로 묶는다 */
  cluster: { ids: string[]; at: { x: number; y: number } } | null;
};

/**
 * 시안용 단순 규칙: 먹자골목만 묶는다. 실제 구현은 네이버 MarkerClustering(화면 px 거리 기준)을 쓴다(T5.27).
 * 고른 식당이 골목 안이면 묶지 않는다(고른 마커가 클러스터 속에 숨지 않게).
 */
export function groupMarkers(
  places: readonly MapPlace[],
  opened: boolean,
  selectedId: string | null,
): MarkerGroups {
  const inAlley = places.filter((p) => ALLEY_IDS.includes(p.id));
  const hold =
    opened || inAlley.length < 2 || inAlley.some((p) => p.id === selectedId);
  if (hold) return { singles: [...places], cluster: null };
  const at = {
    x: Math.round(inAlley.reduce((s, p) => s + p.at.x, 0) / inAlley.length),
    y: Math.round(inAlley.reduce((s, p) => s + p.at.y, 0) / inAlley.length),
  };
  return {
    singles: places.filter((p) => !ALLEY_IDS.includes(p.id)),
    cluster: { ids: inAlley.map((p) => p.id), at },
  };
}
