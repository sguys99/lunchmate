// 식당 상세 데이터 모양과 숫자 계산 (T5.33, T5.34, PLACE-01~03, PLACE-06, PLACE-07, DEAL-02). 순수 함수, React 의존 없음.
//
// 두 출처를 나눠 받는다.
// - PlaceDetailPlace: 카카오에서 온 화면용 값(이름, 주소, 전화, 좌표, 카테고리)과 추천이 만든 값(도보 분, 이유).
//   세션 메모리 값을 props로만 받는다. 저장, 로그, 분석 이벤트에 넣지 않는다(CLAUDE.md 7장).
// - PlaceDetailStats: place_id에 붙은 우리 DB 집계(가격 제보, 👍 수, 태그, 공개 후기, 웨이팅, 할인, 내 방문).
//   6단계 집계 함수가 채운다. 그 전에는 EMPTY_PLACE_STATS(빈 상태)를 넘긴다. 비공개 후기 텍스트는 들어오지 않는다(AC-FB-2).
//
// 규칙 (D-10, 2026-10-31)
// - 가격 대표값: 제보 중앙값, 없으면 카테고리 추정가 + "추정"(price-estimate.ts).
// - 가격 범위: 제보 5건 이상이면 사분위(가운데 절반), 2~4건이면 최소~최대, 1건 이하면 범위 없음.
// - 👍 비율: 후기 3건 미만이면 숨김(PRD 7장 콜드 스타트와 같은 기준). 10칸 미터는 한 칸 10%.
import type { WaitingLevel } from "@/components/badges/pick-badges";
import { thumbsUpPercent } from "@/lib/format";
import type { LatLng } from "@/lib/map/types";
import type { Meal } from "@/lib/time";
import type { CategorySlug } from "./categories";
import { resolvePrice } from "./price-estimate";

/** 화면용 장소 값. name이 null이면 이름 해석 실패(T5.12a 3단계): 좌표, 주소, 전화도 없다 */
export type PlaceDetailPlace = {
  /** 카카오 place_id (숫자 문자열) */
  readonly id: string;
  /** 카카오맵 상세 링크. 저장 가능한 값 */
  readonly placeUrl: string;
  readonly category: CategorySlug;
  readonly name: string | null;
  readonly address?: string | null;
  readonly phone?: string | null;
  readonly position?: LatLng | null;
  /** 기준점에서 도보 분. 모르면 null */
  readonly walkMinutes: number | null;
  /** 추천 이유 한 줄(REC-07). 추천에서 연 상세만 있다. 도보 조각은 상세가 뺀다 */
  readonly reason?: string | null;
};

export type PlaceReview = {
  readonly id: string;
  /** 공개 프로필 닉네임 (PRD 11.2) */
  readonly nickname: string;
  /** 방문 월(1~12)만 (PRD 11.2) */
  readonly visitMonth: number;
  readonly thumb: "up" | "down";
  readonly text: string;
};

export type PlaceDetailStats = {
  /** 가격 제보 값(원, 익명). 점 분포와 범위에 쓴다 */
  readonly priceReports: readonly number[];
  readonly thumbs: { readonly up: number; readonly down: number };
  /** 태그 빈도 상위 5개, 많은 순 */
  readonly tags: readonly { readonly label: string; readonly count: number }[];
  /** 공개 후기 최신순 앞 몇 건. null이면 불러오지 못함(오프라인) */
  readonly reviews: readonly PlaceReview[] | null;
  readonly reviewTotal: number;
  /** 30분 안의 최근 웨이팅 제보 (PLACE-07) */
  readonly waiting: {
    readonly level: WaitingLevel;
    readonly minutesAgo: number;
  } | null;
  /** 할인 제보 (DEAL-02). 표시만, 추천 점수 반영 0 */
  readonly deal: {
    readonly title: string;
    readonly daysAgo: number;
    /** "11월 5일" 같은 표시 문자열. 없으면 종료일 미정 */
    readonly untilLabel: string | null;
  } | null;
  /** 내 최근 방문 (PLACE-06) */
  readonly myVisit: {
    readonly dateLabel: string;
    readonly rating: "up" | "down" | null;
  } | null;
};

/** 6단계 집계 전, 또는 집계가 아직 없는 식당 */
export const EMPTY_PLACE_STATS: PlaceDetailStats = {
  priceReports: [],
  thumbs: { up: 0, down: 0 },
  tags: [],
  reviews: [],
  reviewTotal: 0,
  waiting: null,
  deal: null,
  myVisit: null,
};

/* ---------- 가격 ---------- */

