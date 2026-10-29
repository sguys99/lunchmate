/**
 * "그냥 골라줘" 고르기 규칙 (REC-12, T3.3). 오늘 추천 카드 중 한 곳을 점수에 비례한 확률로 고른다.
 *
 * - React, 네트워크, DOM에 의존하지 않는 순수 함수다(CLAUDE.md 4장 src/lib/reco).
 * - 무작위는 rng 인자로만 받는다(CLAUDE.md 8장). 같은 rng 순서면 같은 결과가 나온다.
 * - 점수는 0 이상이면 된다(정규화 불필요). 음수, NaN, 무한대는 0으로 본다.
 *   모두 0이면(콜드 스타트 등) 균등하게 고른다.
 * - exclude: "다시 고르기"에서 방금 고른 곳을 빼고 고른다. 빼고 나면 후보가 없으면 빼지 않는다.
 * - 할인, 제휴는 점수에 넣지 않는다(제품 원칙 6). 여기서는 받은 점수만 쓴다.
 */

/** [0, 1) 균등 난수. Math.random과 같은 계약 */
export type Rng = () => number;

export type PickByScoreOptions = {
  /** 이번에는 고르지 않을 번호(예: 방금 고른 곳) */
  exclude?: number | null;
};

function weightOf(score: number): number {
  return Number.isFinite(score) && score > 0 ? score : 0;
}

/**
 * 점수 비례 가중 무작위로 번호 하나를 고른다. 후보가 없으면 -1.
 * rng는 한 번만 부른다(결정성 테스트와 시드 재현이 쉽게).
 */
export function pickByScore(
  scores: readonly number[],
  rng: Rng,
  { exclude = null }: PickByScoreOptions = {},
): number {
  if (scores.length === 0) return -1;
  const skip =
    exclude !== null &&
    exclude >= 0 &&
    exclude < scores.length &&
    scores.length > 1
      ? exclude
      : -1;

  const candidates: number[] = [];
  for (let i = 0; i < scores.length; i++) if (i !== skip) candidates.push(i);

  const weights = candidates.map((i) => weightOf(scores[i] ?? 0));
  const total = weights.reduce((a, b) => a + b, 0);
  const r = Math.min(Math.max(rng(), 0), 1 - Number.EPSILON);

  if (total <= 0) {
    return candidates[Math.floor(r * candidates.length)] ?? candidates[0]!;
  }

  let acc = 0;
  const target = r * total;
  for (let k = 0; k < candidates.length; k++) {
    acc += weights[k]!;
    if (target < acc) return candidates[k]!;
  }
  // 부동소수 오차로 끝까지 온 경우: 무게가 있는 마지막 후보
  for (let k = candidates.length - 1; k >= 0; k--) {
    if (weights[k]! > 0) return candidates[k]!;
  }
  return candidates[0]!;
}

/** 각 후보가 뽑힐 확률(설명과 테스트용). exclude 규칙은 pickByScore와 같다 */
export function pickProbabilities(
  scores: readonly number[],
  { exclude = null }: PickByScoreOptions = {},
): number[] {
  const n = scores.length;
  if (n === 0) return [];
  const skip =
    exclude !== null && exclude >= 0 && exclude < n && n > 1 ? exclude : -1;
  const weights = scores.map((s, i) => (i === skip ? 0 : weightOf(s)));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    const share = 1 / (skip === -1 ? n : n - 1);
    return scores.map((_, i) => (i === skip ? 0 : share));
  }
  return weights.map((w) => w / total);
}

/**
 * 시드 고정 난수(mulberry32). 테스트, 캡처 재현용(디자인 랩 ?seed=).
 * 실제 화면은 Math.random을 넘긴다.
 */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
