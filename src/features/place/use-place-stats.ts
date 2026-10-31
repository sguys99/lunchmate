"use client";
// 식당 집계, 공개 후기, 할인 목록 쿼리 훅 (T6.14, T6.20, 추천 배지). 키는 src/lib/query/db-keys.ts.
// 상세는 usePlaceDetailStats 하나로 EMPTY_PLACE_STATS 자리를 채운다.
import {
  queryOptions,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { myVisitsAction } from "@/features/feedback/actions";
import { dbKeys } from "@/lib/query/db-keys";
import { addKstDays, kstDateKey } from "@/lib/time";
import type { PlaceDetailStats } from "./detail-model";
import {
  toPlaceDetailStats,
  type PlaceReviewsResult,
  type PlaceStats,
} from "./place-stats-model";
import {
  placeDealsAction,
  placeReviewsAction,
  placeStatsAction,
} from "./stats-actions";

/** 집계를 다시 부르지 않는 시간. 웨이팅이 30분만 유효하므로 짧게 둔다 */
export const PLACE_STATS_STALE_MS = 60_000;
/** place_stats 한 번에 최대 곳 수(DB와 같다) */
export const PLACE_STATS_BATCH = 60;

export function placeStatsQuery(placeIds: readonly string[]) {
  const ids = [...new Set(placeIds)].sort().slice(0, PLACE_STATS_BATCH);
  return queryOptions({
    queryKey: dbKeys.placeStats(ids),
    queryFn: async (): Promise<ReadonlyMap<string, PlaceStats>> => {
      const rows = await placeStatsAction(ids);
      return new Map(rows.map((r) => [r.placeId, r]));
    },
    staleTime: PLACE_STATS_STALE_MS,
    enabled: ids.length > 0,
  });
}

/** 여러 식당 집계(추천 후보, 지도 마커). 결과는 place_id → 집계 */
export function usePlaceStats(placeIds: readonly string[], enabled = true) {
  const opts = placeStatsQuery(placeIds);
  return useQuery({ ...opts, enabled: enabled && opts.enabled !== false });
}

export function placeDealsQuery(placeId: string) {
  return queryOptions({
    queryKey: dbKeys.placeDeals(placeId),
    queryFn: () => placeDealsAction({ placeId }),
    staleTime: PLACE_STATS_STALE_MS,
  });
}

export function usePlaceDeals(placeId: string, enabled = true) {
  return useQuery({ ...placeDealsQuery(placeId), enabled });
}

/** 공개 후기 쪽 넘기기("더 보기", 10건씩). 비로그인은 첫 쪽이 login_required */
export function usePlaceReviews(placeId: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: dbKeys.placeReviews(placeId),
    queryFn: ({ pageParam }) =>
      placeReviewsAction({ placeId, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last: PlaceReviewsResult, pages) =>
      last.status === "ok" && last.hasMore
        ? pages.reduce(
            (n, p) => n + (p.status === "ok" ? p.reviews.length : 0),
            0,
          )
        : undefined,
    staleTime: PLACE_STATS_STALE_MS,
    enabled,
  });
}

/** 쪽들을 한 결과로 */
export function mergeReviewPages(
  pages: readonly PlaceReviewsResult[] | undefined,
): PlaceReviewsResult | undefined {
  const first = pages?.[0];
  if (!pages || !first) return undefined;
  if (first.status === "login_required") return first;
  const last = pages[pages.length - 1];
  return {
    status: "ok",
    reviews: pages.flatMap((p) => (p.status === "ok" ? p.reviews : [])),
    hasMore: last?.status === "ok" ? last.hasMore : false,
  };
}

/** 상세 "내 방문 기록"은 최근 60일 안에서 찾는다 */
const MY_VISIT_LOOKBACK_DAYS = 60;

/**
 * 상세 화면 집계 하나로(PLACE-02, PLACE-03, PLACE-06, PLACE-07, DEAL-02).
 * 불러오는 중에는 빈 집계와 같은 모양이고, status로 4상태를 나눈다.
 */
export function usePlaceDetailStats(
  placeId: string,
  options: { enabled?: boolean; now?: Date } = {},
): {
  stats: PlaceDetailStats;
  raw: PlaceStats | null;
  reviews: PlaceReviewsResult | undefined;
  status: "pending" | "error" | "success";
  /** 공개 후기 목록 상태(집계와 따로 온다) */
  reviewsStatus: "pending" | "error" | "success";
  retryReviews: () => void;
  loadMoreReviews: () => void;
  hasMoreReviews: boolean;
  loadingMoreReviews: boolean;
} {
  const enabled = options.enabled ?? true;
  const stats = useQuery({ ...placeStatsQuery([placeId]), enabled });
  const reviews = usePlaceReviews(placeId, enabled);
  const deals = usePlaceDeals(placeId, enabled);
  const now = options.now ?? null;
  const range = useMemo(() => {
    const at = now ?? new Date();
    return {
      from: kstDateKey(addKstDays(at, -MY_VISIT_LOOKBACK_DAYS)),
      to: kstDateKey(at),
    };
  }, [now]);
  const visits = useQuery({
    queryKey: dbKeys.myVisits(range.from, range.to, placeId),
    queryFn: () => myVisitsAction({ ...range, placeId }),
    staleTime: PLACE_STATS_STALE_MS,
    enabled,
  });

  const raw = stats.data?.get(placeId) ?? null;
  const merged = useMemo(
    () => mergeReviewPages(reviews.data?.pages),
    [reviews.data],
  );
  const detail = useMemo(
    () =>
      toPlaceDetailStats({
        stats: raw,
        reviews: reviews.isError ? null : merged,
        deals: deals.data ?? [],
        myVisits: visits.data?.signedIn ? visits.data.visits : [],
        now: now ?? new Date(),
      }),
    [raw, merged, reviews.isError, deals.data, visits.data, now],
  );
  return {
    stats: detail,
    raw,
    reviews: merged,
    status: stats.isError ? "error" : stats.isPending ? "pending" : "success",
    reviewsStatus: reviews.isError
      ? "error"
      : reviews.isPending
        ? "pending"
        : "success",
    retryReviews: () => void reviews.refetch(),
    loadMoreReviews: () => void reviews.fetchNextPage(),
    hasMoreReviews: reviews.hasNextPage,
    loadingMoreReviews: reviews.isFetchingNextPage,
  };
}
