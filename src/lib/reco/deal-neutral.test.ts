// AC-DEAL-2 (T5.11 자리 → T6.23 완성): 할인 정보가 있는 식당과 없는 식당의 추천 점수는 다른 조건이 같으면 동일하다.
// 할인은 place_stats.deal_count → Candidate.deal(표시용)로만 들어온다(features/rec/place-stats.ts).
// 점수, 요소, 이유 근거, 하드 필터, 샘플링, 이유 문장, 펼치기 문장, 한 자리 다시 채우기가 모두 할인과 무관함을 묶는다.
// 카드 배지(표시)에만 할인이 보인다.
import { describe, expect, it } from "vitest";
import { cardBadges } from "@/features/rec/card-model";
import { drawDeck, refillDeck } from "@/features/rec/deck";
import { toPlaceStats, type PlaceStatsRow } from "@/features/rec/place-stats";
import { whyLines } from "@/features/rec/why";
import { applyHardFilters } from "./filter";
import { seededRng } from "./pick-one";
import { recommend } from "./recommend";
import { makeScoreContext, scoreCandidate } from "./score";
import {
  BASE_SETTINGS,
  EMPTY_HISTORY,
  NOW,
  makeCandidate,
  makeInput,
  manyCandidates,
} from "./test-fixtures";
import type { Candidate, RecoHistory, RecoResult } from "./types";

const ids = (r: RecoResult) => r.picks.map((p) => p.candidate.id);

/** 할인만 다르고 나머지 집계는 같은 행 */
const statsRow = (id: string, dealCount: number): PlaceStatsRow => ({
  place_id: id,
  price_count: 2,
  price_median: 9_000,
  thumbs_up: 5,
  thumbs_down: 1,
  closed_reports: 0,
  closed: false,
  wait_level: "short",
  wait_reported_at: new Date(NOW.getTime() - 5 * 60_000).toISOString(),
  deal_count: dealCount,
});

describe("AC-DEAL-2: 할인 정보가 있는 식당과 없는 식당의 추천 점수는 다른 조건이 같으면 동일하다", () => {
  const ctx = makeScoreContext(BASE_SETTINGS, EMPTY_HISTORY, NOW);

  it("deal 필드 유무와 값에 따라 점수, 요소, 이유 근거가 달라지지 않는다", () => {
    const base = makeCandidate("a", {
      thumbs: { up: 5, down: 1 },
      distanceM: 250,
    });
    const variants = [
      { ...base, deal: undefined },
      { ...base, deal: null },
      { ...base, deal: { active: false } },
      { ...base, deal: { active: true } },
    ];
    const results = variants.map((c) => scoreCandidate(c, ctx));
    for (const r of results) {
      expect(r.score).toBe(results[0]!.score);
      expect(r.factors).toEqual(results[0]!.factors);
      expect(r.evidence).toEqual(results[0]!.evidence);
    }
  });

  it("place_stats의 할인 수(0, 1, 5)만 다른 행은 같은 점수와 같은 펼치기 문장이 된다", () => {
    const scored = [0, 1, 5].map((n) =>
      scoreCandidate(makeCandidate("a", toPlaceStats(statsRow("a", n))), ctx),
    );
    for (const s of scored) {
      expect(s.score).toBe(scored[0]!.score);
      expect(s.factors).toEqual(scored[0]!.factors);
    }
    const lines = scored.map((s) =>
      whyLines({ ...s, reason: "", reasonKinds: [] }, NOW),
    );
    for (const l of lines) expect(l).toEqual(lines[0]);
  });

  it("하드 필터 결과가 할인과 무관하다", () => {
    const plain = manyCandidates(12);
    const withDeals = plain.map((c) => ({ ...c, deal: { active: true } }));
    const a = applyHardFilters(plain, BASE_SETTINGS, EMPTY_HISTORY);
    const b = applyHardFilters(withDeals, BASE_SETTINGS, EMPTY_HISTORY);
    expect(b.kept.map((c) => c.id)).toEqual(a.kept.map((c) => c.id));
    expect(b.filtered).toEqual(a.filtered);
  });

  it("같은 시드면 할인 유무와 관계없이 같은 카드, 같은 점수, 같은 이유가 뽑힌다(시드 50개)", () => {
    const plain = manyCandidates(30);
    const withDeals = plain.map((c, i) => ({
      ...c,
      deal: { active: i % 2 === 0 },
    }));
    for (let seed = 0; seed < 50; seed++) {
      const a = recommend(makeInput({ candidates: plain }), seededRng(seed));
      const b = recommend(
        makeInput({ candidates: withDeals }),
        seededRng(seed),
      );
      expect(ids(b)).toEqual(ids(a));
      expect(b.picks.map((p) => p.score)).toEqual(a.picks.map((p) => p.score));
      expect(b.picks.map((p) => p.reason)).toEqual(
        a.picks.map((p) => p.reason),
      );
    }
  });

  it("선호 기록, 세션 약한 부정이 있어도 할인은 결과를 바꾸지 않는다", () => {
    const plain = manyCandidates(24).map((c, i) =>
      makeCandidate(c.id, {
        ...c,
        ...toPlaceStats(statsRow(c.id, 0)),
        thumbs: { up: i % 5, down: i % 3 },
      }),
    );
    const withDeals: Candidate[] = plain.map((c) => ({
      ...c,
      deal: { active: true },
    }));
    const history: RecoHistory = {
      visits: [
        {
          placeId: "p1",
          category: plain[1]!.category,
          at: new Date(NOW.getTime() - 86_400_000),
          status: "visited",
          rating: "down",
        },
      ],
      blocked: new Set(["p2"]),
      sessionDisliked: new Set([plain[3]!.category]),
      pollWins: [{ placeId: "p4", category: plain[4]!.category, at: NOW }],
    };
    for (let seed = 0; seed < 20; seed++) {
      const a = drawDeck(makeInput({ candidates: plain, history }), seed);
      const b = drawDeck(makeInput({ candidates: withDeals, history }), seed);
      expect(ids(b.result)).toEqual(ids(a.result));
      expect(b.result.picks.map((p) => p.score)).toEqual(
        a.result.picks.map((p) => p.score),
      );
    }
  });

  it("다시 안 갈래요로 한 자리를 다시 채울 때도 할인과 무관하다", () => {
    const plain = manyCandidates(20);
    const withDeals = plain.map((c) => ({ ...c, deal: { active: true } }));
    const slots = ["p0", null, "p2"];
    const a = refillDeck(makeInput({ candidates: plain }), 9, slots);
    const b = refillDeck(makeInput({ candidates: withDeals }), 9, slots);
    expect(ids(b.result)).toEqual(ids(a.result));
  });

  it("할인은 카드 배지(표시)에만 보인다", () => {
    const c = makeCandidate("a", toPlaceStats(statsRow("a", 1)));
    const pick = { ...scoreCandidate(c, ctx), reason: "", reasonKinds: [] };
    expect(cardBadges(pick, NOW).some((b) => b.kind === "deal")).toBe(true);
  });
});
