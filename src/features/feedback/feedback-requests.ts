// 식후 피드백과 후기 저장 검사와 흐름 (T6.8~T6.10, T6.17, T6.18, FB-01~07, HIS-01, MOD-04, MOD-05).
// 서버 액션(actions.ts)만 쓴다. Supabase는 주입받아 테스트한다(place-requests.ts와 같은 방식).
//
// 규칙
// - 입력은 strictObject로 다시 검사한다. 장소명, 좌표, 현위치 같은 값은 받지 않는다(CLAUDE.md 7장, T0.16, T0.18).
// - 한 줄 후기는 금칙어, 연락처, 링크를 거른다(MOD-04). 걸리면 error "banned"(낱말은 알리지 않음).
// - 가격 1천~10만 원 정수, 태그는 8종 slug 안에서 겹치지 않게, 글 100자(DB 제약과 같다).
// - 하루 20건, 14일, 내 방문 확인은 DB 트리거가 판정하고 여기서는 오류 이름을 결과로 바꾼다(db-errors.ts).
// - "안 갔어요"는 후기가 아니라 visits.status = not_visited(FB-05). 14일 판정은 DB에 없어 여기서 한다(canAnswerLate).
// - 상세에서 직접 쓰기(FB-06)는 방문(source detail)을 만들고 후기를 붙인다. 후기가 실패하면 방금 만든 방문은 지운다.
//   다만 마지막 후기 뒤에 생긴 답 없는 방문 후보(길찾기, 14일 안)가 있으면 새 방문 대신 그 방문을 평가한다(2026-11-01 사용자 결정).
import * as z from "zod";
import { hasBannedIssue, withoutBannedContent } from "@/lib/moderation";
import { mapPgError, type PgErrorLike } from "@/lib/supabase/db-errors";
import { fail, type WriteResult } from "@/lib/supabase/write-result";
import { addKstDays, getMeal, kstDateKey, type Meal } from "@/lib/time";
import { LATE_ANSWER_DAYS } from "@/lib/time/constants";
import { placeIdSchema } from "@/features/place/place-requests";
import {
  canAnswerLate,
  pickOpenVisit,
  type VisitStatus,
} from "./feedback-target";
import {
  REVIEW_BODY_MAX,
  REVIEW_PRICE_MAX,
  REVIEW_PRICE_MIN,
  REVIEW_RATINGS,
  REVIEW_TAGS,
  type ReviewRating,
  type ReviewTag,
} from "./labels";

/* ---------- 스키마 ---------- */

const unique = <T>(arr: readonly T[]) => new Set(arr).size === arr.length;

const visitId = z.uuid();
const reviewId = z.uuid();
const rating = z.enum(REVIEW_RATINGS);
const price = z
  .number()
  .int()
  .min(REVIEW_PRICE_MIN)
  .max(REVIEW_PRICE_MAX)
  .nullable();
const tags = z.array(z.enum(REVIEW_TAGS)).max(REVIEW_TAGS.length).refine(unique);
/** 한 줄 후기: 앞뒤 공백 제거, 줄바꿈과 제어 문자 없음, 100자, 금칙어 없음. 빈 글은 null(글 없음) */
const body = withoutBannedContent(
  z
    .string()
    .trim()
    .max(REVIEW_BODY_MAX)
    .refine((v) => !/\p{Cc}/u.test(v)),
)
  .nullable()
  .transform((v) => (v === null || v === "" ? null : v));
const isPublic = z.boolean();

function placeUrlMatches(v: { placeId: string; placeUrl?: string | null }) {
  if (v.placeUrl == null) return true;
  return (
    v.placeUrl === `https://place.map.kakao.com/${v.placeId}` ||
    v.placeUrl === `http://place.map.kakao.com/${v.placeId}`
  );
}

/** 한 탭 👍/👎 (FB-01, 나 탭 늦은 답 HIS-01) */
export const rateVisitSchema = z.strictObject({ visitId, rating });
/** 안 갔어요 (FB-05), 홈 띠가 물었음 기록 (FB-04) */
export const visitIdSchema = z.strictObject({ visitId });
/** 선택 입력 저장과 내 후기 수정 (FB-02, FB-03, FB-07). 빠진 칸은 그대로, null은 지우기 */
export const updateReviewSchema = z
  .strictObject({
    reviewId,
    rating: rating.optional(),
    priceKrw: price.optional(),
    tags: tags.optional(),
    body: body.optional(),
    isPublic: isPublic.optional(),
  })
  .refine((v) => Object.keys(v).length > 1);
