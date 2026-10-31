// 식후 피드백 대상 고르기 (T6.8, FB-01, FB-04, FB-05, HIS-01, D-11, D-12 안건 3). 순수 함수, React와 네트워크 의존 없음.
//
// 규칙
// - 묻는 방문: 아직 답하지 않은 방문 후보(status candidate) 중 오늘(KST) 이전 방문이고,
//   방문 시각(created_at)부터 영업일 기준 48시간이 지나지 않은 것(주말, 공휴일은 세지 않는다: 금요일 방문은 월요일에도,
//   주말 방문은 다음 평일에도 묻는다). 여러 곳이면 가장 최근 방문 하나.
// - 하루 한 번(FB-04): 오늘 이미 물은 방문(feedback_requested_at이 오늘)이 아직 답이 없으면 그 방문을 그대로 다시 보인다
//   (띠는 그날 그대로 남는다, D-11 안건 2). 새로 묻는 것(isNewPrompt)이 아니므로 물은 시각 기록, feedback_prompt_shown을 다시 보내지 않는다.
//   오늘 물은 방문에 이미 답했으면 그날은 다른 방문을 묻지 않는다.
// - 나 탭 늦은 답(canAnswerLate): 방문일(KST) 포함 14일 뒤까지. DB reviews_before_insert와 같은 경계.
// 바렐(@/lib/time) 대신 파일을 직접 가져온다: 홈 첫 로드에 들어가는 바렐 모듈에 공휴일 판정이 끌려 들어가지 않게(bundle-log 2026-11-01)
import { FEEDBACK_WINDOW_MS, LATE_ANSWER_DAYS } from "@/lib/time/constants";
import { dateKeyDiff, isWithinBusinessWindow } from "@/lib/time/holidays";
import { kstDateKey } from "@/lib/time/kst";
import type { Meal } from "@/lib/time/meal";

export type VisitStatus = "candidate" | "visited" | "not_visited";
export type VisitSource = "rec" | "poll" | "map" | "detail";

/** 화면이 쓰는 방문 한 줄(visits + 내 후기 요약). 카카오 값은 place_id, place_url만 */
export type MyVisit = {
  readonly id: string;
  readonly placeId: string;
  readonly placeUrl: string | null;
  readonly meal: Meal;
  readonly source: VisitSource;
  /** KST 방문일 YYYY-MM-DD */
  readonly visitedOn: string;
  /** 방문 후보가 생긴 순간(ISO) */
  readonly createdAt: string;
  readonly status: VisitStatus;
  /** 홈 띠가 처음 물은 순간(ISO). 서버가 한 번만 기록한다 */
  readonly feedbackRequestedAt: string | null;
  /** 내 후기 요약. 없으면 null */
  readonly review: {
    readonly id: string;
    readonly rating: "up" | "down";
  } | null;
};

type TargetFields = Pick<
  MyVisit,
  "status" | "visitedOn" | "createdAt" | "feedbackRequestedAt"
>;

export type FeedbackTarget<V extends TargetFields = MyVisit> = {
  readonly visit: V;
  /** 오늘 처음 묻는가. true면 물은 시각을 기록하고 feedback_prompt_shown을 한 번 보낸다 */
  readonly isNewPrompt: boolean;
};

const requestedToday = (v: TargetFields, todayKey: string) =>
  v.feedbackRequestedAt !== null &&
  kstDateKey(new Date(v.feedbackRequestedAt)) === todayKey;

/** 오늘(KST) 홈 띠가 이미 어떤 방문이든 물었는가 */
export function wasPromptedToday(
  visits: readonly TargetFields[],
  now: Date,
): boolean {
  const today = kstDateKey(now);
  return visits.some((v) => requestedToday(v, today));
}

/** 홈 띠가 물을 수 있는 방문인가(오늘 이전, 답 없음, 영업일 48시간 안) */
export function isAskableVisit(v: TargetFields, now: Date): boolean {
  if (v.status !== "candidate") return false;
  if (!(dateKeyDiff(v.visitedOn, kstDateKey(now)) >= 1)) return false;
  const at = new Date(v.createdAt);
  if (Number.isNaN(at.getTime())) return false;
  return isWithinBusinessWindow(at, FEEDBACK_WINDOW_MS, now);
}

/**
 * 홈 띠가 물을 방문. 없으면 null.
 * alreadyPromptedToday를 넘기지 않으면 visits의 feedback_requested_at으로 판정한다.
 */
export function pickFeedbackTarget<V extends TargetFields>(
  visits: readonly V[],
  now: Date,
  alreadyPromptedToday: boolean = wasPromptedToday(visits, now),
): FeedbackTarget<V> | null {
  const today = kstDateKey(now);
  const byRecent = [...visits].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
  const repeat = byRecent.find(
    (v) => v.status === "candidate" && requestedToday(v, today),
  );
  if (repeat) return { visit: repeat, isNewPrompt: false };
  if (alreadyPromptedToday) return null;
  const next = byRecent.find((v) => isAskableVisit(v, now));
  return next ? { visit: next, isNewPrompt: true } : null;
}

/** 나 탭에서 답할 수 있는가: 답 없는 방문, 방문일 포함 14일 안 (HIS-01, D-12 안건 3) */
export function canAnswerLate(
  visit: Pick<MyVisit, "status" | "visitedOn">,
  now: Date,
): boolean {
  if (visit.status !== "candidate") return false;
  const days = dateKeyDiff(visit.visitedOn, kstDateKey(now));
  return days >= 0 && days <= LATE_ANSWER_DAYS;
}

/** 후기(세부 입력 포함)를 새로 쓸 수 있는가: 방문일 포함 14일 안. 상태는 보지 않는다(안 갔어요 뒤에도 쓰면 다녀옴) */
export function canWriteReviewFor(
  visit: Pick<MyVisit, "visitedOn" | "review">,
  now: Date,
): boolean {
  if (visit.review) return false;
  const days = dateKeyDiff(visit.visitedOn, kstDateKey(now));
  return days >= 0 && days <= LATE_ANSWER_DAYS;
}

export type FeedbackBandMode = "hidden" | "ask" | "collapsed" | "thanks";

/**
 * 홈 띠 모양 (D-11 안건 2). 답하면 고마움 줄, 답하지 않고 오늘 길찾기를 누르면 접힌 한 줄, 그 밖에는 묻는 띠.
 * 접힌 줄과 고마움 줄도 그날만이다(다음 날은 pickFeedbackTarget이 다시 정한다).
 */
export function feedbackBandMode(input: {
  hasTarget: boolean;
  answered: boolean;
  directionsClickedToday: boolean;
}): FeedbackBandMode {
  if (input.answered) return "thanks";
  if (!input.hasTarget) return "hidden";
  return input.directionsClickedToday ? "collapsed" : "ask";
}
