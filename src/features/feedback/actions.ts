"use server";
// 식후 피드백, 내 후기, 내 기록 서버 액션 (T6.8~T6.10, T6.13, T6.17, T6.18, FB-01~07, HIS-01~03, MOD-04, MOD-05).
// 흐름과 zod 검사는 feedback-requests.ts(테스트 있음), 행 변환은 my-records.ts.
// - 사용자 세션(publishable 키 + 쿠키)으로 쓴다. RLS 본인 정책 + 열 단위 권한(T6.5 마이그레이션). service role 없음.
// - 요청에 장소명, 좌표, 현위치는 없다(CLAUDE.md 7장). 서버 액션은 Next가 Origin 검사를 한다(CSRF).
// - 읽기 액션은 비로그인이면 signedIn false, DB 오류면 throw(TanStack Query의 오류 상태).
import * as z from "zod";
import { isEnabled } from "@/lib/flags";
import { createServerSupabase, type ServerSupabase } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/supabase/types";
import { fail, type WriteResult } from "@/lib/supabase/write-result";
import {
  deleteReview,
  markFeedbackPrompted,
  markNotVisited,
  rateVisit,
  updateReview,
  writeFromDetail,
  type FeedbackDeps,
  type RateVisitRequest,
  type RateVisitResult,
  type ReviewIdRequest,
  type UpdateReviewRequest,
  type VisitIdRequest,
  type WriteFromDetailRequest,
  type WriteFromDetailResult,
} from "./feedback-requests";
import { pickFeedbackTarget, type MyVisit } from "./feedback-target";
import { addKstDays, kstDateKey } from "@/lib/time";
import {
  toDailyLimits,
  toMyReview,
  toMyVisit,
  type DailyLimits,
  type MyReview,
} from "./my-records";