export const reviewIdSchema = z.strictObject({ reviewId });
/** 상세에서 직접 쓰기 (FB-06). 한 탭 답 필수(D-11 안건 9) */
export const writeFromDetailSchema = z
  .strictObject({
    placeId: placeIdSchema,
    placeUrl: z.string().max(200).nullable().optional(),
    rating,
    priceKrw: price.optional(),
    tags: tags.optional(),
    body: body.optional(),
    isPublic: isPublic.optional(),
  })
  .refine(placeUrlMatches);

export type RateVisitRequest = z.input<typeof rateVisitSchema>;
export type VisitIdRequest = z.input<typeof visitIdSchema>;
export type UpdateReviewRequest = z.input<typeof updateReviewSchema>;
export type ReviewIdRequest = z.input<typeof reviewIdSchema>;
export type WriteFromDetailRequest = z.input<typeof writeFromDetailSchema>;

/** 검사 실패를 결과로: 금칙어면 banned, 그 밖에는 invalid */
export function parseInput<S extends z.ZodType>(
  schema: S,
  raw: unknown,
): { ok: true; data: z.output<S> } | { ok: false; error: "banned" | "invalid" } {
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    error: hasBannedIssue(parsed.error) ? "banned" : "invalid",
  };
}

/* ---------- 의존성 ---------- */

export type ReviewWriteRow = {
  rating: ReviewRating;
  price_krw?: number | null;
  tags?: ReviewTag[];
  body?: string | null;
  is_public?: boolean;
};

export type VisitSummary = {
  id: string;
  visited_on: string;
  status: VisitStatus;
};

export type OpenVisitRow = {
  id: string;
  status: VisitStatus;
  visitedOn: string;
  createdAt: string;
  /** 붙은 후기가 있으면 그 id */
  review: string | null;
};

/** 바꾼 행 수와 오류 */
export type Changed = { count: number; error: PgErrorLike };
export type Inserted = { id: string | null; error: PgErrorLike };

export type FeedbackDeps = {
  currentUserId: () => Promise<string | null>;
  now: () => Date;
  readVisit: (userId: string, visitId: string) => Promise<VisitSummary | null>;
  findVisit: (
    userId: string,
    key: { placeId: string; visitedOn: string; meal: Meal },
  ) => Promise<{ id: string; hasReview: boolean } | null>;
  insertVisit: (
    userId: string,
    row: {
      place_id: string;
      place_url: string | null;
      meal: Meal;
      source: "detail";
    },
  ) => Promise<Inserted>;
  /** 이 식당의 내 방문 후보(status candidate, visited_on >= since). 상세 쓰기가 붙일 방문을 고른다 */
  listOpenVisits: (
    userId: string,
    key: { placeId: string; since: string },
  ) => Promise<OpenVisitRow[]>;
  /** 이 식당의 내 마지막 후기 created_at. 없으면 null */
  latestReviewAt: (userId: string, placeId: string) => Promise<string | null>;
  deleteVisit: (userId: string, visitId: string) => Promise<Changed>;
  setNotVisited: (userId: string, visitId: string) => Promise<Changed>;
  markPrompted: (userId: string, visitId: string) => Promise<Changed>;
  insertReview: (
    userId: string,
    visitId: string,
    row: ReviewWriteRow,
  ) => Promise<Inserted>;
  findReviewIdByVisit: (
    userId: string,
    visitId: string,
  ) => Promise<string | null>;
  updateReview: (
    userId: string,
    reviewId: string,
    patch: Partial<ReviewWriteRow>,
  ) => Promise<Changed>;
  deleteReview: (userId: string, reviewId: string) => Promise<Changed>;
};

async function signedIn(deps: Pick<FeedbackDeps, "currentUserId">) {
  return deps.currentUserId().catch(() => null);
}

