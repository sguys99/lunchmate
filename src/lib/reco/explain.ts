// 추천 이유 문장 (T5.10, PRD 7장 "설명 문장", REC-06, copy-guide 4.1절). 순수 함수.
// 점수 기여도가 큰 요소 2개를 골라 쉼표로 잇는다. 기여도는 각 요소가 중립값보다 점수를 얼마나 올렸는가
// (w × (값 − 0.5))로 비교한다. 올린 요소가 2개가 안 되면 "새로 찾은 곳"(처음 가는 곳), "도보 약 N분" 순으로 채운다.
// 할인 정보는 점수에도 이유에도 들어가지 않는다(AC-DEAL-2).
// 카드에는 도보 칸이 따로 있어 화면은 src/features/rec/reason.ts reasonWithoutWalk로 도보 조각을 뺀다.
import { recCopy } from "@/copy/rec";
import { categoryLabel, type CategorySlug } from "@/features/place/categories";
import { formatPriceBand, formatWalkMinutes } from "@/lib/format/number";
import { kstDayDiff } from "@/lib/time";
import { CATEGORY_REPEAT_STEP, NEUTRAL, WEIGHTS } from "./constants";
import type { ReasonKind, ScoredCandidate } from "./types";

/** "국밥/탕" → "국밥", "카페/베이커리" → "카페" */
export function shortCategoryLabel(slug: CategorySlug): string {
  return categoryLabel(slug).split("/")[0]!;
}

type ReasonOption = { kind: ReasonKind; weight: number; text: string };

function likedPlaceText(lastUpAt: Date, now: Date, label: string): string {
  const days = kstDayDiff(lastUpAt, now);
  const t = recCopy.reason.likedPlace;
  if (days <= 0) return t.today(label);
  if (days === 1) return t.yesterday(label);
  if (days < 7) return t.recent(label);
  if (days < 14) return t.lastWeek(label);
  return t.older(label);
}

/** 기여도 순으로 정렬한 이유 후보(점수를 올린 것만) */
export function reasonOptions(s: ScoredCandidate, now: Date): ReasonOption[] {
  const { factors: f, evidence: e } = s;
  const label = shortCategoryLabel(s.candidate.category);
  const out: ReasonOption[] = [];

  out.push({
    kind: "distance",
    weight: WEIGHTS.d * (f.D - NEUTRAL),
    text: formatWalkMinutes(e.walkMinutes),
  });

  const pGain = WEIGHTS.p * (f.P - NEUTRAL);
  if (e.lastUpAt !== null) {
    out.push({
      kind: "likedPlace",
      weight: pGain,
      text: likedPlaceText(e.lastUpAt, now, label),
    });
  } else if (e.craving) {
    out.push({
      kind: "craving",
      weight: pGain,
      text: recCopy.reason.craving(label),
    });
  } else if (e.categoryLiked) {
    out.push({
      kind: "likedCategory",
      weight: pGain,
      text: recCopy.reason.likedCategory(label),
    });
  }

  // 예산은 실제 제보 가격일 때만 이유로 쓴다(추정가로 "예산 안"이라고 말하지 않는다)
  if (e.price.source === "report") {
    out.push({
      kind: "budget",
      weight: WEIGHTS.b * (f.B - NEUTRAL),
      text: recCopy.reason.budgetReported(formatPriceBand(e.price.priceKRW)),
    });
  }

  if (e.thumbsUpPercent !== null) {
    out.push({
      kind: "reputation",
      weight: WEIGHTS.c * (f.C - NEUTRAL),
      text: recCopy.reason.reputation(e.thumbsUpPercent),
    });
  }

  // 최근 3일 기록이 있는데 이 종류는 안 먹었다: 반복 패널티를 피한 만큼을 기여도로 본다
  if (e.hasRecentHistory && !e.categoryRecent && f.R === 0) {
    out.push({
      kind: "novelty",
      weight: WEIGHTS.r * CATEGORY_REPEAT_STEP,
      text: recCopy.reason.novelty(label),
    });
  }

  // 같은 기여도면 위에 넣은 순서(거리, 선호, 예산, 평판, 새로움)를 지킨다
  return out
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => o.weight > 1e-9)
    .sort((a, b) => b.o.weight - a.o.weight || a.i - b.i)
    .map(({ o }) => o);
}

export type Reason = { text: string; kinds: ReasonKind[] };

/** 카드 이유 1줄: 기여도 상위 2요소 */
export function explain(s: ScoredCandidate, now: Date): Reason {
  const chosen = reasonOptions(s, now).slice(0, 2);
  if (
    chosen.length < 2 &&
    !s.evidence.everVisited &&
    !chosen.some((c) => c.kind === "newPlace")
  ) {
    chosen.push({ kind: "newPlace", weight: 0, text: recCopy.reason.newPlace });
  }
  if (chosen.length < 2 && !chosen.some((c) => c.kind === "distance")) {
    chosen.push({
      kind: "distance",
      weight: 0,
      text: formatWalkMinutes(s.evidence.walkMinutes),
    });
  }
  return {
    text: chosen.map((c) => c.text).join(recCopy.reason.separator),
    kinds: chosen.map((c) => c.kind),
  };
}
