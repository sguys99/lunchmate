// 상세 숫자 3개 계산 (T5.2). 표현은 시안마다 다르고 값은 같다.
import { categoryLabel } from "@/features/place/categories";
import { formatWon, priceBandParts, thumbsUpPercent } from "@/lib/format";
import {
  THUMBS_MIN_SAMPLE,
  representativePrice,
  thumbsTotal,
  type PlaceDetail,
} from "./detail-mock";

export type DetailNumbers = {
  /** 이름을 못 찾았으면 좌표도 없어 null */
  walkMinutes: number | null;
  price: {
    /** RollingNumber에 넣을 숫자 (9, 1.2) */
    amount: number;
    /** "천 원대", "만 원대" */
    unit: string;
    /** 대표값(원). 제보 중앙값 또는 추정값 */
    value: number;
    /** 정확한 대표값 "9,000원" */
    won: string;
    estimate: boolean;
    reportCount: number;
    category: string;
    /** 제보 최소, 최대 (제보 2건 이상일 때만) */
    range: { min: number; max: number } | null;
  };
  thumbs: {
    up: number;
    down: number;
    total: number;
    /** 표본 3건 미만이면 null */
    percent: number | null;
  };
};

export function detailNumbers(d: PlaceDetail, named: boolean): DetailNumbers {
  const rep = representativePrice(d);
  const band = priceBandParts(rep.value);
  // "9" + "천 원대" → 숫자 9, 단위 "천 원대". 만 단위는 소수 한 자리
  const amount = Number(band.amount);
  const sorted = [...d.priceReports].sort((a, b) => a - b);
  const total = thumbsTotal(d);
  return {
    walkMinutes: named ? d.place.walkMinutes : null,
    price: {
      amount,
      unit: band.unit,
      value: rep.value,
      won: formatWon(rep.value),
      estimate: rep.estimate,
      reportCount: d.priceReports.length,
      category: categoryLabel(d.place.category),
      range:
        sorted.length >= 2
          ? { min: sorted[0] ?? 0, max: sorted[sorted.length - 1] ?? 0 }
          : null,
    },
    thumbs: {
      up: d.thumbs.up,
      down: d.thumbs.down,
      total,
      percent:
        total >= THUMBS_MIN_SAMPLE ? thumbsUpPercent(d.thumbs.up, total) : null,
    },
  };
}