function toRow(v: {
  rating?: ReviewRating;
  priceKrw?: number | null;
  tags?: ReviewTag[];
  body?: string | null;
  isPublic?: boolean;
}): Partial<ReviewWriteRow> {
  const row: Partial<ReviewWriteRow> = {};
  if (v.rating !== undefined) row.rating = v.rating;
  if (v.priceKrw !== undefined) row.price_krw = v.priceKrw;
  if (v.tags !== undefined) row.tags = v.tags;
  if (v.body !== undefined) row.body = v.body;
  if (v.isPublic !== undefined) row.is_public = v.isPublic;
  return row;
}

/* ---------- 흐름 ---------- */

export type RateVisitResult = WriteResult<{
  reviewId: string;
  /** false면 이미 답한 방문이라 평가만 바꿨다 */
  created: boolean;
}>;

/** 👍/👎 한 탭. 후기 행을 만들고(방문은 visited가 된다), 이미 있으면 평가만 바꾼다 */
export async function rateVisit(
  raw: unknown,
  deps: FeedbackDeps,
): Promise<RateVisitResult> {
  const p = parseInput(rateVisitSchema, raw);
  if (!p.ok) return fail(p.error);
  const userId = await signedIn(deps);
  if (!userId) return fail("unauthenticated");
  const { visitId: id, rating: r } = p.data;
  const inserted = await deps.insertReview(userId, id, { rating: r });
  if (!inserted.error && inserted.id)
    return { ok: true, reviewId: inserted.id, created: true };
  const failure = mapPgError(inserted.error) ?? fail("save");
  if (failure.error !== "duplicate") return failure;
  const existing = await deps.findReviewIdByVisit(userId, id);
  if (!existing) return fail("save");
  const changed = await deps.updateReview(userId, existing, { rating: r });
  if (changed.error || changed.count !== 1)
    return mapPgError(changed.error) ?? fail("save");
  return { ok: true, reviewId: existing, created: false };
}

/** 안 갔어요 (FB-05). 부정 신호가 아니다. 방문일 포함 14일 안의 답 없는 방문만 */
export async function markNotVisited(
  raw: unknown,
  deps: FeedbackDeps,
): Promise<WriteResult> {
  const p = parseInput(visitIdSchema, raw);
  if (!p.ok) return fail(p.error);
  const userId = await signedIn(deps);
  if (!userId) return fail("unauthenticated");
  const visit = await deps.readVisit(userId, p.data.visitId).catch(() => null);
  if (!visit) return fail("not_found");
  if (visit.status === "not_visited") return { ok: true };
  if (visit.status === "visited") return fail("duplicate");
  if (
    !canAnswerLate(
      { status: visit.status, visitedOn: visit.visited_on },
      deps.now(),
    )
  )
    return fail("too_old");
  const changed = await deps.setNotVisited(userId, visit.id);
  if (changed.error) return mapPgError(changed.error) ?? fail("save");
  return changed.count === 1 ? { ok: true } : fail("not_found");
}

/** 홈 띠가 물었음을 기록 (FB-04 하루 1회). 시각은 DB가 정하고 한 번만 남는다 */
export async function markFeedbackPrompted(
  raw: unknown,
  deps: FeedbackDeps,
): Promise<WriteResult> {
  const p = parseInput(visitIdSchema, raw);
  if (!p.ok) return fail(p.error);
  const userId = await signedIn(deps);
  if (!userId) return fail("unauthenticated");
  const changed = await deps.markPrompted(userId, p.data.visitId);
  if (changed.error) return mapPgError(changed.error) ?? fail("save");
  return { ok: true };
}

/** 선택 입력 저장, 내 후기 수정 (FB-02, FB-03, FB-07) */
export async function updateReview(
  raw: unknown,
  deps: FeedbackDeps,
): Promise<WriteResult> {
  const p = parseInput(updateReviewSchema, raw);
  if (!p.ok) return fail(p.error);
  const userId = await signedIn(deps);
  if (!userId) return fail("unauthenticated");
  const changed = await deps.updateReview(
    userId,
    p.data.reviewId,
    toRow(p.data),
  );
  if (changed.error) return mapPgError(changed.error) ?? fail("save");
  return changed.count === 1 ? { ok: true } : fail("not_found");
}

