// 추천 엔진 테스트용 후보, 설정 만들기 (테스트에서만 import).
import type { CategorySlug } from "@/features/place/categories";
import type { Candidate, RecoHistory, RecoInput, RecoSettings } from "./types";

export function makeCandidate(
  id: string,
  over: Partial<Candidate> & { category?: CategorySlug } = {},
): Candidate {
  return {
    id,
    name: `식당 ${id}`,
    category: "hansik",
    categoryText: "한식",
    distanceM: 300,
    priceReport: null,
    thumbs: { up: 0, down: 0 },
    closedReports: 0,
    waiting: null,
    deal: null,
    ...over,
  };
}

export const BASE_SETTINGS: RecoSettings = {
  meal: "lunch",
  budgetKRW: 12_000,
  walkMinutes: 10,
  avoid: [],
  craving: { categories: [], until: null },
};

export const EMPTY_HISTORY: RecoHistory = { visits: [], blocked: new Set() };

/** KST 2026-10-30(금) 12:00 = UTC 03:00. 점심 피크 안 */
export const NOW = new Date("2026-10-30T03:00:00Z");

export function makeInput(over: Partial<RecoInput> = {}): RecoInput {
  return {
    candidates: [],
    settings: BASE_SETTINGS,
    history: EMPTY_HISTORY,
    seen: new Set(),
    now: NOW,
    ...over,
  };
}

const SLUGS: readonly CategorySlug[] = [
  "hansik",
  "jungsik",
  "ilsik",
  "yangsik",
  "bunsik",
  "gukbap",
  "gogi",
  "asian",
  "fastfood",
  "salad",
  "cafe",
  "pub",
];

/** n곳, 카테고리를 돌려 가며 배정 */
export function manyCandidates(
  n: number,
  categories: readonly CategorySlug[] = SLUGS,
): Candidate[] {
  return Array.from({ length: n }, (_, i) =>
    makeCandidate(`p${i}`, {
      category: categories[i % categories.length]!,
      distanceM: 100 + ((i * 37) % 400),
    }),
  );
}
