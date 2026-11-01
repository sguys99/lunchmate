// 후기 시트 입력 상태와 보내기 흐름 (T6.9, T6.10, FB-02, FB-03, FB-06, FB-07, D-11 안건 4, 9, 11).
// 순수 함수와 주입형 흐름이다. React, 문구, 네트워크 의존 없음(서버 액션은 deps로 받는다).
//
// 규칙
// - 가격은 500원 단계, 1천~10만 원(서버 zod와 같은 범위). 아직 고르지 않았으면 null이고 화면은 추정가를 옅게 보인다.
// - 가격 칩 3개: 추정가를 천 원 단위로 맞춘 -1천, 추정, +1천 (1천 원 아래는 1천 원).
// - 한 줄 후기는 앞뒤 공백을 빼고 빈 글이면 null(글 없음). 100자는 입력 칸이 막고 서버가 다시 검사한다.
// - 보내기: 홈 한 탭 뒤(details)는 내 후기 수정, 접힌 줄(rate)은 한 탭 답 + 세부, 상세 쓰기(write)는 방문과 후기를 함께,
//   내 후기 수정(edit)은 모든 칸. 저장 실패(save)는 자동으로 한 번 더 보내고(PRD 12장), 그래도 실패면 결과를 돌려준다.
// - rate에서 한 탭 답은 저장됐는데 세부가 실패하면 reviewId를 함께 돌려줘 다시 보내기가 세부만 보내게 한다.
import type { WriteFailure, WriteResult } from "@/lib/supabase/write-result";
import {
  REVIEW_BODY_MAX,
  REVIEW_PRICE_MAX,
  REVIEW_PRICE_MIN,
  REVIEW_PRICE_STEP,
  type ReviewRating,
  type ReviewTag,
} from "./labels";
import type { MyReview } from "./my-records";

export type ReviewDraft = {
  readonly rating: ReviewRating | null;
  /** null이면 아직 고르지 않음(또는 지움) */
  readonly priceKrw: number | null;
  readonly tags: readonly ReviewTag[];
  readonly body: string;
  readonly isPublic: boolean;
};

export const EMPTY_DRAFT: ReviewDraft = {
  rating: null,
  priceKrw: null,
  tags: [],
  body: "",
  isPublic: true,
};

export function draftFromReview(r: MyReview): ReviewDraft {
  return {
    rating: r.rating,
    priceKrw: r.priceKrw,
    tags: [...r.tags],
    body: r.body ?? "",
    isPublic: r.isPublic,
  };
}

/** 가격, 태그, 글 중 하나라도 있는가 */
export function hasDetails(d: ReviewDraft): boolean {
  return d.priceKrw !== null || d.tags.length > 0 || d.body.trim() !== "";
}

/* ---------- 가격 ---------- */

export function clampPrice(v: number): number {
  const stepped = Math.round(v / REVIEW_PRICE_STEP) * REVIEW_PRICE_STEP;
  return Math.min(REVIEW_PRICE_MAX, Math.max(REVIEW_PRICE_MIN, stepped));
}

/** 스테퍼 한 번: 고르지 않았으면 추정가에서 시작한다 */
export function stepPrice(
  current: number | null,
  estimate: number,
  dir: 1 | -1,
): number {
  const from = current ?? clampPrice(estimate);
  return clampPrice(from + dir * REVIEW_PRICE_STEP);
}

/** 가격 칩 3개 (D-11 안건 4) */
export function pricePresets(estimate: number): number[] {
  const base = Math.max(1000, Math.round(estimate / 1000) * 1000);
  const values = [-1000, 0, 1000].map((o) =>
    Math.min(REVIEW_PRICE_MAX, Math.max(1000, base + o)),
  );
  return [...new Set(values)];
}

