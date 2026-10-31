import { describe, expect, it } from "vitest";
import { addKstDays } from "@/lib/time";
import { NEUTRAL, WEIGHTS } from "./constants";
import {
  scoreAll,
  scoreCandidate,
  makeScoreContext,
  totalScore,
} from "./score";
import {
  BASE_SETTINGS,
  EMPTY_HISTORY,
  NOW,
  makeCandidate,
} from "./test-fixtures";
import type { RecoHistory, RecoSettings, Visit } from "./types";

const score = (
  c = makeCandidate("a"),
  settings: RecoSettings = BASE_SETTINGS,
  history: RecoHistory = EMPTY_HISTORY,
  now = NOW,
) => scoreCandidate(c, makeScoreContext(settings, history, now));

/** KST 기준 n일 전 같은 시각 근처(정오) */
const daysAgo = (n: number) =>
  new Date(addKstDays(NOW, -n).getTime() + 12 * 3600_000);

const visit = (over: Partial<Visit> & Pick<Visit, "placeId">): Visit => ({
  category: "hansik",
  at: daysAgo(1),
  status: "visited",
  rating: null,
  ...over,
});

describe("점수 식 (T5.7)", () => {
  it("S = w_d·D + w_p·P + w_b·B + w_c·C − w_r·R − w_w·W", () => {
    const f = { D: 1, P: 0.5, B: 1, C: 0.5, R: 0.5, W: 1 };
    expect(totalScore(f)).toBeCloseTo(
      WEIGHTS.d +
        WEIGHTS.p * 0.5 +
        WEIGHTS.b +
        WEIGHTS.c * 0.5 -
        WEIGHTS.r * 0.5 -
        WEIGHTS.w,
      10,
    );
  });

  it("D: 가까울수록 크고 허용 도보 분에 닿으면 0", () => {
    expect(score(makeCandidate("a", { distanceM: 0 })).factors.D).toBe(1);
    expect(score(makeCandidate("a", { distanceM: 515 })).factors.D).toBeCloseTo(
      0,
      1,
    );
    expect(
      score(makeCandidate("a", { distanceM: 100 })).factors.D,
    ).toBeGreaterThan(score(makeCandidate("a", { distanceM: 300 })).factors.D);
  });
});

describe("콜드 스타트 (T5.7)", () => {
  it("피드백 0건이면 P = 0.5, 후기 3건 미만이면 C = 0.5", () => {
    const s = score(makeCandidate("a", { thumbs: { up: 2, down: 0 } }));
    expect(s.factors.P).toBe(NEUTRAL);
    expect(s.factors.C).toBe(NEUTRAL);
    expect(s.evidence.thumbsUpPercent).toBeNull();
  });

  it("후기 3건부터 C가 👍 비율을 따르되 중립 쪽으로 당겨진다", () => {
    const c = score(makeCandidate("a", { thumbs: { up: 3, down: 0 } })).factors
      .C;
    expect(c).toBeGreaterThan(NEUTRAL);
    expect(c).toBeLessThan(1);
    const many = score(makeCandidate("a", { thumbs: { up: 30, down: 0 } }))
      .factors.C;
    expect(many).toBeGreaterThan(c);
  });
});

describe("AC-REC-5: 어제 👎한 식당은 다음 날 추천 점수가 낮아진다", () => {
  it("어제 👎이 있으면 같은 조건에서 점수가 더 낮다", () => {
    const c = makeCandidate("a");
    const visited: RecoHistory = {
      visits: [visit({ placeId: "a" })],
      blocked: new Set(),
    };
    const disliked: RecoHistory = {
      visits: [visit({ placeId: "a", rating: "down" })],
      blocked: new Set(),
    };
    const base = score(c, BASE_SETTINGS, visited);
    const down = score(c, BASE_SETTINGS, disliked);
    expect(down.factors.P).toBeLessThan(base.factors.P);
    expect(down.score).toBeLessThan(base.score);
  });

  it("👎는 시간이 지날수록 약해진다(지수 감쇠)", () => {
    const c = makeCandidate("a");
    const p = (n: number) =>
      score(c, BASE_SETTINGS, {
        visits: [visit({ placeId: "a", rating: "down", at: daysAgo(n) })],
        blocked: new Set(),
      }).factors.P;
    expect(p(1)).toBeLessThan(p(30));
    expect(p(30)).toBeLessThan(NEUTRAL);
  });

  it("👍는 P를 올리고, 같은 카테고리 다른 식당의 👍도 조금 올린다", () => {
    const c = makeCandidate("a");
    const up = score(c, BASE_SETTINGS, {
      visits: [visit({ placeId: "a", rating: "up", at: daysAgo(10) })],
      blocked: new Set(),
    });
    const cat = score(c, BASE_SETTINGS, {
      visits: [visit({ placeId: "b", rating: "up", at: daysAgo(10) })],
      blocked: new Set(),
    });
    expect(up.factors.P).toBeGreaterThan(cat.factors.P);
    expect(cat.factors.P).toBeGreaterThan(NEUTRAL);
  });

  it("안 갔어요는 부정 신호도 반복 패널티도 아니다(FB-05)", () => {
    const s = score(makeCandidate("a"), BASE_SETTINGS, {
      visits: [visit({ placeId: "a", status: "skipped", at: daysAgo(0) })],
      blocked: new Set(),
    });
    expect(s.factors.P).toBe(NEUTRAL);
    expect(s.factors.R).toBe(0);
  });
});

