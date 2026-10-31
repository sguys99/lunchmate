// 하드 필터 (T5.6, PRD 7장, AC-REC-1). 순수 함수.
// 순서: 기피 음식 → 다시 안 갈 곳 → 폐업 제보 누적 → 예산 초과(제보 가격이 있을 때만).
// 한 곳은 처음 걸린 규칙 하나에만 센다(REC-09 완화 제안 "예산 조건을 풀면 4곳이 더 있습니다"에 쓰는 수).
import { matchesAvoid } from "./avoid-match";
import type {
  Candidate,
  FilterCounts,
  RecoHistory,
  RecoSettings,
} from "./types";

/** 서로 다른 사용자의 "문 닫았어요" 제보가 이 수 이상이면 뺀다 */
export const CLOSED_REPORT_THRESHOLD = 3;

export type FilterReason = keyof FilterCounts;

/** 걸린 첫 규칙. 통과하면 null */
export function hardFilterReason(
  c: Candidate,
  settings: Pick<RecoSettings, "avoid" | "budgetKRW">,
  history: Pick<RecoHistory, "blocked">,
): FilterReason | null {
  if (matchesAvoid(c, settings.avoid)) return "avoid";
  if (history.blocked.has(c.id)) return "blocked";
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

export function applyHardFilters(
  candidates: readonly Candidate[],
  settings: Pick<RecoSettings, "avoid" | "budgetKRW">,
  history: Pick<RecoHistory, "blocked">,
): HardFilterResult {
  const filtered: FilterCounts = {
    avoid: 0,
    blocked: 0,
    closed: 0,
    overBudget: 0,
  };
  const kept: Candidate[] = [];
  for (const c of candidates) {
    const reason = hardFilterReason(c, settings, history);
    if (reason === null) kept.push(c);
    else filtered[reason] += 1;
  }
  return { kept, filtered };
}
