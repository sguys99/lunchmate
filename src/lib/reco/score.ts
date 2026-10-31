// 점수 계산 (T5.7, PRD 7장, AC-REC-5, PLACE-08, SET-05). 순수 함수.
// 가중치와 상수는 constants.ts. 시간 판정은 src/lib/time.
import { resolvePrice } from "@/features/place/price-estimate";
import {
  DAY_MS,
  WAIT_REPORT_TTL_MS,
  isExpired,
  isLunchPeak,
  isPast,
  kstDayDiff,
} from "@/lib/time";
import {
  BUDGET_OVER_SLOPE,
  CATEGORY_PREF_SCALE,
  CATEGORY_REPEAT_MAX,
  CATEGORY_REPEAT_STEP,
  CRAVING_BOOST,
  ESTIMATE_BUDGET_CONFIDENCE,
  FEEDBACK_HALF_LIFE_DAYS,
  MIN_REVIEWS_FOR_REPUTATION,
  NEUTRAL,
  PLACE_PREF_SCALE,
  PLACE_REPEAT_PENALTY,
  REPEAT_WINDOW_DAYS,
  REPUTATION_PRIOR_COUNT,
  WEIGHTS,
} from "./constants";
import { thumbsUpPercent } from "@/lib/format/number";
import { estimateWalkMinutes } from "./distance";
import type {
  Candidate,
  RecoHistory,
  RecoSettings,
  ScoreEvidence,
  ScoreFactors,
  ScoredCandidate,
  Visit,
} from "./types";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** 피드백 무게: 반감기 지수 감쇠. 미래 시각은 0일로 본다 */
function decay(at: Date, now: Date): number {
  const ageDays = Math.max(0, now.getTime() - at.getTime()) / DAY_MS;
  return Math.pow(0.5, ageDays / FEEDBACK_HALF_LIFE_DAYS);
}

const ratingSign = (v: Visit) =>
  v.rating === "up" ? 1 : v.rating === "down" ? -1 : 0;

/** 반복 창(오늘 포함 최근 REPEAT_WINDOW_DAYS일) 안의 방문. "안 갔어요"는 빼고 길찾기만 누른 곳은 넣는다 */
export function recentVisits(visits: readonly Visit[], now: Date): Visit[] {
  return visits.filter((v) => {
    if (v.status === "skipped") return false;
    const d = kstDayDiff(v.at, now);
    return d >= 0 && d < REPEAT_WINDOW_DAYS;
  });
}

/** 요즘 땡겨요가 지금 유효한가(until 전) */
export function activeCravings(
  settings: Pick<RecoSettings, "craving">,
  now: Date,
): ReadonlySet<string> {
  const { categories, until } = settings.craving;
  if (categories.length === 0 || until === null || isPast(until, now))
    return new Set();
  return new Set(categories);
}

/** 컨텍스트: 후보마다 다시 계산하지 않을 값 */
export type ScoreContext = {
  settings: RecoSettings;
  history: RecoHistory;
  now: Date;
  recent: Visit[];
  cravings: ReadonlySet<string>;
  lunchPeak: boolean;
};

export function makeScoreContext(
  settings: RecoSettings,
  history: RecoHistory,
  now: Date,
): ScoreContext {
  return {
    settings,
    history,
    now,
    recent: recentVisits(history.visits, now),
    cravings: activeCravings(settings, now),
    lunchPeak: isLunchPeak(now),
  };
}

