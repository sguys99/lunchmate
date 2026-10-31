// 다양성 제약 (T5.8, PRD 7장, AC-REC-3). 순수 함수.
// 뽑힌 카드 중 같은 카테고리는 최대 2장. 샘플링 전에 한 번 거르지 않고, 한 장 뽑을 때마다
// 이미 2장 뽑힌 카테고리를 남은 추첨 대상에서 뺀다(sample.ts가 매 추첨 전에 부른다).
// 남은 후보가 모두 이미 2장 찬 카테고리뿐이면(다양하게 만들 방법이 없으면) 카드를 비우는 대신 제약을 푼다.
import type { CategorySlug } from "@/features/place/categories";
import { MAX_PER_CATEGORY } from "./constants";

type HasCategory = { candidate: { category: CategorySlug } };

export function categoryCounts(
  picked: readonly HasCategory[],
): Map<CategorySlug, number> {
  const counts = new Map<CategorySlug, number>();
  for (const p of picked)
    counts.set(
      p.candidate.category,
      (counts.get(p.candidate.category) ?? 0) + 1,
    );
  return counts;
}

/**
 * 다음 추첨 대상. picked 기준으로 MAX_PER_CATEGORY에 닿은 카테고리를 뺀다.
 * 빼고 나서 아무것도 없으면 remaining을 그대로 돌려준다(제약 완화).
 */
export function diversityEligible<T extends HasCategory>(
  remaining: readonly T[],
  picked: readonly HasCategory[],
  maxPerCategory: number = MAX_PER_CATEGORY,
): readonly T[] {
  const counts = categoryCounts(picked);
  const eligible = remaining.filter(
    (r) => (counts.get(r.candidate.category) ?? 0) < maxPerCategory,
  );
  return eligible.length > 0 ? eligible : remaining;
}
