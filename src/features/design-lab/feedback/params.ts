// 식후 피드백 시안 쿼리 (T6.1): /design-lab/feedback/<a|b|c>?...
//   state=ready|loading|empty|error|offline  4상태 (pnpm shots --states 규약)
//     loading  띠(어제 식사)와 추천을 불러오는 중
//     empty    물을 식사가 없는 날(FB-04, 띠 없음). view=detail이면 후기 0건인 식당
//     error    답을 보내지 못함(답은 화면에 남고 다시 보내기). fail=name이면 대신 이름 해석 실패(T5.12a)
//     offline  홈은 띠를 숨긴다(D1). view=detail이면 후기 쓰기를 끈다
//   fail=save|name    state=error일 때 오류 종류
//   view=home|detail  home: 홈 첫 화면의 띠와 선택 입력(FB-01, 02), detail: 식당 상세의 후기(FB-06, 07, MOD-01)
//   flow=ask|thanks|compose|saved|later  캡처용 시작 단계
//     ask      띠가 묻는 중(기본)       thanks  한 탭 뒤 고마움 줄
//     compose  선택 입력을 연 상태       saved   선택 입력까지 마친 뒤
//     later    묻는 띠를 무시하거나 미룬 뒤(D-05 열린 안건, 안마다 답이 다름)
//     view=detail에서는 compose(후기 쓰기), edit(내 후기 수정), delete(삭제 확인)
//   answer=up|down|skipped  thanks, compose의 한 탭 답(기본 up)
//   step=1|2|3        C안 단계(compose일 때)
//   mine=on           view=detail에서 내 후기가 이미 있는 식당
import { parseDesignState, type DesignState } from "@/features/design-lab/mock";

export const FEEDBACK_FLOWS = [
  "ask",
  "thanks",
  "compose",
  "saved",
  "later",
  "edit",
  "delete",
] as const;
export type FeedbackFlow = (typeof FEEDBACK_FLOWS)[number];

export type FeedbackAnswer = "up" | "down" | "skipped";

export type FeedbackParams = {
  state: DesignState;
  fail: "save" | "name";
  view: "home" | "detail";
  flow: FeedbackFlow;
  answer: FeedbackAnswer;
  step: 1 | 2 | 3;
  mine: boolean;
};

type Raw = Readonly<Record<string, string | readonly string[] | undefined>>;

function first(raw: Raw, key: string): string | undefined {
  const v = raw[key];
  const s = typeof v === "string" ? v : v?.[0];
  return s?.trim().toLowerCase();
}

function oneOf<T extends string>(
  options: readonly T[],
  value: string | undefined,
  fallback: T,
): T {
  return value !== undefined && (options as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function parseFeedbackParams(raw: Raw): FeedbackParams {
  const step = Number(first(raw, "step"));
  return {
    state: parseDesignState(raw),
    fail: first(raw, "fail") === "name" ? "name" : "save",
    view: first(raw, "view") === "detail" ? "detail" : "home",
    flow: oneOf(FEEDBACK_FLOWS, first(raw, "flow"), "ask"),
    answer: oneOf(["up", "down", "skipped"], first(raw, "answer"), "up"),
    step: step === 2 || step === 3 ? step : 1,
    mine: first(raw, "mine") === "on",
  };
}

/** 이름 해석 실패 화면인가 (?state=error&fail=name) */
export function isNameFail(p: FeedbackParams): boolean {
  return p.state === "error" && p.fail === "name";
}