async function currentUserId(supabase: ServerSupabase) {
  // getUser는 Auth 서버에 토큰을 검증받는다(쿠키 값만 믿지 않는다)
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function depsFor(supabase: ServerSupabase): FeedbackDeps {
  return {
    currentUserId: () => currentUserId(supabase),
    now: () => new Date(),
    async readVisit(userId, visitId) {
      const { data } = await supabase
        .from("visits")
        .select("id, visited_on, status")
        .eq("user_id", userId)
        .eq("id", visitId)
        .maybeSingle();
      if (!data) return null;
      const status = data.status;
      if (status !== "candidate" && status !== "visited" && status !== "not_visited")
        return null;
      return { id: data.id, visited_on: data.visited_on, status };
    },
    async findVisit(userId, key) {
      const { data } = await supabase
        .from("visits")
        .select("id, reviews(id)")
        .eq("user_id", userId)
        .eq("place_id", key.placeId)
        .eq("visited_on", key.visitedOn)
        .eq("meal", key.meal)
        .maybeSingle();
      return data ? { id: data.id, hasReview: data.reviews !== null } : null;
    },
    async insertVisit(userId, row) {
      const { data, error } = await supabase
        .from("visits")
        .insert({ user_id: userId, ...row })
        .select("id")
        .maybeSingle();
      return { id: data?.id ?? null, error };
    },
    async deleteVisit(userId, visitId) {
      await supabase.from("visits").delete().eq("user_id", userId).eq("id", visitId);
    },
    async setNotVisited(userId, visitId) {
      const { data, error } = await supabase
        .from("visits")
        .update({ status: "not_visited" })
        .eq("user_id", userId)
        .eq("id", visitId)
        .eq("status", "candidate")
        .select("id");
      return { count: data?.length ?? 0, error };
    },
    async markPrompted(userId, visitId) {
      // 값은 DB 트리거가 now()로 바꾸고, 이미 있으면 그대로 둔다(한 번만)
      const { data, error } = await supabase
        .from("visits")
        .update({ feedback_requested_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("id", visitId)
        .is("feedback_requested_at", null)
        .select("id");
      return { count: data?.length ?? 0, error };
    },
    async insertReview(userId, visitId, row) {
      // place_id는 트리거(reviews_before_insert)가 방문에서 복사한다. 열 권한도 없어 보내면 안 된다.
      // 생성 타입은 not null 열이라 필수로 적으므로 타입만 맞춘다(값은 보내지 않는다).
      const insert = {
        user_id: userId,
        visit_id: visitId,
        ...row,
      } as TablesInsert<"reviews">;
      const { data, error } = await supabase
        .from("reviews")
        .insert(insert)
        .select("id")
        .maybeSingle();
      return { id: data?.id ?? null, error };
    },
    async findReviewIdByVisit(userId, visitId) {
      const { data } = await supabase
        .from("reviews")
        .select("id")
        .eq("user_id", userId)
        .eq("visit_id", visitId)
        .maybeSingle();
      return data?.id ?? null;
    },
    async updateReview(userId, reviewId, patch) {
      const { data, error } = await supabase
        .from("reviews")
        .update(patch)
        .eq("user_id", userId)
        .eq("id", reviewId)
        .select("id");
      return { count: data?.length ?? 0, error };
    },
    async deleteReview(userId, reviewId) {
      const { data, error } = await supabase
        .from("reviews")
        .delete()
        .eq("user_id", userId)
        .eq("id", reviewId)
        .select("id");
      return { count: data?.length ?? 0, error };
    },
  };
}

async function withSupabase<R>(
  fallback: R,
  fn: (supabase: ServerSupabase) => Promise<R>,
): Promise<R> {
  if (!isEnabled("auth")) return fallback;
  const supabase = await createServerSupabase();
  if (!supabase) return fallback;
  try {
    return await fn(supabase);
  } catch {
    return fallback;
  }
}

const write = <R>(fn: (deps: FeedbackDeps) => Promise<R>, fallback: R) =>
  withSupabase(fallback, (s) => fn(depsFor(s)));

/* ---------- 쓰기 ---------- */

/** 👍/👎 한 탭 (FB-01, 나 탭 늦은 답) */
export async function rateVisitAction(
  input: RateVisitRequest,
): Promise<RateVisitResult> {
  return write((d) => rateVisit(input, d), fail("save"));
}

/** 안 갔어요 (FB-05) */
export async function markNotVisitedAction(
  input: VisitIdRequest,
): Promise<WriteResult> {
  return write((d) => markNotVisited(input, d), fail("save"));
}

/** 홈 띠를 처음 보였을 때 한 번 (FB-04). isNewPrompt가 true일 때만 부른다 */
export async function markFeedbackPromptedAction(
  input: VisitIdRequest,
): Promise<WriteResult> {
  return write((d) => markFeedbackPrompted(input, d), fail("save"));
}

/** 선택 입력 저장, 내 후기 수정 (FB-02, FB-03, FB-07) */
export async function updateReviewAction(
  input: UpdateReviewRequest,
): Promise<WriteResult> {
  return write((d) => updateReview(input, d), fail("save"));
}

/** 내 후기 삭제 (FB-07) */
export async function deleteReviewAction(
  input: ReviewIdRequest,
): Promise<WriteResult> {
  return write((d) => deleteReview(input, d), fail("save"));
}

/** 상세에서 직접 후기 쓰기 (FB-06) */
export async function writeFromDetailAction(
  input: WriteFromDetailRequest,
): Promise<WriteFromDetailResult> {
  return write((d) => writeFromDetail(input, d), fail("save"));
}

/* ---------- 읽기 ---------- */

export type SignedOut = { signedIn: false };

const dateKey = z.iso.date();
const myVisitsSchema = z
  .strictObject({
    /** KST 날짜 키(포함) */
    from: dateKey,
    /** KST 날짜 키(포함) */
    to: dateKey,
    placeId: z.string().regex(/^[0-9]{1,20}$/).optional(),
  })
  .refine((v) => v.from <= v.to);

export type MyVisitsRequest = z.input<typeof myVisitsSchema>;
export type MyVisitsResult = SignedOut | { signedIn: true; visits: MyVisit[] };

async function readSession<R>(
  fn: (supabase: ServerSupabase, userId: string) => Promise<R>,
): Promise<SignedOut | R> {
  if (!isEnabled("auth")) return { signedIn: false };
  const supabase = await createServerSupabase();
  if (!supabase) return { signedIn: false };
  const userId = await currentUserId(supabase);
  if (!userId) return { signedIn: false };
  return fn(supabase, userId);
}

/**
 * 내 방문(최신순)과 내 후기 요약. 홈 띠 대상(최근 7일 정도), 나 탭 기록(2주씩), 상세 내 방문(placeId)에 쓴다.
 * 범위는 최대 62일.
 */
export async function myVisitsAction(
  input: MyVisitsRequest,
): Promise<MyVisitsResult> {
  const parsed = myVisitsSchema.safeParse(input);
  if (!parsed.success) throw new Error("invalid");
  const { from, to, placeId } = parsed.data;
  if (Date.parse(to) - Date.parse(from) > 62 * 86_400_000)
    throw new Error("invalid");
  return readSession(async (supabase, userId) => {
    let q = supabase
      .from("visits")
      .select(
        "id, place_id, place_url, meal, source, visited_on, created_at, status, feedback_requested_at, reviews(id, rating)",
      )
      .eq("user_id", userId)
      .gte("visited_on", from)
      .lte("visited_on", to);
    if (placeId) q = q.eq("place_id", placeId);
    const { data, error } = await q
      .order("visited_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error("load");
    return {
      signedIn: true as const,
      visits: data.flatMap((r) => {
        const v = toMyVisit(r);
        return v ? [v] : [];
      }),
    };
  });
}

/** 홈 띠가 볼 방문 범위: 영업일 48시간이 긴 연휴를 넘어도 닿게 10일 (use-my-records FEEDBACK_LOOKBACK_DAYS와 같다) */
const BAND_LOOKBACK_DAYS = 10;

export type FeedbackBandResult =
  | SignedOut
  | {
      signedIn: true;
      visits: MyVisit[];
      /** 오늘 띠가 물을 방문. 판정(영업일 48시간, 하루 1회)은 서버에서 한다 */
      target: { visitId: string; isNewPrompt: boolean } | null;
    };

/**
 * 홈 어제 피드백 띠 (T6.8). 최근 방문과 물을 방문을 함께 돌려준다.
 * 영업일 판정(공휴일 표)을 서버에서 해서 홈 첫 로드 번들에 공휴일 표가 들어가지 않게 한다(bundle-log 2026-11-01).
 */
export async function feedbackBandAction(): Promise<FeedbackBandResult> {
  const now = new Date();
  const range = {
    from: kstDateKey(addKstDays(now, -BAND_LOOKBACK_DAYS)),
    to: kstDateKey(now),
  };
  const result = await myVisitsAction(range);
  if (!result.signedIn) return result;
  const target = pickFeedbackTarget(result.visits, now);
  return {
    signedIn: true,
    visits: result.visits,
    target: target
      ? { visitId: target.visit.id, isNewPrompt: target.isNewPrompt }
      : null,
  };
}

const myReviewsSchema = z.strictObject({
  offset: z.number().int().min(0).max(1000).optional(),
  limit: z.number().int().min(1).max(50).optional(),
  placeId: z.string().regex(/^[0-9]{1,20}$/).optional(),
});
export type MyReviewsRequest = z.input<typeof myReviewsSchema>;
export type MyReviewsResult =
  | SignedOut
  | { signedIn: true; reviews: MyReview[]; hasMore: boolean };

/** 내 후기 목록 최신순 (HIS-03, 상세 내 후기 FB-07은 placeId) */
export async function myReviewsAction(
  input: MyReviewsRequest = {},
): Promise<MyReviewsResult> {
  const parsed = myReviewsSchema.safeParse(input);
  if (!parsed.success) throw new Error("invalid");
  const { offset = 0, limit = 20, placeId } = parsed.data;
  return readSession(async (supabase, userId) => {
    let q = supabase
      .from("reviews")
      .select(
        "id, visit_id, place_id, rating, price_krw, tags, body, is_public, hidden_at, created_at, updated_at, visits(place_url, visited_on, meal)",
      )
      .eq("user_id", userId);
    if (placeId) q = q.eq("place_id", placeId);
    const { data, error } = await q
      .order("created_at", { ascending: false })
      .range(offset, offset + limit);
    if (error) throw new Error("load");
    const rows = data.flatMap((r) => {
      const v = toMyReview(r);
      return v ? [v] : [];
    });
    return {
      signedIn: true as const,
      reviews: rows.slice(0, limit),
      hasMore: data.length > limit,
    };
  });
}

export type MyDailyLimitsResult =
  | SignedOut
  | { signedIn: true; limits: DailyLimits };

/** 오늘 남은 한도 (D-13 안건 12: 할인 등록, 신고를 열 때 미리 알림) */
export async function myDailyLimitsAction(): Promise<MyDailyLimitsResult> {
  return readSession(async (supabase) => {
    const { data, error } = await supabase.rpc("my_daily_limits");
    if (error) throw new Error("load");
    const limits = toDailyLimits(data ?? []);
    if (!limits) throw new Error("load");
    return { signedIn: true as const, limits };
  });
}

export type MyPlace = {
  placeId: string;
  placeUrl: string | null;
  createdAt: string;
};
export type MyPlacesResult =
  | SignedOut
  | { signedIn: true; favorites: MyPlace[]; blocked: MyPlace[] };

/** 즐겨찾기와 다시 안 갈 곳 목록 (HIS-02). 쓰기는 place/actions.ts의 setFavoriteAction, setBlockedAction */
export async function myPlacesAction(): Promise<MyPlacesResult> {
  return readSession(async (supabase, userId) => {
    const [fav, block] = await Promise.all([
      supabase
        .from("favorites")
        .select("place_id, place_url, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("blocklist")
        .select("place_id, place_url, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);
    if (fav.error || block.error) throw new Error("load");
    const map = (r: { place_id: string; place_url: string | null; created_at: string }) => ({
      placeId: r.place_id,
      placeUrl: r.place_url,
      createdAt: r.created_at,
    });
    return {
      signedIn: true as const,
      favorites: fav.data.map(map),
      blocked: block.data.map(map),
    };
  });
}
