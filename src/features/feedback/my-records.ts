// 내 방문과 내 후기 행을 화면 모델로 (T6.8 띠 대상, T6.13 나 탭, T6.14 상세 내 방문, HIS-01, HIS-03).
// 순수 함수, 브라우저, 서버 공용. 카카오 값은 place_id, place_url만 있다(이름은 화면이 T5.12a로 찾는다).
import type { Meal } from "@/lib/time";
import type { MyVisit, VisitSource, VisitStatus } from "./feedback-target";
import { isReviewTag, type ReviewRating, type ReviewTag } from "./labels";

/** visits + reviews(id, rating) 한 행 */
export type MyVisitRow = {
  id: string;
  place_id: string;
  place_url: string | null;
  meal: string;
  source: string;
  visited_on: string;
  created_at: string;
  status: string;
  feedback_requested_at: string | null;
  reviews: { id: string; rating: string } | null;
};

const MEALS = new Set(["lunch", "dinner"]);
const SOURCES = new Set(["rec", "poll", "map", "detail"]);
const STATUSES = new Set(["candidate", "visited", "not_visited"]);
const isRating = (v: string): v is ReviewRating => v === "up" || v === "down";

export function toMyVisit(row: MyVisitRow): MyVisit | null {
  if (!MEALS.has(row.meal) || !SOURCES.has(row.source) || !STATUSES.has(row.status))
    return null;
  const review =
    row.reviews && isRating(row.reviews.rating)
      ? { id: row.reviews.id, rating: row.reviews.rating }
      : null;
  return {
    id: row.id,
    placeId: row.place_id,
    placeUrl: row.place_url,
    meal: row.meal as Meal,
    source: row.source as VisitSource,
    visitedOn: row.visited_on,
    createdAt: row.created_at,
    status: row.status as VisitStatus,
    feedbackRequestedAt: row.feedback_requested_at,
    review,
  };
}

/** 내 후기(본인만 읽는다, 비공개 글 포함) */
export type MyReview = {
  readonly id: string;
  readonly visitId: string;
  readonly placeId: string;
  readonly placeUrl: string | null;
  readonly visitedOn: string;
  readonly meal: Meal;
  readonly rating: ReviewRating;
  readonly priceKrw: number | null;
  readonly tags: readonly ReviewTag[];
  readonly body: string | null;
  readonly isPublic: boolean;
  /** 신고 3건이나 관리자로 숨겨져 다른 사람에게 보이지 않는다 */
  readonly hidden: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type MyReviewRow = {
  id: string;
  visit_id: string;
  place_id: string;
  rating: string;
  price_krw: number | null;
  tags: string[];
  body: string | null;
  is_public: boolean;
  hidden_at: string | null;
  created_at: string;
  updated_at: string;
  visits: { place_url: string | null; visited_on: string; meal: string } | null;
};

export function toMyReview(row: MyReviewRow): MyReview | null {
  if (!isRating(row.rating) || !row.visits || !MEALS.has(row.visits.meal))
    return null;
  return {
    id: row.id,
    visitId: row.visit_id,
    placeId: row.place_id,
    placeUrl: row.visits.place_url,
    visitedOn: row.visits.visited_on,
    meal: row.visits.meal as Meal,
    rating: row.rating,
    priceKrw: row.price_krw,
    tags: row.tags.filter(isReviewTag),
    body: row.body,
    isPublic: row.is_public,
    hidden: row.hidden_at !== null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** my_daily_limits 결과 (D-13 안건 12: 열 때 미리 알림) */
export type DailyLimits = Readonly<
  Record<"reviews" | "reports" | "deals", { used: number; limit: number; remaining: number }>
>;

export function toDailyLimits(
  rows: readonly { bucket: string; used: number; limit_count: number; remaining: number }[],
): DailyLimits | null {
  const pick = (b: string) => rows.find((r) => r.bucket === b);
  const reviews = pick("reviews");
  const reports = pick("reports");
  const deals = pick("deals");
  if (!reviews || !reports || !deals) return null;
  const one = (r: { used: number; limit_count: number; remaining: number }) => ({
    used: r.used,
    limit: r.limit_count,
    remaining: r.remaining,
  });
  return { reviews: one(reviews), reports: one(reports), deals: one(deals) };
}
