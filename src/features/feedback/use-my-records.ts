"use client";
// 내 기록 쿼리 훅과 피드백 대상 (T6.8 홈 띠, T6.13 나 탭, T6.16, T6.19 한도 미리 알림). 키는 src/lib/query/db-keys.ts.
// 쓰기 뒤에는 invalidateAfterWrite(client, kind, placeId)를 부른다.
import {
  queryOptions,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { dbKeys } from "@/lib/query/db-keys";
import { addKstDays, kstDateKey } from "@/lib/time";
import {
  myDailyLimitsAction,
  myPlacesAction,
  myReviewsAction,
  myVisitsAction,
} from "./actions";
import { pickFeedbackTarget, type FeedbackTarget, type MyVisit } from "./feedback-target";

const STALE_MS = 60_000;

export function myVisitsQuery(range: { from: string; to: string }) {
  return queryOptions({
    queryKey: dbKeys.myVisits(range.from, range.to),
    queryFn: () => myVisitsAction(range),
    staleTime: STALE_MS,
  });
}

/** 내 방문(최신순). range는 KST 날짜 키(포함), 최대 62일 */
export function useMyVisits(
  range: { from: string; to: string },
  enabled = true,
) {
  return useQuery({ ...myVisitsQuery(range), enabled });
}

/** 나 탭 기록 "더 보기": 2주씩 거슬러 올라간다(D-12 안건 7) */
export const HISTORY_PAGE_DAYS = 14;

export function useMyVisitHistory(now: Date, enabled = true) {
  const todayKey = kstDateKey(now);
  return useInfiniteQuery({
    queryKey: [...dbKeys.myVisitsAll, "history", todayKey],
    queryFn: async ({ pageParam }) => {
      const to = kstDateKey(addKstDays(now, -pageParam * HISTORY_PAGE_DAYS));
      const from = kstDateKey(
        addKstDays(now, -(pageParam + 1) * HISTORY_PAGE_DAYS + 1),
      );
      return myVisitsAction({ from, to });
    },
    initialPageParam: 0,
    // 1년까지. 빈 쪽이 이어져도 "더 보기"는 화면이 정한다
    getNextPageParam: (_last, pages) =>
      pages.length < 26 ? pages.length : undefined,
    staleTime: STALE_MS,
    enabled,
  });
}

/** 내 후기(최신순, 20건씩). placeId를 주면 그 식당 것만(상세 내 후기) */
export function useMyReviews(placeId?: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: dbKeys.myReviews(placeId),
    queryFn: ({ pageParam }) =>
      myReviewsAction({ offset: pageParam, limit: 20, placeId }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      last.signedIn && last.hasMore
        ? pages.reduce((n, p) => n + (p.signedIn ? p.reviews.length : 0), 0)
        : undefined,
    staleTime: STALE_MS,
    enabled,
  });
}

/** 즐겨찾기와 다시 안 갈 곳 (HIS-02) */
export function useMyPlaces(enabled = true) {
  return useQuery({
    queryKey: dbKeys.myPlaces,
    queryFn: () => myPlacesAction(),
    staleTime: STALE_MS,
    enabled,
  });
}

/** 오늘 남은 한도. 할인 등록과 신고 시트를 열 때 부른다(D-13 안건 12) */
export function useDailyLimits(enabled = true) {
  return useQuery({
    queryKey: dbKeys.dailyLimits,
    queryFn: () => myDailyLimitsAction(),
    staleTime: 0,
    enabled,
  });
}

/** 홈 띠가 볼 방문 범위: 영업일 48시간이 긴 연휴를 넘어도 닿게 10일 */
export const FEEDBACK_LOOKBACK_DAYS = 10;

/**
 * 홈 띠 대상 (T6.8). 비로그인이거나 대상이 없으면 target null.
 * isNewPrompt가 true면 화면이 markFeedbackPromptedAction과 feedback_prompt_shown을 한 번 보낸다.
 */
export function useFeedbackTarget(
  now: Date,
  enabled = true,
): {
  target: FeedbackTarget<MyVisit> | null;
  signedIn: boolean;
  status: "pending" | "error" | "success";
} {
  const todayKey = kstDateKey(now);
  const range = useMemo(
    () => ({
      from: kstDateKey(addKstDays(now, -FEEDBACK_LOOKBACK_DAYS)),
      to: todayKey,
    }),
    // 날짜가 바뀔 때만 범위를 바꾼다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayKey],
  );
  const q = useMyVisits(range, enabled);
  const target = useMemo(
    () =>
      q.data?.signedIn ? pickFeedbackTarget(q.data.visits, now) : null,
    [q.data, now],
  );
  return {
    target,
    signedIn: q.data?.signedIn ?? false,
    status: q.isError ? "error" : q.isPending ? "pending" : "success",
  };
}
