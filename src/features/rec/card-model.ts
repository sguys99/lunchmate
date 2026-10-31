// 엔진 결과(RecoPick) → 카드 표시 값 (T5.17, REC-06). 순수 함수.
// 숫자 3칸(도보 분, 1인 가격대, 👍 만족), 배지(최대 2개는 PlaceBadges가 지킴), 이유(도보 조각 뺌, G3 안건 6).
// 장소 이름과 좌표는 세션 메모리 값이다. 저장, 로그, 분석 이벤트에 넣지 않는다(CLAUDE.md 7장).
import type { PlaceBadge } from "@/components/badges/pick-badges";
import { homeCopy } from "@/copy/home";
import type { CategorySlug } from "@/features/place/categories";
import { resolvePrice } from "@/features/place/price-estimate";
import { priceBandParts, walkMinutesFromMeters } from "@/lib/format/number";
import type { KakaoRestaurant } from "@/lib/kakao/local";
import type { LatLng } from "@/lib/map/types";
import type { RecoPick } from "@/lib/reco/types";
import { WAIT_REPORT_TTL_MS, isExpired, type Meal } from "@/lib/time";
import { reasonWithoutWalk } from "./reason";

const units = homeCopy.today.numbers;

export type CardNumber = {
  /** 숫자. null이면 콜드 스타트(후기 3건 미만) */
  value: string | null;
  unit: string;
};

export type TodayCard = {
  id: string;
  name: string;
  category: CategorySlug;
  /** 카카오맵 상세 링크(저장 가능한 값) */
  placeUrl: string;
  position: LatLng;
  /** 카드 이유 한 줄(도보 분 뺌) */
  reason: string;
  walk: CardNumber;
  /** "9천" + "원대", "1.2만" + "원대" */
  price: CardNumber & { estimate: boolean; priceKRW: number };
  thumbs: CardNumber;
  badges: PlaceBadge[];
  /** 그냥 골라줘 점수 비례 고르기에 쓴다 */
  score: number;
  pick: RecoPick;
};

/** priceBandParts("9" + "천 원대") → "9천" + "원대": 천, 만은 숫자에 붙여 읽는다 */
export function priceNumber(priceKRW: number): CardNumber {
  const p = priceBandParts(priceKRW);
  return {
    value: `${p.amount}${p.unit.slice(0, 1)}`,
    unit: p.unit.slice(1).trim(),
  };
}

/** 카드 배지 후보. 웨이팅은 30분 안 제보만(PLACE-07), 할인은 표시만(AC-DEAL-2). 우선순위와 개수는 PlaceBadges */
export function cardBadges(pick: RecoPick, now: Date): PlaceBadge[] {
  const c = pick.candidate;
  const out: PlaceBadge[] = [];
  if (c.waiting && !isExpired(c.waiting.reportedAt, WAIT_REPORT_TTL_MS, now)) {
    out.push({
      kind: "waiting",
      level: c.waiting.level,
      minutesAgo: Math.max(
        0,
        Math.round((now.getTime() - c.waiting.reportedAt.getTime()) / 60_000),
      ),
    });
  }
  if (c.deal?.active) out.push({ kind: "deal" });
  return out;
}

export function toCard(
  pick: RecoPick,
  place: Pick<KakaoRestaurant, "placeUrl" | "position">,
  meal: Meal,
  now: Date,
): TodayCard {
  const c = pick.candidate;
  const price = resolvePrice(c.priceReport, c.category, meal);
  const percent = pick.evidence.thumbsUpPercent;
  return {
    id: c.id,
    name: c.name,
    category: c.category,
    placeUrl: place.placeUrl,
    position: place.position,
    reason: reasonWithoutWalk(pick.reason),
    walk: {
      value: String(walkMinutesFromMeters(c.distanceM)),
      unit: units.walkUnit,
    },
    price: {
      ...priceNumber(price.priceKRW),
      estimate: price.source === "estimate",
      priceKRW: price.priceKRW,
    },
    thumbs: {
      value: percent === null ? null : String(percent),
      unit: units.thumbsUnit,
    },
    badges: cardBadges(pick, now),
    score: pick.score,
    pick,
  };
}

/** 묶음 전체. 카카오 값이 없는 곳(있을 수 없지만)은 뺀다 */
export function toCards(
  picks: readonly RecoPick[],
  placesById: ReadonlyMap<string, KakaoRestaurant>,
  meal: Meal,
  now: Date,
): TodayCard[] {
  const out: TodayCard[] = [];
  for (const p of picks) {
    const place = placesById.get(p.candidate.id);
    if (place) out.push(toCard(p, place, meal, now));
  }
  return out;
}
