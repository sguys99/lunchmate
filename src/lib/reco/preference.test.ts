// T6.11 선호 갱신: 지수 감쇠, 투표 승리 약한 긍정, 다시 뽑기 3연속 약한 부정, 카테고리 모르는 방문 (AC-REC-5).
import { describe, expect, it } from "vitest";
import { addKstDays } from "@/lib/time";
import {
  CATEGORY_PREF_SCALE,
  FEEDBACK_HALF_LIFE_DAYS,
  NEUTRAL,
  POLL_WIN_SIGNAL,
  RESHUFFLE_CATEGORY_PENALTY,
} from "./constants";
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
import type { Candidate, PollWin, RecoHistory, Visit } from "./types";

const score = (c: Candidate, history: RecoHistory = EMPTY_HISTORY) =>
  scoreCandidate(c, makeScoreContext(BASE_SETTINGS, history, NOW));

const daysAgo = (n: number) =>
  new Date(addKstDays(NOW, -n).getTime() + 12 * 3600_000);

const visit = (over: Partial<Visit> & Pick<Visit, "placeId">): Visit => ({
  category: "hansik",
  at: daysAgo(1),
  status: "visited",
  rating: null,
  ...over,
});

const withVisits = (visits: Visit[]): RecoHistory => ({
  ...EMPTY_HISTORY,
  visits,
});

describe("지수 감쇠 (T6.11, AC-REC-5)", () => {
  it("반감기만큼 지난 👎은 오늘 👎의 절반 신호다", () => {
    // 카테고리 신호는 tanh 안에서 작아 거의 선형: 반감기 지난 신호 ≈ 오늘 신호의 절반
    const shift = (n: number) =>
      NEUTRAL -
      score(
        makeCandidate("a"),
        withVisits([visit({ placeId: "b", rating: "down", at: daysAgo(n) })]),
      ).factors.P;
    const fresh = shift(0);
    const half = shift(FEEDBACK_HALF_LIFE_DAYS);
    expect(fresh).toBeCloseTo(CATEGORY_PREF_SCALE * Math.tanh(1), 3);
    expect(half).toBeCloseTo(CATEGORY_PREF_SCALE * Math.tanh(0.5), 2);
  });

  it("👍와 👎이 한 건씩이면 최근 쪽이 이긴다", () => {
    const recentDown = score(
      makeCandidate("a"),
      withVisits([
        visit({ placeId: "a", rating: "up", at: daysAgo(60) }),
        visit({ placeId: "a", rating: "down", at: daysAgo(1) }),
      ]),
    ).factors.P;
    const recentUp = score(
      makeCandidate("a"),
      withVisits([
        visit({ placeId: "a", rating: "down", at: daysAgo(60) }),
        visit({ placeId: "a", rating: "up", at: daysAgo(1) }),
      ]),
    ).factors.P;
    expect(recentDown).toBeLessThan(NEUTRAL);
    expect(recentUp).toBeGreaterThan(NEUTRAL);
  });

  it("카테고리를 모르는 방문(후보 밖 식당)은 그 식당 신호에만 쓰고 카테고리 신호와 반복 감점에는 쓰지 않는다", () => {
    const unknown = withVisits([
      visit({ placeId: "z", category: null, rating: "down", at: daysAgo(0) }),
    ]);
    const other = score(makeCandidate("a"), unknown);
    expect(other.factors.P).toBe(NEUTRAL);
    expect(other.factors.R).toBe(0);
    const same = score(makeCandidate("z"), unknown);
    expect(same.factors.P).toBeLessThan(NEUTRAL);
    expect(same.factors.R).toBeGreaterThan(0);
  });
});

describe("투표 승리 약한 긍정 (T6.11, 7단계 입력)", () => {
  const win = (over: Partial<PollWin> & Pick<PollWin, "placeId">): PollWin => ({
    category: "hansik",
    at: daysAgo(1),
    ...over,
  });

  it("이긴 식당의 P가 오르되 👍 한 건보다 작다", () => {
    const won = score(makeCandidate("a"), {
      ...EMPTY_HISTORY,
      pollWins: [win({ placeId: "a" })],
    }).factors.P;
    const liked = score(
      makeCandidate("a"),
      withVisits([visit({ placeId: "a", rating: "up" })]),
    ).factors.P;
    expect(won).toBeGreaterThan(NEUTRAL);
    expect(won).toBeLessThan(liked);
    expect(POLL_WIN_SIGNAL).toBeLessThan(1);
  });

  it("같은 카테고리 다른 식당은 조금, 다른 카테고리는 그대로다", () => {
    const h: RecoHistory = {
      ...EMPTY_HISTORY,
      pollWins: [win({ placeId: "b" })],
    };
    expect(score(makeCandidate("a"), h).factors.P).toBeGreaterThan(NEUTRAL);
    expect(score(makeCandidate("c", { category: "ilsik" }), h).factors.P).toBe(
      NEUTRAL,
    );
  });

  it("투표 승리도 시간이 지나면 약해지고, 이유 문장의 👍 근거로 쓰지 않는다", () => {
    const at = (n: number) =>
      score(makeCandidate("a"), {
        ...EMPTY_HISTORY,
        pollWins: [win({ placeId: "a", at: daysAgo(n) })],
      });
    expect(at(1).factors.P).toBeGreaterThan(at(30).factors.P);
    expect(at(1).evidence.lastUpAt).toBeNull();
    expect(at(1).evidence.categoryLiked).toBe(false);
  });
});

describe("다시 뽑기 3연속 약한 부정 (T6.11)", () => {
  it("세션 약한 부정 카테고리는 P에서 RESHUFFLE_CATEGORY_PENALTY만큼 빠진다", () => {
    const h: RecoHistory = {
      ...EMPTY_HISTORY,
      sessionDisliked: new Set(["hansik"]),
    };
    expect(score(makeCandidate("a"), h).factors.P).toBeCloseTo(
      NEUTRAL - RESHUFFLE_CATEGORY_PENALTY,
      10,
    );
    expect(score(makeCandidate("b", { category: "ilsik" }), h).factors.P).toBe(
      NEUTRAL,
    );
  });

  it("약한 부정이라 빼지는 않는다(하드 필터 아님): 후보가 그 카테고리뿐이면 그대로 나온다", () => {
    const only = manyCandidates(6, ["hansik"]);
    const r = recommend(
      makeInput({
        candidates: only,
        history: { ...EMPTY_HISTORY, sessionDisliked: new Set(["hansik"]) },
      }),
      seededRng(3),
    );
    expect(r.eligibleCount).toBe(6);
    expect(r.picks.length).toBeGreaterThan(0);
  });

  it("같은 시드에서 약한 부정 카테고리가 뽑히는 빈도가 줄어든다", () => {
    const pool = manyCandidates(24, ["hansik", "ilsik", "jungsik", "bunsik"]);
    const countHansik = (h: RecoHistory) => {
      let n = 0;
      for (let seed = 0; seed < 200; seed++) {
        const r = recommend(
          makeInput({ candidates: pool, history: h }),
          seededRng(seed),
        );
        n += r.picks.filter((p) => p.candidate.category === "hansik").length;
      }
      return n;
    };
    const base = countHansik(EMPTY_HISTORY);
    const disliked = countHansik({
      ...EMPTY_HISTORY,
      sessionDisliked: new Set(["hansik"]),
    });
    expect(disliked).toBeLessThan(base);
  });
});
