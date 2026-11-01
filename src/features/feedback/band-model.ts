// 홈 어제 피드백 띠가 무엇을 그릴지 (T6.8, FB-01, FB-04, FB-05, D-05 D1, D-11 안건 2, 3). 순수 함수.
//
// - 묻는 띠(ask)와 접힌 줄(collapsed): 서버가 pickFeedbackTarget으로 고른 방문(feedbackBandAction). 오늘 길찾기를 눌렀으면 접힌 줄.
//   영업일 48시간 판정(공휴일 표)은 서버에서 한다. 이 파일은 feedback-target.ts 값을 가져오지 않는다(홈 첫 로드 예산).
//   길찾기 신호는 이 탭에서 누른 기록(directedToday) 또는 오늘 날짜의 방문 후보(rec, map, poll, 답 전 detail)가 있는지다(새로 고쳐도 같다).
// - 고마움 줄(thanks): 이 화면에서 방금 답했거나(local), 오늘 물은 방문에 이미 답이 있으면(새로 고침, 탭 이동 뒤에도) 그날 남긴다.
// - 그 밖에는 띠가 없다(hidden). 오프라인과 비로그인은 화면이 아예 띠를 두지 않는다.
import { kstDateKey } from "@/lib/time/kst";
import type { MyVisit } from "./feedback-target";
import type { ReviewRating } from "./labels";

export type BandAnswer = ReviewRating | "not_visited";

/** 이 화면에서 방금 한 답 */
export type BandLocal = {
  readonly visit: MyVisit;
  readonly answer: BandAnswer;
  /** 👍/👎 저장이 끝나 받은 후기 id. 보내는 중이거나 안 갔어요면 null */
  readonly reviewId: string | null;
  /** 시트에서 세부까지 남겼는가 */
  readonly detailsSaved: boolean;
};

export type BandView =
  | { readonly kind: "hidden" }
  | {
      readonly kind: "ask" | "collapsed";
      readonly visit: MyVisit;
      /** 오늘 처음 묻는가. true면 물은 시각 기록과 feedback_prompt_shown을 한 번 */
      readonly isNewPrompt: boolean;
    }
  | {
      readonly kind: "thanks";
      readonly visit: MyVisit;
      readonly answer: BandAnswer;
      readonly reviewId: string | null;
      readonly detailsSaved: boolean;
    };

const requestedOn = (v: MyVisit) =>
  v.feedbackRequestedAt ? kstDateKey(new Date(v.feedbackRequestedAt)) : null;

/**
 * 오늘 길찾기를 눌렀는가: 이 탭의 기록 또는 오늘 방문 후보.
 * 출처 detail은 두 가지다. 상세에서 바로 쓴 후기의 방문(곧바로 visited)은 길찾기가 아니고,
 * 나 탭에서 연 상세의 길찾기(아직 candidate, 2026-11-01)는 길찾기다.
 */
export function directedToday(
  visits: readonly MyVisit[],
  now: Date,
  local: boolean,
): boolean {
  if (local) return true;
  const today = kstDateKey(now);
  return visits.some(
    (v) =>
      v.visitedOn === today &&
      (v.source !== "detail" || v.status === "candidate"),
  );
}

/** 서버가 고른 물을 방문 (feedbackBandAction target) */
export type BandTarget = { readonly visitId: string; readonly isNewPrompt: boolean };

export function bandView(input: {
  visits: readonly MyVisit[];
  target: BandTarget | null;
  now: Date;
  local: BandLocal | null;
  directedLocal: boolean;
}): BandView {
  const { visits, now, local } = input;
  if (local) {
    return {
      kind: "thanks",
      visit: local.visit,
      answer: local.answer,
      reviewId: local.reviewId,
      detailsSaved: local.detailsSaved,
    };
  }
  const target = input.target;
  const targetVisit = target
    ? visits.find((v) => v.id === target.visitId && v.status === "candidate")
    : undefined;
  if (target && targetVisit) {
    // feedback-target.ts feedbackBandMode와 같은 규칙(D-11 안건 2)
    return {
      kind: directedToday(visits, now, input.directedLocal) ? "collapsed" : "ask",
      visit: targetVisit,
      isNewPrompt: target.isNewPrompt,
    };
  }
  // 오늘 물은 방문에 이미 답했으면 고마움 줄을 그날 남긴다
  const today = kstDateKey(now);
  const answered = [...visits]
    .filter((v) => requestedOn(v) === today && v.status !== "candidate")
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  if (!answered) return { kind: "hidden" };
  if (answered.status === "not_visited") {
    return {
      kind: "thanks",
      visit: answered,
      answer: "not_visited",
      reviewId: null,
      detailsSaved: false,
    };
  }
  if (!answered.review) return { kind: "hidden" };
  return {
    kind: "thanks",
    visit: answered,
    answer: answered.review.rating,
    reviewId: answered.review.id,
    detailsSaved: false,
  };
}

/**
 * feedback_prompt_shown visit_source (PRD 10.2). 묻는 방문은 늘 candidate라 상세에서 바로 쓴 후기의 방문은 오지 않는다.
 * detail이 오면 나 탭에서 연 상세의 길찾기다(2026-11-01).
 */
export function promptSource(v: MyVisit): "rec" | "poll" | "map" | "detail" {
  return v.source;
}
