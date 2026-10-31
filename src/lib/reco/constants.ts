// 추천 점수 가중치와 상수 (T5.7, PRD 7장). 값을 바꾸면 version.ts ALGO_VERSION을 올린다.
//
// S = w_d·D + w_p·P + w_b·B + w_c·C − w_r·R − w_w·W
//   D 거리, P 선호(👍👎, 요즘 땡겨요), B 예산 적합도, C 평판, R 반복 패널티, W 웨이팅 패널티(PLACE-08)
// 양의 가중치 합이 1이라 S는 대략 −0.8~1 사이다. 할인 정보는 어떤 항에도 들어가지 않는다(AC-DEAL-2).

export const WEIGHTS = {
  d: 0.3,
  p: 0.3,
  b: 0.15,
  c: 0.25,
  r: 0.5,
  w: 0.3,
} as const;

/** 콜드 스타트 중립값. 피드백 0건이면 P, 후기 3건 미만이면 C */
export const NEUTRAL = 0.5;

/* 선호 P ------------------------------------------------------------ */

/** 피드백 반감기(일). 최근 피드백일수록 크게 반영(basic-plan 7장 지수 감쇠) */
export const FEEDBACK_HALF_LIFE_DAYS = 14;
/** 이 식당에 남긴 👍👎이 P를 움직이는 최대 폭 */
export const PLACE_PREF_SCALE = 0.35;
/** 같은 카테고리 다른 식당의 👍👎이 P를 움직이는 최대 폭 */
export const CATEGORY_PREF_SCALE = 0.15;
/** 요즘 이게 땡겨요(SET-05) 카테고리면 P에 더한다(7일 동안) */
export const CRAVING_BOOST = 0.25;

/* 예산 B ------------------------------------------------------------ */

/** 예산을 넘은 비율 × 이 값만큼 B가 깎인다. 2면 50% 넘을 때 0 */
export const BUDGET_OVER_SLOPE = 2;
/** 추정 가격이면 B를 중립 쪽으로 이 비율만 반영(확신이 낮음) */
export const ESTIMATE_BUDGET_CONFIDENCE = 0.5;

/* 평판 C ------------------------------------------------------------ */

/** 후기가 이 수 미만이면 C 중립 */
export const MIN_REVIEWS_FOR_REPUTATION = 3;
/** 👍 비율을 중립 쪽으로 당기는 가상 후기 수(후기 수 보정) */
export const REPUTATION_PRIOR_COUNT = 3;

/* 반복 R ------------------------------------------------------------ */

/** 반복 창: 오늘을 포함한 최근 3일(KST 달력 날짜, 오늘과 1, 2일 전) */
export const REPEAT_WINDOW_DAYS = 3;
/** 창 안에 이 식당을 갔으면 강한 감점 */
export const PLACE_REPEAT_PENALTY = 1;
/** 창 안에 같은 카테고리를 먹은 횟수마다 약한 감점 */
export const CATEGORY_REPEAT_STEP = 0.25;
export const CATEGORY_REPEAT_MAX = 0.5;

/* 샘플링 ------------------------------------------------------------ */

/** 추첨 대상: 남은 후보 중 점수 상위 몇 곳 */
export const SAMPLE_TOP_N = 10;
/** 카드 수 */
export const PICK_COUNT = 3;
/** 같은 카테고리 최대 장수(AC-REC-3) */
export const MAX_PER_CATEGORY = 2;
/** 추첨 무게 = max(S, 0) + 이 값. 점수가 0 이하인 곳도 상위 10곳 안이면 아주 작은 확률은 남긴다 */
export const SAMPLE_WEIGHT_FLOOR = 0.05;
