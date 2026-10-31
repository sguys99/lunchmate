// 지도 탭 식당 모양과 변환 (T5.26~T5.28, MAP-01~03). 순수 함수, React와 네트워크 의존 없음.
//
// 데이터 규칙 (CLAUDE.md 7장, T0.16)
// - 입력(KakaoRestaurant)과 출력(MapPlace)은 세션 메모리 값이다. 저장, 로그, 분석 이벤트에 넣지 않는다.
// - 도보 분은 검색 기준점(회사 핀, 현위치, 다시 찾기의 지도 가운데)에서 다시 잰다. 기준점 좌표도 메모리에만 있다.
// - 가격, 👍는 place_id에 붙는 우리 집계(6단계)다. 그 전에는 카테고리 추정가와 빈 👍(콜드 스타트)다.
import { straightDistanceM } from "@/features/rec/candidates";
import {
  kakaoCategorySlug,
  kakaoCategoryText,
} from "@/features/rec/kakao-category";
import type { CategorySlug } from "@/features/place/categories";
import { resolvePrice } from "@/features/place/price-estimate";
import { walkMinutesFromMeters } from "@/lib/format";
import type { KakaoRestaurant } from "@/lib/kakao/local";
import { personalFilterReason } from "@/lib/reco/filter";
import type { AvoidRule } from "@/lib/reco/types";
import type { LatLng } from "@/lib/map/types";
import type { Meal } from "@/lib/time";

export type MapPlace = {
  readonly id: string;
  readonly placeUrl: string;
  readonly name: string;
  readonly category: CategorySlug;
  readonly address: string;
  readonly phone: string | null;
  readonly position: LatLng;
  /** 검색 기준점에서 직선거리(m) */
  readonly distanceM: number;
  readonly walkMinutes: number;
  /** 대표 가격(원): 제보 중앙값, 없으면 카테고리 추정가 */
  readonly priceKRW: number;
  readonly priceEstimate: boolean;
  readonly thumbs: { readonly up: number; readonly down: number };
  readonly favorite: boolean;
};

/** place_id에 붙는 우리 집계 중 지도 필터가 쓰는 것(6단계). 없으면 빈 값 */
export type MapPlaceStats = {
  readonly priceReport: { medianKRW: number; count: number } | null;
  readonly thumbs: { readonly up: number; readonly down: number };
};

export const EMPTY_MAP_STATS: MapPlaceStats = {
  priceReport: null,
  thumbs: { up: 0, down: 0 },
};

export function toMapPlace(
  place: KakaoRestaurant,
  center: LatLng,
  ctx: {
    meal: Meal;
    favorite: boolean;
    stats?: MapPlaceStats;
    /** 카카오 거리를 쓸지(검색 기준점이 center와 같을 때만 true) */
    useKakaoDistance?: boolean;
  },
): MapPlace {
  const category = kakaoCategorySlug(place.categoryName);
  const stats = ctx.stats ?? EMPTY_MAP_STATS;
  const distanceM =
    ctx.useKakaoDistance !== false && place.distance !== null
      ? place.distance
      : straightDistanceM(center, place.position);
  const price = resolvePrice(stats.priceReport, category, ctx.meal);
  return {
    id: place.id,
    placeUrl: place.placeUrl,
    name: place.name,
    category,
    address: place.address,
    phone: place.phone ?? null,
    position: place.position,
    distanceM,
    walkMinutes: walkMinutesFromMeters(distanceM),
    priceKRW: price.priceKRW,
    priceEstimate: price.source === "estimate",
    thumbs: stats.thumbs,
    favorite: ctx.favorite,
  };
}

/** 카카오 결과 → 지도 식당, 가까운 순(같으면 이름 순) */
export function toMapPlaces(
  places: readonly KakaoRestaurant[],
  center: LatLng,
  ctx: {
    meal: Meal;
    isFavorite: (id: string) => boolean;
    statsOf?: (id: string) => MapPlaceStats;
  },
): MapPlace[] {
  return places
    .map((p) =>
      toMapPlace(p, center, {
        meal: ctx.meal,
        favorite: ctx.isFavorite(p.id),
        stats: ctx.statsOf?.(p.id),
      }),
    )
    .sort(
      (a, b) => a.distanceM - b.distanceM || a.name.localeCompare(b.name, "ko"),
    );
}

export type HiddenPlaces = {
  visible: KakaoRestaurant[];
  /** 기피 음식이나 다시 안 갈 곳이라 숨긴 수(각 식당은 처음 걸린 규칙 하나에만 센다) */
  hidden: { avoid: number; blocked: number };
};

/**
 * 지도에서도 기피 음식과 다시 안 갈 곳을 숨긴다(2026-10-31 사용자 결정). 추천 하드 필터와 같은 판정(personalFilterReason)이다.
 * 지도는 탐색이라 폐업 제보, 예산 초과는 숨기지 않는다. 비로그인 둘러보기는 blocked가 비어 있고 avoid는 쿼리 칩(T4.20)뿐이다.
 */
export function hidePersonal(
  places: readonly KakaoRestaurant[],
  rules: { avoid: readonly AvoidRule[]; blocked: ReadonlySet<string> },
): HiddenPlaces {
  const hidden = { avoid: 0, blocked: 0 };
  if (rules.avoid.length === 0 && rules.blocked.size === 0)
    return { visible: [...places], hidden };
  const visible: KakaoRestaurant[] = [];
  for (const p of places) {
    const reason = personalFilterReason(
      {
        id: p.id,
        name: p.name,
        category: kakaoCategorySlug(p.categoryName),
        categoryText: kakaoCategoryText(p.categoryName),
      },
      rules.avoid,
      rules.blocked,
    );
    if (reason === null) visible.push(p);
    else hidden[reason] += 1;
  }
  return { visible, hidden };
}