/** 사분위로 범위를 줄이는 최소 제보 수 (D-10 안건 5) */
export const PRICE_QUARTILE_MIN_REPORTS = 5;
/** 범위를 보이는 최소 제보 수 */
export const PRICE_RANGE_MIN_REPORTS = 2;

function validPrices(values: readonly number[]): number[] {
  return values
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);
}

/** 정렬된 값의 p 분위(0~1), 선형 보간(R type 7) */
export function quantile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) throw new RangeError("빈 배열의 분위수는 없습니다");
  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  const a = sorted[lo] ?? 0;
  const b = sorted[hi] ?? a;
  return a + (b - a) * (h - lo);
}

/** 중앙값을 100원 단위로. 빈 배열이면 null */
export function medianPrice(values: readonly number[]): number | null {
  const sorted = validPrices(values);
  if (sorted.length === 0) return null;
  return roundWon(quantile(sorted, 0.5));
}

function roundWon(v: number): number {
  return Math.round(v / 100) * 100;
}

export type PriceRange = {
  readonly low: number;
  readonly high: number;
  /** quartile: 가운데 절반(25~75%), minmax: 최소~최대 */
  readonly kind: "quartile" | "minmax";
};

/** 가격 범위 (D-10 안건 5). 제보 2건 미만이거나 범위가 한 점이면 null */
export function priceRange(values: readonly number[]): PriceRange | null {
  const sorted = validPrices(values);
  if (sorted.length < PRICE_RANGE_MIN_REPORTS) return null;
  const range: PriceRange =
    sorted.length >= PRICE_QUARTILE_MIN_REPORTS
      ? {
          low: roundWon(quantile(sorted, 0.25)),
          high: roundWon(quantile(sorted, 0.75)),
          kind: "quartile",
        }
      : {
          low: sorted[0] ?? 0,
          high: sorted[sorted.length - 1] ?? 0,
          kind: "minmax",
        };
  return range.high > range.low ? range : null;
}

export type DetailPrice = {
  /** 대표값(원): 제보 중앙값 또는 추정가 */
  readonly value: number;
  readonly estimate: boolean;
  readonly reportCount: number;
  readonly range: PriceRange | null;
  /** 정렬된 제보 값 (점 분포) */
  readonly reports: readonly number[];
  /** 대표값이 예산 이하인가 */
  readonly withinBudget: boolean;
};

export function detailPrice(
  stats: Pick<PlaceDetailStats, "priceReports">,
  category: CategorySlug,
  meal: Meal,
  budgetKRW: number,
): DetailPrice {
  const reports = validPrices(stats.priceReports);
  const median = medianPrice(reports);
  const resolved = resolvePrice(
    median === null ? null : { medianKRW: median, count: reports.length },
    category,
    meal,
  );
  return {
    value: resolved.priceKRW,
    estimate: resolved.source === "estimate",
    reportCount: resolved.reportCount,
    range: priceRange(reports),
    reports,
    withinBudget: resolved.priceKRW <= budgetKRW,
  };
}

/* ---------- 👍 ---------- */

/** 비율을 보이는 최소 후기 수 (D-10 안건 4, PRD 7장) */
export const THUMBS_MIN_SAMPLE = 3;
export const THUMBS_METER_CELLS = 10;

export type DetailThumbs = {
  readonly up: number;
  readonly down: number;
  readonly total: number;
  /** 표본이 3건 미만이면 null */
  readonly percent: number | null;
  /** 10칸 미터에서 채울 칸 수(0~10). 비율이 없으면 0 */
  readonly filledCells: number;
};

export function detailThumbs(thumbs: PlaceDetailStats["thumbs"]): DetailThumbs {
  const up = Math.max(0, Math.floor(thumbs.up));
  const down = Math.max(0, Math.floor(thumbs.down));
  const total = up + down;
  const percent =
    total >= THUMBS_MIN_SAMPLE ? thumbsUpPercent(up, total) : null;
  return {
    up,
    down,
    total,
    percent,
    filledCells:
      percent === null
        ? 0
        : Math.min(
            THUMBS_METER_CELLS,
            Math.round(percent / (100 / THUMBS_METER_CELLS)),
          ),
  };
}

/* ---------- 가격 눈금 ---------- */

/** 가격 눈금 양 끝. 예산, 대표값, 제보를 모두 담되 5천~2만 원 기본 폭은 지킨다 */
export function priceScale(
  price: Pick<DetailPrice, "value" | "reports">,
  budgetKRW: number,
): { min: number; max: number } {
  const values = [price.value, budgetKRW, ...price.reports];
  const lo = Math.min(5_000, ...values);
  const hi = Math.max(20_000, ...values);
  return {
    min: Math.floor(lo / 1000) * 1000,
    max: Math.ceil(hi / 1000) * 1000,
  };
}
