// 후기 DB 값 목록 (T6.5 마이그레이션 reviews 제약과 같은 값). 브라우저, 서버 공용, zod 없음.
// 라벨은 src/copy/feedback.ts reviewTagLabels.

/** 태그 8종 slug (FB-02). 순서는 시트 격자 순서 */
export const REVIEW_TAGS = [
  "solo_ok",
  "quick_15",
  "short_wait",
  "private_room",
  "group_seats",
  "good_value",
  "big_portion",
  "quiet",
] as const;
export type ReviewTag = (typeof REVIEW_TAGS)[number];

export const REVIEW_RATINGS = ["up", "down"] as const;
export type ReviewRating = (typeof REVIEW_RATINGS)[number];

/** 1인 가격 범위(원, feedback 안건 4). 스테퍼는 500원 단계 */
export const REVIEW_PRICE_MIN = 1_000;
export const REVIEW_PRICE_MAX = 100_000;
export const REVIEW_PRICE_STEP = 500;
/** 한 줄 후기 최대 글자 수 */
export const REVIEW_BODY_MAX = 100;

export function isReviewTag(v: string): v is ReviewTag {
  return (REVIEW_TAGS as readonly string[]).includes(v);
}