describe("반복 패널티 R (T5.7)", () => {
  it("최근 3일(오늘, 1, 2일 전)에 간 식당은 강한 감점, 3일 전은 창 밖", () => {
    const r = (n: number) =>
      score(makeCandidate("a"), BASE_SETTINGS, {
        visits: [visit({ placeId: "a", at: daysAgo(n) })],
        blocked: new Set(),
      }).factors.R;
    expect(r(0)).toBe(1);
    expect(r(2)).toBe(1);
    expect(r(3)).toBe(0);
  });

  it("같은 카테고리는 약한 감점, 길찾기만 누른 기록도 센다", () => {
    const s = score(makeCandidate("a"), BASE_SETTINGS, {
      visits: [
        visit({ placeId: "b", status: "candidate" }),
        visit({ placeId: "c", at: daysAgo(2) }),
      ],
      blocked: new Set(),
    });
    expect(s.factors.R).toBe(0.5);
    const other = score(
      makeCandidate("a", { category: "ilsik" }),
      BASE_SETTINGS,
      {
        visits: [visit({ placeId: "b" })],
        blocked: new Set(),
      },
    );
    expect(other.factors.R).toBe(0);
  });
});

describe("요즘 이게 땡겨요 (SET-05)", () => {
  const settings = (until: Date | null): RecoSettings => ({
    ...BASE_SETTINGS,
    craving: { categories: ["ilsik"], until },
  });

  it("유효 기간 안이면 해당 카테고리 P가 오른다", () => {
    const s = score(
      makeCandidate("a", { category: "ilsik" }),
      settings(addKstDays(NOW, 3)),
    );
    expect(s.factors.P).toBeGreaterThan(NEUTRAL);
    expect(s.evidence.craving).toBe(true);
    expect(
      score(makeCandidate("a"), settings(addKstDays(NOW, 3))).factors.P,
    ).toBe(NEUTRAL);
  });

  it("만료 시각이 지나면 무시한다", () => {
    const s = score(
      makeCandidate("a", { category: "ilsik" }),
      settings(new Date(NOW.getTime() - 1)),
    );
    expect(s.factors.P).toBe(NEUTRAL);
  });
});

describe("예산 B (T5.7, T5.13)", () => {
  it("제보 가격이 예산 안이면 1, 추정가는 중립 쪽으로 반만", () => {
    expect(
      score(makeCandidate("a", { priceReport: { medianKRW: 9_000, count: 2 } }))
        .factors.B,
    ).toBe(1);
    expect(score(makeCandidate("a")).factors.B).toBe(0.75); // 한식 점심 추정 1만 원 <= 1.2만 원
  });

  it("추정가가 예산을 넘으면 깎인다(빼지는 않는다)", () => {
    const s = score(makeCandidate("a", { category: "yangsik" }), {
      ...BASE_SETTINGS,
      budgetKRW: 10_000,
    });
    expect(s.factors.B).toBeLessThan(NEUTRAL);
    expect(s.evidence.price.source).toBe("estimate");
  });
});

describe("웨이팅 W (PLACE-08)", () => {
  const long = (minutesAgo: number) => ({
    level: "long" as const,
    reportedAt: new Date(NOW.getTime() - minutesAgo * 60_000),
  });

  it("점심 피크에 30분 안 줄 길어요면 감점", () => {
    const s = score(makeCandidate("a", { waiting: long(10) }));
    expect(s.factors.W).toBe(1);
    expect(s.score).toBeLessThan(score(makeCandidate("a")).score);
  });

  it("30분 지난 제보, 다른 단계, 피크 밖은 감점 없음", () => {
    expect(score(makeCandidate("a", { waiting: long(30) })).factors.W).toBe(0);
    expect(
      score(
        makeCandidate("a", { waiting: { level: "short", reportedAt: NOW } }),
      ).factors.W,
    ).toBe(0);
    const evening = new Date("2026-10-30T10:00:00Z"); // KST 19:00
    expect(
      score(
        makeCandidate("a", { waiting: { level: "long", reportedAt: evening } }),
        BASE_SETTINGS,
        EMPTY_HISTORY,
        evening,
      ).factors.W,
    ).toBe(0);
  });
});

describe("scoreAll", () => {
  it("후보마다 점수를 매기고 순서를 유지한다", () => {
    const r = scoreAll(
      [makeCandidate("a"), makeCandidate("b")],
      BASE_SETTINGS,
      EMPTY_HISTORY,
      NOW,
    );
    expect(r.map((s) => s.candidate.id)).toEqual(["a", "b"]);
  });
});
