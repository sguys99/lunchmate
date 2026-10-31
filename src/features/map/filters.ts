// 지도 필터 칩 판정 (T5.28, MAP-03, D-09 안건 5). 순수 함수.
//
// 칩 5종: 카테고리(하나 고름), 1만 원 이하, 도보 5분 안, 👍 상위, 즐겨찾기.
// - 1만 원 이하: 대표 가격(제보 중앙값, 없으면 카테고리 추정가)이 1만 원 이하.
// - 👍 상위: 후기 3건 이상인 곳만 대상(콜드 스타트 제외)이고 👍 비율 80% 이상.
// - 칩끼리는 모두 만족(AND). 결과는 받은 순서를 그대로 둔다(가까운 순은 places.ts가 정한다).
import type { CategorySlug } from "@/features/place/categories";
import { thumbsUpPercent } from "@/lib/format";
import type { MapPlace } from "./places";

export type MapFilters = {
  readonly category: CategorySlug | null;
  readonly cheap: boolean;
  readonly near: boolean;
  readonly top: boolean;
  readonly favorites: boolean;
};

export type FilterToggleKey = "cheap" | "near" | "top" | "favorites";

export const FILTER_TOGGLE_KEYS: readonly FilterToggleKey[] = [
  "cheap",
  "near",
  "top",
  "favorites",
];

export const EMPTY_FILTERS: MapFilters = {
  category: null,
  cheap: false,
  near: false,
  top: false,
  favorites: false,
};

export const CHEAP_MAX_KRW = 10_000;
export const NEAR_MAX_MINUTES = 5;
export const TOP_MIN_PERCENT = 80;
/** 👍 상위 대상이 되는 최소 후기 수(PRD 7장 콜드 스타트 기준과 같음) */
export const TOP_MIN_REVIEWS = 3;

/** 👍 상위인가. 후기 3건 미만이면 대상이 아니다 */
export function isTopRated(thumbs: { up: number; down: number }): boolean {
  const total = thumbs.up + thumbs.down;
  if (total < TOP_MIN_REVIEWS) return false;
  const pct = thumbsUpPercent(thumbs.up, total);
  return pct !== null && pct >= TOP_MIN_PERCENT;
}

export function matchesFilters(
  place: Pick<
    MapPlace,
    "category" | "priceKRW" | "walkMinutes" | "thumbs" | "favorite"
  >,
  f: MapFilters,
): boolean {
  if (f.category && place.category !== f.category) return false;
  if (f.cheap && place.priceKRW > CHEAP_MAX_KRW) return false;
  if (f.near && place.walkMinutes > NEAR_MAX_MINUTES) return false;
  if (f.top && !isTopRated(place.thumbs)) return false;
  if (f.favorites && !place.favorite) return false;
  return true;
}

export function filterPlaces<T extends Parameters<typeof matchesFilters>[0]>(
  places: readonly T[],
  f: MapFilters,
): T[] {
  return places.filter((p) => matchesFilters(p, f));
}

export function activeFilterCount(f: MapFilters): number {
  return (
    (f.category ? 1 : 0) + FILTER_TOGGLE_KEYS.filter((k) => f[k]).length
  );
}

/** 목록에 있는 카테고리만 칩으로 보인다(빈 칩을 만들지 않는다). 많은 순, 같으면 처음 나온 순 */
export function categoriesIn(
  places: readonly Pick<MapPlace, "category">[],
): CategorySlug[] {
  const count = new Map<CategorySlug, number>();
  for (const p of places) count.set(p.category, (count.get(p.category) ?? 0) + 1);
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([slug]) => slug);
}