/** 짧은 가격 이름: 9000 → "9천 원", 10000 → "1만 원", 11000 → "1만 1천 원", 9500 → "9,500원" */
export function shortWon(won: number): string {
  const man = Math.floor(won / 10000);
  const cheon = Math.floor((won % 10000) / 1000);
  if (won % 1000 !== 0) return `${Math.round(won).toLocaleString("ko-KR")}원`;
  if (man === 0) return `${cheon}천 원`;
  return cheon === 0 ? `${man}만 원` : `${man}만 ${cheon}천 원`;
}

/* ---------- 글 ---------- */

/** 칸에 넣을 글: 줄바꿈을 빼고 100자(코드 포인트)에서 자른다 */
export function limitBody(v: string): string {
  return [...v.replace(/[\r\n]+/g, " ")].slice(0, REVIEW_BODY_MAX).join("");
}

export function bodyLength(v: string): number {
  return [...v].length;
}

const bodyValue = (v: string) => (v.trim() === "" ? null : v.trim());

/* ---------- 보내기 ---------- */

export type SheetMode =
  /** 홈: 한 탭 답 뒤 세부 (reviewId는 rateVisit 결과) */
  | {
      readonly kind: "details";
      readonly reviewId: string;
      readonly rating: ReviewRating;
    }
  /** 홈: 접힌 줄에서 연 경우. 한 탭 답부터 */
  | { readonly kind: "rate"; readonly visitId: string }
  /** 상세에서 직접 쓰기 (FB-06) */
  | {
      readonly kind: "write";
      readonly placeId: string;
      readonly placeUrl: string | null;
    }
  /** 내 후기 수정 (FB-07) */
  | { readonly kind: "edit"; readonly reviewId: string; readonly review: MyReview };

/** 한 탭 답이 시트 안에서 필요한가 */
export function needsRating(mode: SheetMode): boolean {
  return mode.kind !== "details";
}

/** "남기기"를 누를 수 있는가 (D-11 안건 9: 상세 쓰기는 한 탭 답 필수) */
export function canSubmit(mode: SheetMode, d: ReviewDraft): boolean {
  if (needsRating(mode)) return d.rating !== null;
  return hasDetails(d) || !d.isPublic;
}

export type SubmitDeps = {
  rateVisit: (input: {
    visitId: string;
    rating: ReviewRating;
  }) => Promise<WriteResult<{ reviewId: string; created: boolean }>>;
  updateReview: (input: {
    reviewId: string;
    rating?: ReviewRating;
    priceKrw?: number | null;
    tags?: ReviewTag[];
    body?: string | null;
    isPublic?: boolean;
  }) => Promise<WriteResult>;
  writeFromDetail: (input: {
    placeId: string;
    placeUrl?: string | null;
    rating: ReviewRating;
    priceKrw?: number | null;
    tags?: ReviewTag[];
    body?: string | null;
    isPublic?: boolean;
  }) => Promise<WriteResult<{ reviewId: string; visitId: string }>>;
};

export type SubmitResult =
  | { ok: true; reviewId: string; rating: ReviewRating }
  | (WriteFailure & {
      /** rate에서 한 탭 답만 저장된 경우. 다시 보내기는 세부만 보낸다 */
      savedReviewId?: string;
    });

/** 저장 실패(네트워크 등)면 한 번 더 보낸다 (PRD 12장, D-11 안건 11) */
export async function withRetry<R extends WriteResult>(
  fn: () => Promise<R>,
): Promise<R | WriteFailure> {
  const once = () =>
    fn().catch((): WriteFailure => ({ ok: false, error: "save" }));
  const first = await once();
  if (first.ok || first.error !== "save") return first;
  return once();
}

function details(d: ReviewDraft) {
  return {
    priceKrw: d.priceKrw,
    tags: [...d.tags],
    body: bodyValue(d.body),
    isPublic: d.isPublic,
  };
}

/**
 * 시트의 "남기기". savedReviewId는 지난번 rate에서 한 탭 답만 저장된 경우(다시 보내기).
 */
