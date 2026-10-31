// 카테고리별 추정 가격과 "추정" 배지 (T5.13, PLACE-02, REC-06). 순수 함수.
// 가격 제보 중앙값이 있으면 그 값을, 없으면 카테고리 추정가를 쓰고 "추정"을 붙인다.
// 추정가는 2026년 서울 오피스 상권의 1인 한 끼 대략값이다(베타 제보가 쌓이면 다시 맞춘다).
// 바꾸면 src/lib/reco/version.ts ALGO_VERSION도 올린다(점수 B가 이 값을 쓴다).
import type { CategorySlug } from "./categories";
import type { Meal } from "@/lib/time";
import type { PlaceBadge } from "@/components/badges/pick-badges";

export const CATEGORY_PRICE_ESTIMATE = {
  hansik: { lunch: 10_000, dinner: 15_000 },
  jungsik: { lunch: 9_000, dinner: 15_000 },
  ilsik: { lunch: 13_000, dinner: 25_000 },
  yangsik: { lunch: 15_000, dinner: 25_000 },
  bunsik: { lunch: 7_000, dinner: 8_000 },
  gukbap: { lunch: 10_000, dinner: 12_000 },
  gogi: { lunch: 13_000, dinner: 25_000 },
  asian: { lunch: 12_000, dinner: 15_000 },
  fastfood: { lunch: 9_000, dinner: 10_000 },
  salad: { lunch: 11_000, dinner: 12_000 },
  cafe: { lunch: 8_000, dinner: 8_000 },
  pub: { lunch: 12_000, dinner: 25_000 },
} as const satisfies Record<CategorySlug, Record<Meal, number>>;

export type PriceReportSummary = { medianKRW: number; count: number } | null;

export type ResolvedPrice = {
  priceKRW: number;
  source: "report" | "estimate";
  /** 제보 수. 추정이면 0 */
  reportCount: number;
};

/** 표시와 점수에 쓸 1인 가격. 제보가 1건 이상이고 값이 올바르면 제보 중앙값, 아니면 카테고리 추정가 */
export function resolvePrice(
  report: PriceReportSummary,
  category: CategorySlug,
  meal: Meal,
): ResolvedPrice {
  if (
    report !== null &&
    report.count > 0 &&
    Number.isFinite(report.medianKRW) &&
    report.medianKRW > 0
  ) {
    return {
      priceKRW: report.medianKRW,
      source: "report",
      reportCount: report.count,
    };
  }
  return {
    priceKRW: CATEGORY_PRICE_ESTIMATE[category][meal],
    source: "estimate",
    reportCount: 0,
  };
}

/** 가격 옆 "추정" 표시가 필요한가 (pick-badges의 INLINE 배지 estimate) */
export function priceBadge(price: ResolvedPrice): PlaceBadge | null {
  return price.source === "estimate" ? { kind: "estimate" } : null;
}