export function scoreCandidate(
  c: Candidate,
  ctx: ScoreContext,
): ScoredCandidate {
  const { settings, history, now } = ctx;

  // D: 허용 도보 분에 닿으면 0, 바로 앞이면 1
  const walk = estimateWalkMinutes(c.distanceM);
  const D =
    settings.walkMinutes > 0 ? clamp01(1 - walk / settings.walkMinutes) : 0;

  // P: 이 식당과 같은 카테고리의 👍👎(지수 감쇠) + 요즘 땡겨요. 피드백 없으면 0.5
  let placeSignal = 0;
  let categorySignal = 0;
  let lastUpAt: Date | null = null;
  let categoryLiked = false;
  let everVisited = false;
  for (const v of history.visits) {
    if (v.status === "skipped") continue; // FB-05: 안 갔어요는 신호가 아니다
    const sign = ratingSign(v);
    if (v.placeId === c.id) {
      everVisited = true;
      placeSignal += sign * decay(v.at, now);
      if (v.rating === "up" && (lastUpAt === null || v.at > lastUpAt))
        lastUpAt = v.at;
    } else if (v.category === c.category) {
      categorySignal += sign * decay(v.at, now);
      if (v.rating === "up") categoryLiked = true;
    }
  }
  const craving = ctx.cravings.has(c.category);
  const P = clamp01(
    NEUTRAL +
      PLACE_PREF_SCALE * Math.tanh(placeSignal) +
      CATEGORY_PREF_SCALE * Math.tanh(categorySignal) +
      (craving ? CRAVING_BOOST : 0),
  );

  // B: 예산 안이면 1, 넘으면 넘은 비율만큼 깎음. 추정가는 중립 쪽으로 반만 반영
  const price = resolvePrice(c.priceReport, c.category, settings.meal);
  const budget = settings.budgetKRW;
  const fit =
    budget <= 0
      ? NEUTRAL
      : price.priceKRW <= budget
        ? 1
        : clamp01(1 - ((price.priceKRW - budget) / budget) * BUDGET_OVER_SLOPE);
  const B =
    price.source === "report"
      ? fit
      : NEUTRAL + (fit - NEUTRAL) * ESTIMATE_BUDGET_CONFIDENCE;

  // C: 후기 3건 미만이면 중립, 이상이면 가상 후기로 중립 쪽에 당긴 👍 비율
  const n = c.thumbs.up + c.thumbs.down;
  const C =
    n < MIN_REVIEWS_FOR_REPUTATION
      ? NEUTRAL
      : (c.thumbs.up + NEUTRAL * REPUTATION_PRIOR_COUNT) /
        (n + REPUTATION_PRIOR_COUNT);

  // R: 최근 3일 이 식당이면 강한 감점, 같은 카테고리는 약한 감점
  const placeRecent = ctx.recent.some((v) => v.placeId === c.id);
  const categoryRecentCount = ctx.recent.filter(
    (v) => v.placeId !== c.id && v.category === c.category,
  ).length;
  const R = clamp01(
    (placeRecent ? PLACE_REPEAT_PENALTY : 0) +
      Math.min(CATEGORY_REPEAT_MAX, categoryRecentCount * CATEGORY_REPEAT_STEP),
  );

  // W: 점심 피크에 30분 안 "줄 길어요" 제보가 있으면 감점(PLACE-08)
  const W =
    ctx.lunchPeak &&
    c.waiting !== null &&
    c.waiting.level === "long" &&
    !isExpired(c.waiting.reportedAt, WAIT_REPORT_TTL_MS, now)
      ? 1
      : 0;

  const factors: ScoreFactors = { D, P, B, C, R, W };
  const evidence: ScoreEvidence = {
    walkMinutes: walk,
    price: { priceKRW: price.priceKRW, source: price.source },
    lastUpAt,
    categoryLiked,
    craving,
    thumbsUpPercent:
      n < MIN_REVIEWS_FOR_REPUTATION ? null : thumbsUpPercent(c.thumbs.up, n),
    everVisited,
    categoryRecent: categoryRecentCount > 0,
    hasRecentHistory: ctx.recent.length > 0,
  };
  return { candidate: c, score: totalScore(factors), factors, evidence };
}

/** S = w_d·D + w_p·P + w_b·B + w_c·C − w_r·R − w_w·W */
export function totalScore(f: ScoreFactors): number {
  return (
    WEIGHTS.d * f.D +
    WEIGHTS.p * f.P +
    WEIGHTS.b * f.B +
    WEIGHTS.c * f.C -
    WEIGHTS.r * f.R -
    WEIGHTS.w * f.W
  );
}

export function scoreAll(
  candidates: readonly Candidate[],
  settings: RecoSettings,
  history: RecoHistory,
  now: Date,
): ScoredCandidate[] {
  const ctx = makeScoreContext(settings, history, now);
  return candidates.map((c) => scoreCandidate(c, ctx));
}