export async function submitReview(
  mode: SheetMode,
  d: ReviewDraft,
  deps: SubmitDeps,
  savedReviewId?: string,
): Promise<SubmitResult> {
  if (!canSubmit(mode, d)) return { ok: false, error: "invalid" };
  switch (mode.kind) {
    case "details": {
      const r = await withRetry(() =>
        deps.updateReview({ reviewId: mode.reviewId, ...details(d) }),
      );
      return r.ok
        ? { ok: true, reviewId: mode.reviewId, rating: mode.rating }
        : r;
    }
    case "edit": {
      const r = await withRetry(() =>
        deps.updateReview({
          reviewId: mode.reviewId,
          rating: d.rating ?? mode.review.rating,
          ...details(d),
        }),
      );
      return r.ok
        ? {
            ok: true,
            reviewId: mode.reviewId,
            rating: d.rating ?? mode.review.rating,
          }
        : r;
    }
    case "write": {
      const rating = d.rating;
      if (!rating) return { ok: false, error: "invalid" };
      const r = await withRetry(() =>
        deps.writeFromDetail({
          placeId: mode.placeId,
          placeUrl: mode.placeUrl,
          rating,
          ...details(d),
        }),
      );
      return r.ok ? { ok: true, reviewId: r.reviewId, rating } : r;
    }
    case "rate": {
      const rating = d.rating;
      if (!rating) return { ok: false, error: "invalid" };
      let reviewId = savedReviewId;
      if (!reviewId) {
        const r = await withRetry(() =>
          deps.rateVisit({ visitId: mode.visitId, rating }),
        );
        if (!r.ok) return r;
        reviewId = r.reviewId;
      }
      if (!hasDetails(d) && d.isPublic) return { ok: true, reviewId, rating };
      const u = await withRetry(() =>
        deps.updateReview({ reviewId: reviewId, ...details(d) }),
      );
      return u.ok
        ? { ok: true, reviewId, rating }
        : { ...u, savedReviewId: reviewId };
    }
  }
}

/** feedback_submitted stage (PRD 10.2, 2026-11-01): 한 탭 답 tap, 시트의 세부 저장 detail */
export type FeedbackStage = "tap" | "detail";

export type FeedbackSubmittedProps = {
  rating: ReviewRating | "not_visited";
  stage: FeedbackStage;
  has_price: boolean;
  tag_count: number;
  has_review: boolean;
};

/**
 * feedback_submitted 속성 (PRD 10.2). 개인 정보, 장소명, 글 내용 없음.
 * d가 null이면 한 탭 답(stage tap, 세부 없음), 있으면 시트의 세부 저장(stage detail).
 */
export function feedbackSubmittedProps(
  rating: ReviewRating | "not_visited",
  d: ReviewDraft | null,
): FeedbackSubmittedProps {
  return {
    rating,
    stage: d ? "detail" : "tap",
    has_price: d?.priceKrw != null,
    tag_count: d?.tags.length ?? 0,
    has_review: d ? d.body.trim() !== "" : false,
  };
}

/**
 * 시트 저장 한 번에 보낼 feedback_submitted 목록 (2026-11-01 사용자 결정).
 * - 시트 안에서 새 평가를 만들면(접힌 줄에서 연 rate, 상세 쓰기 write) 한 탭 답 tap을 하나 보낸다.
 * - 세부(가격, 태그, 글, 나만 보기)를 저장하면 detail을 하나 보낸다. 홈 한 탭 뒤 세부(details)와 수정(edit)은 detail만.
 * 응답률과 North Star는 tap만, 입력률은 detail만 센다.
 */
export function feedbackSubmittedEvents(
  mode: SheetMode,
  rating: ReviewRating,
  d: ReviewDraft,
): FeedbackSubmittedProps[] {
  const out: FeedbackSubmittedProps[] = [];
  const createsRating = mode.kind === "rate" || mode.kind === "write";
  if (createsRating) out.push(feedbackSubmittedProps(rating, null));
  const savesDetails = hasDetails(d) || !d.isPublic;
  if (!createsRating || savesDetails) out.push(feedbackSubmittedProps(rating, d));
  return out;
}
