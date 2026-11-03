// 하드 필터 (T5.6, PRD 7장, AC-REC-1). 순수 함수.
// 순서: 기피 음식 → 다시 안 갈 곳 → 끼니에 안 맞는 카테고리(T9.16, 점심 술집) → 폐업 제보 누적 → 예산 초과(제보 가격이 있을 때만).
// 한 곳은 처음 걸린 규칙 하나에만 센다(REC-09 완화 제안 "예산 조건을 풀면 4곳이 더 있습니다"에 쓰는 수).
import { matchesAvoid } from "./avoid-match";
import { MEAL_EXCLUDED_CATEGORIES } from "./constants";
import { activeCravings } from "./score";
import type {
  Candidate,
  FilterCounts,
  RecoHistory,
  RecoSettings,
} from "./types";

/** 서로 다른 사용자의 "문 닫았어요" 제보가 이 수 이상이면 뺀다 */
export const CLOSED_REPORT_THRESHOLD = 3;

export type FilterReason = keyof FilterCounts;

/** 사용자 본인 기준으로 늘 빼는 규칙(기피 음식, 다시 안 갈 곳). 추천과 지도 탭이 함께 쓴다 */
export type PersonalFilterReason = Extract<FilterReason, "avoid" | "blocked">;

/**
 * 기피 음식 → 다시 안 갈 곳만 본다. 통과하면 null.
 * 지도 탭(탐색)은 이것만 적용하고 폐업, 예산 초과는 적용하지 않는다(2026-10-31 사용자 결정).
 */
export function personalFilterReason(
  c: Pick<Candidate, "id" | "name" | "categoryText" | "category">,
  avoid: RecoSettings["avoid"],
  blocked: RecoHistory["blocked"],
): PersonalFilterReason | null {
  if (matchesAvoid(c, avoid)) return "avoid";
  if (blocked.has(c.id)) return "blocked";
  return null;
}

/**
 * 이 끼니에 빼는 카테고리인가(T9.16). 요즘 땡겨요로 고른 카테고리는 빼지 않는다.
 * 사용자가 끼니를 저녁으로 바꾸면(수동 토글) 그 기준을 따른다.
 */
export function isOffMeal(
  c: Pick<Candidate, "category">,
  meal: RecoSettings["meal"],
  cravings: ReadonlySet<string>,
): boolean {
  const excluded: readonly string[] = MEAL_EXCLUDED_CATEGORIES[meal];
  return excluded.includes(c.category) && !cravings.has(c.category);
}

/**
 * 걸린 첫 규칙. 통과하면 null.
 * mealCheck를 넘기지 않으면 끼니 규칙을 건너뛴다(회식 모드는 술집이 후보라 쓰지 않는다, party/rank.ts).
 */
export function hardFilterReason(
  c: Candidate,
  settings: Pick<RecoSettings, "avoid" | "budgetKRW">,
  history: Pick<RecoHistory, "blocked">,
  mealCheck?: { meal: RecoSettings["meal"]; cravings: ReadonlySet<string> },
): FilterReason | null {
  const personal = personalFilterReason(c, settings.avoid, history.blocked);
  if (personal !== null) return personal;
  if (mealCheck && isOffMeal(c, mealCheck.meal, mealCheck.cravings))
    return "offMeal";
  if (c.closedReports >= CLOSED_REPORT_THRESHOLD) return "closed";
  // 예산 초과는 실제 제보 가격이 있을 때만. 카테고리 추정가로는 빼지 않는다(점수 B에서만 반영)
  if (
    c.priceReport !== null &&
    c.priceReport.count > 0 &&
    c.priceReport.medianKRW > settings.budgetKRW
  ) {
    return "overBudget";
  }
  return null;
}

export type HardFilterResult = {
  kept: Candidate[];
  filtered: FilterCounts;
};

/** 오늘 추천의 하드 필터. 끼니 규칙까지 적용한다(요즘 땡겨요 유효 판정에 now가 필요하다) */
export function applyHardFilters(
  candidates: readonly Candidate[],
  settings: Pick<RecoSettings, "avoid" | "budgetKRW" | "meal" | "craving">,
  history: Pick<RecoHistory, "blocked">,
  now: Date,
): HardFilterResult {
  const filtered: FilterCounts = {
    avoid: 0,
    blocked: 0,
    offMeal: 0,
    closed: 0,
    overBudget: 0,
  };
  const mealCheck = {
    meal: settings.meal,
    cravings: activeCravings(settings, now),
  };
  const kept: Candidate[] = [];
  for (const c of candidates) {
    const reason = hardFilterReason(c, settings, history, mealCheck);
    if (reason === null) kept.push(c);
    else filtered[reason] += 1;
  }
  return { kept, filtered };
}
