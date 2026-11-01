"use client";
// 투표 후보에 이름, 그림, 도보 분, 1인 가격, 할인 수를 붙인다 (T7.15, T7.23, T5.12a, D-14 안건 12).
// - DB 후보는 place_id, place_url뿐이다. 이름은 투표방 기준점 주변 FD6 매칭(세션 메모리)으로 찾고 저장하지 않는다.
// - 도보 분은 기준점에서 직선거리 × 1.3 ÷ 67(CLAUDE.md 8장). 기준점은 방장 사무실 핀이라 "투표방 기준"이다.
// - 가격과 할인 수는 place_stats 집계(익명). 제보가 없으면 카테고리 추정가. 할인은 표시만(DEAL-05, 제휴 없음).
// - place_names_resolved(screen poll)는 해석이 끝날 때마다 한 번. 개수만 보낸다.
import { useEffect, useMemo, useRef } from "react";
import { categoryLabel, type CategorySlug } from "@/features/place/categories";
import {
  resolvePrice,
  type ResolvedPrice,
} from "@/features/place/price-estimate";
import type { PlaceRef } from "@/features/place/resolve-place-names";
import { usePlaceNames } from "@/features/place/use-place-names";
import { usePlaceStats } from "@/features/place/use-place-stats";
import { straightDistanceM } from "@/features/rec/candidates";
import {
  kakaoCategorySlug,
  kakaoCategoryText,
} from "@/features/rec/kakao-category";
import { track } from "@/lib/analytics";
import { walkMinutesFromMeters } from "@/lib/format";
import { kakaoPlaceUrl } from "@/lib/kakao/local";
import type { LatLng } from "@/lib/map/types";
import type { Meal } from "@/lib/time";

export type CandidatePlace =
  | {
      readonly status: "loading";
      readonly placeId: string;
      readonly placeUrl: string;
    }
  | {
      readonly status: "unresolved";
      readonly placeId: string;
      readonly placeUrl: string;
    }
  | {
      readonly status: "resolved";
      readonly placeId: string;
      readonly placeUrl: string;
      readonly name: string;
      readonly slug: CategorySlug;
      readonly position: LatLng;
      readonly walkMinutes: number;
      /** 집계를 안 불렀으면(미리보기) null */
      readonly price: ResolvedPrice | null;
      readonly dealCount: number;
      /** 기피 판정용 업종(서버로 판정만 보내고 저장하지 않는다) */
      readonly categoryText: string;
      readonly categoryLabel: string;
    };

export function useCandidatePlaces(
  refs: readonly PlaceRef[],
  anchor: LatLng | null,
  radiusM: number,
  options: { meal: Meal; withStats: boolean },
): { get: (placeId: string) => CandidatePlace; pending: boolean } {
  const names = usePlaceNames(refs, anchor, { radius: radiusM });
  const stats = usePlaceStats(
    refs.map((r) => r.placeId),
    options.withStats && refs.length > 0,
  );
  const reported = useRef(0);

  useEffect(() => {
    if (!names.data || names.dataUpdatedAt === reported.current) return;
    reported.current = names.dataUpdatedAt;
    const s = names.data.stats;
    if (s.total === 0) return;
    track({
      name: "place_names_resolved",
      properties: {
        screen: "poll",
        total: s.total,
        unresolved: s.unresolved,
        extra_calls: s.extraCalls,
      },
    });
  }, [names.data, names.dataUpdatedAt]);

  return useMemo(() => {
    const resolved = new Map(
      names.data?.places.map((p) => [p.placeId, p]) ?? [],
    );
    const statsById = stats.data ?? new Map<string, never>();
    const urlOf = (ref: PlaceRef) => ref.placeUrl ?? kakaoPlaceUrl(ref.placeId);
    const refById = new Map(refs.map((r) => [r.placeId, r]));
    return {
      pending: names.isPending && refs.length > 0,
      get: (placeId: string): CandidatePlace => {
        const ref = refById.get(placeId) ?? { placeId };
        const r = resolved.get(placeId);
        if (!r) return { status: "loading", placeId, placeUrl: urlOf(ref) };
        if (r.status === "unresolved")
          return { status: "unresolved", placeId, placeUrl: r.placeUrl };
        const slug = kakaoCategorySlug(r.place.categoryName);
        const s = statsById.get(placeId);
        const walkMinutes = anchor
          ? walkMinutesFromMeters(straightDistanceM(anchor, r.place.position))
          : 0;
        return {
          status: "resolved",
          placeId,
          placeUrl: r.placeUrl,
          name: r.place.name,
          slug,
          position: r.place.position,
          walkMinutes,
          price: options.withStats
            ? resolvePrice(
                s && s.priceMedian !== null
                  ? { medianKRW: s.priceMedian, count: s.priceCount }
                  : null,
                slug,
                options.meal,
              )
            : null,
          dealCount: s?.dealCount ?? 0,
          categoryText: kakaoCategoryText(r.place.categoryName),
          categoryLabel: categoryLabel(slug),
        };
      },
    };
  }, [
    names.data,
    names.isPending,
    stats.data,
    refs,
    anchor,
    options.meal,
    options.withStats,
  ]);
}
