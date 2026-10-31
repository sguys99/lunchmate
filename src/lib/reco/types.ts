// 추천 엔진 입력과 출력 타입 (T5.4, PRD 7장, REC-03).
// - 엔진 고유 타입이다. 카카오 응답 모양에 기대지 않는다. 카카오 응답을 Candidate로 바꾸는 일은
//   데이터 연결 작업(T5.12 이후)이 맡는다.
// - Candidate의 장소 값(name, categoryText, distanceM)은 카카오 응답에서 세션 메모리로 만든 값이다.
//   저장하지 않는다(CLAUDE.md 7장). 나머지(가격, 후기, 폐업, 웨이팅, 할인)는 place_id에 붙은 우리 DB 집계다.
// - React, 네트워크 의존 없음.
import type { CategorySlug } from "@/features/place/categories";
import type { Meal } from "@/lib/time";

/** [0, 1) 균등 난수. pick-one.ts의 Rng와 같은 계약 */
export type { Rng } from "./pick-one";

/** PLACE-07 웨이팅 3단계 (badges의 WaitingLevel과 같은 이름) */
export type WaitLevel = "walkIn" | "short" | "long";

/** 추천 후보 한 곳. id는 카카오 place_id */
export type Candidate = {
  id: string;
  name: string;
  /** 12종 카테고리 (카카오 업종 문자열에서 변환한 값) */
  category: CategorySlug;
  /**
   * 업종 설명 원문(예: "한식 > 해물,생선 > 회"). 기피 음식 판정에만 쓴다. 세션 메모리 값, 저장 금지.
   * 모르면 빈 문자열.
   */
  categoryText: string;
  /** 기준 위치에서의 직선거리(m) */
  distanceM: number;
  /** 가격 제보 집계. 제보가 없으면 null (그때는 카테고리 추정가, T5.13) */
  priceReport: { medianKRW: number; count: number } | null;
  /** 후기 👍, 👎 수 (공개, 비공개 모두 익명 집계, AC-FB-2) */
  thumbs: { up: number; down: number };
  /** "문 닫았어요" 제보 수 (서로 다른 사용자) */
  closedReports: number;
  /** 아직 유효할 수 있는 최근 웨이팅 제보. 없으면 null. 30분 유효 판정은 엔진이 한다 */
  waiting: { level: WaitLevel; reportedAt: Date } | null;
  /**
   * 할인 정보 유무. 표시용 값이며 점수와 이유에 절대 쓰지 않는다(제품 원칙 6, AC-DEAL-2).
   * 엔진이 이 필드를 받아도 무시한다는 것을 테스트로 묶어 둔다(T5.11).
   */
  deal?: { active: boolean } | null;
};

/** avoid_rules.kind (T4.4 마이그레이션): food 칩, allergy 칩, custom 직접 입력 */
export type AvoidRule = { kind: "food" | "allergy" | "custom"; value: string };

/** 추천 계산에 쓰는 사용자 설정 */
export type RecoSettings = {
  meal: Meal;
  /** 이번 끼니 예산(원). 점심이면 lunch_budget, 저녁이면 dinner_budget */
  budgetKRW: number;
  /** 허용 도보 분 (5, 10, 15, 20) */
  walkMinutes: number;
  avoid: readonly AvoidRule[];
  /** 요즘 이게 땡겨요 (SET-05). until이 지났으면 엔진이 무시한다 */
  craving: { categories: readonly CategorySlug[]; until: Date | null };
};

/** 피드백 값. "안 갔어요"는 부정 신호가 아니다(FB-05) */
export type Rating = "up" | "down";

/**
 * 방문 기록 한 건. visits와 후기(reviews)의 내 행을 합친 값.
 * - status candidate: 길찾기만 누름(갔을 가능성이 높아 반복 패널티에는 넣는다)
 * - status visited: 갔다고 답함
 * - status skipped: 안 갔어요(반복 패널티에도 선호에도 쓰지 않는다)
 */
export type Visit = {
  placeId: string;
  category: CategorySlug;
  at: Date;
  status: "candidate" | "visited" | "skipped";
  rating: Rating | null;
};

/** 사용자의 기록 신호 */
export type RecoHistory = {
  visits: readonly Visit[];
  /** 다시 안 갈래요 (blocklist의 place_id) */
  blocked: ReadonlySet<string>;
};

/** 엔진 입력 전체 */
export type RecoInput = {
  candidates: readonly Candidate[];
  settings: RecoSettings;
  history: RecoHistory;
  /** 이번 세션에 이미 보여 준 place_id (다시 뽑기, REC-05) */
  seen: ReadonlySet<string>;
  now: Date;
};

/** 점수 요소. 모두 0~1 */
export type ScoreFactors = {
  /** 거리. 가까울수록 1 */
  D: number;
  /** 선호. 중립 0.5 (콜드 스타트) */
  P: number;
  /** 예산 적합도 */
  B: number;
  /** 평판. 후기 3건 미만이면 중립 0.5 */
  C: number;
  /** 반복 패널티. 클수록 감점 */
  R: number;
  /** 웨이팅 패널티(PLACE-08). 점심 피크에 유효한 "줄 길어요"만 1 */
  W: number;
};

/** 이유 문장을 만들 때 쓰는 근거. 점수 계산 중에 함께 모은다 */
export type ScoreEvidence = {
  walkMinutes: number;
  price: { priceKRW: number; source: "report" | "estimate" };
  /** 이 식당에 남긴 가장 최근 👍의 시각 */
  lastUpAt: Date | null;
  /** 같은 카테고리에 👍가 있었는가(이 식당 제외) */
  categoryLiked: boolean;
  craving: boolean;
  /** 후기 3건 이상일 때만 👍 비율(0~100), 아니면 null */
  thumbsUpPercent: number | null;
  /** 이 식당에 간 적이 있는가(skipped 제외) */
  everVisited: boolean;
  /** 반복 창 안에 같은 카테고리를 먹었는가 */
  categoryRecent: boolean;
  /** 사용자에게 반복 창 안 방문 기록이 하나라도 있는가 */
  hasRecentHistory: boolean;
};

export type ScoredCandidate = {
  candidate: Candidate;
  score: number;
  factors: ScoreFactors;
  evidence: ScoreEvidence;
};

/** 이유 문장 조각의 종류 (REC-07 펼치기에서 다시 쓸 수 있게 결과에 남긴다) */
export type ReasonKind =
  | "distance"
  | "likedPlace"
  | "craving"
  | "likedCategory"
  | "budget"
  | "reputation"
  | "novelty"
  | "newPlace";

export type RecoPick = ScoredCandidate & {
  /** 카드 이유 1줄 (명사형, 쉼표 구분) */
  reason: string;
  reasonKinds: readonly ReasonKind[];
};

/** 하드 필터로 빠진 수 (REC-09 완화 제안용). 한 곳은 처음 걸린 규칙 하나에만 센다 */
export type FilterCounts = {
  avoid: number;
  blocked: number;
  closed: number;
  overBudget: number;
};

export type RecoResult = {
  algoVersion: string;
  /** 0~3장. 3장 미만이면 후보 부족(REC-09) */
  picks: readonly RecoPick[];
  filtered: FilterCounts;
  /** 하드 필터를 통과한 수 */
  eligibleCount: number;
  /** 세션 제외를 뺀 뒤 남은 수 (0이면 다시 뽑기 소진) */
  unseenCount: number;
};