/** 내 후기 삭제 (FB-07). 방문 기록은 남는다(방문 상태는 visited 그대로). 지워도 하루 한도는 돌아오지 않는다 */
export async function deleteReview(
  raw: unknown,
  deps: FeedbackDeps,
): Promise<WriteResult> {
  const p = parseInput(reviewIdSchema, raw);
  if (!p.ok) return fail(p.error);
  const userId = await signedIn(deps);
  if (!userId) return fail("unauthenticated");
  const changed = await deps.deleteReview(userId, p.data.reviewId);
  if (changed.error) return mapPgError(changed.error) ?? fail("save");
  return changed.count === 1 ? { ok: true } : fail("not_found");
}

/** 내 방문 기록 삭제 (HIS-01, 2026-11-04 사용자 요청). 그 방문의 후기와 메뉴 제보도 cascade로 지워진다 */
export async function removeVisit(
  raw: unknown,
  deps: FeedbackDeps,
): Promise<WriteResult> {
  const p = parseInput(visitIdSchema, raw);
  if (!p.ok) return fail(p.error);
  const userId = await signedIn(deps);
  if (!userId) return fail("unauthenticated");
  const changed = await deps.deleteVisit(userId, p.data.visitId);
  if (changed.error) return mapPgError(changed.error) ?? fail("save");
  return changed.count === 1 ? { ok: true } : fail("not_found");
}

export type WriteFromDetailResult = WriteResult<{
  reviewId: string;
  visitId: string;
}>;

/**
 * 상세에서 직접 후기 쓰기 (FB-06). 마지막 후기 뒤의 답 없는 방문 후보가 있으면 그 방문을 평가하고(2026-11-01),
 * 없으면 오늘 이 끼니의 방문(source detail)을 만들거나 이미 있는 방문에 붙인다.
 * 그 방문에 이미 후기가 있으면 duplicate(화면은 내 후기 수정으로 안내).
 */
export async function writeFromDetail(
  raw: unknown,
  deps: FeedbackDeps,
): Promise<WriteFromDetailResult> {
  const p = parseInput(writeFromDetailSchema, raw);
  if (!p.ok) return fail(p.error);
  const userId = await signedIn(deps);
  if (!userId) return fail("unauthenticated");
  const v = p.data;
  const now = deps.now();
  const meal = getMeal(now);
  const row: ReviewWriteRow = { rating: v.rating, ...toRow(v) };

  // 마지막 후기 뒤에 생긴 답 없는 방문 후보가 있으면 그 방문을 평가한다(중복 방문을 만들지 않는다).
  // 읽기에 실패하면 고르지 않고 원래 흐름(오늘 이 끼니 방문)으로 간다.
  const open = await findOpenVisit(userId, v.placeId, now, deps);
  if (open) {
    const review = await deps.insertReview(userId, open, row);
    if (!review.error && review.id)
      return { ok: true, reviewId: review.id, visitId: open };
    return mapPgError(review.error) ?? fail("save");
  }

  let visitIdValue: string;
  let createdVisit = false;
  const inserted = await deps.insertVisit(userId, {
    place_id: v.placeId,
    place_url: v.placeUrl ?? null,
    meal,
    source: "detail",
  });
  if (!inserted.error && inserted.id) {
    visitIdValue = inserted.id;
    createdVisit = true;
  } else {
    const failure = mapPgError(inserted.error) ?? fail("save");
    if (failure.error !== "duplicate") return failure;
    const existing = await deps
      .findVisit(userId, {
        placeId: v.placeId,
        visitedOn: kstDateKey(now),
        meal,
      })
      .catch(() => null);
    if (!existing) return fail("save");
    if (existing.hasReview) return fail("duplicate");
    visitIdValue = existing.id;
  }

  const review = await deps.insertReview(userId, visitIdValue, row);
  if (!review.error && review.id)
    return { ok: true, reviewId: review.id, visitId: visitIdValue };
  if (createdVisit) await deps.deleteVisit(userId, visitIdValue).catch(() => {});
  return mapPgError(review.error) ?? fail("save");
}

async function findOpenVisit(
  userId: string,
  placeId: string,
  now: Date,
  deps: FeedbackDeps,
): Promise<string | null> {
  try {
    const since = kstDateKey(addKstDays(now, -LATE_ANSWER_DAYS));
    const [visits, latestAt] = await Promise.all([
      deps.listOpenVisits(userId, { placeId, since }),
      deps.latestReviewAt(userId, placeId),
    ]);
    return pickOpenVisit(visits, latestAt, now)?.id ?? null;
  } catch {
    return null;
  }
}
