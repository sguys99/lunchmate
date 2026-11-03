// place_stats → 엔진: 평판 C, 예산 필터, 웨이팅 W(T6.25, PLACE-08), 폐업 제외(T6.15, MOD-03), 할인 표시만.
import { describe, expect, it } from "vitest";
import { NEUTRAL } from "@/lib/reco/constants";
import { applyHardFilters, CLOSED_REPORT_THRESHOLD } from "@/lib/reco/filter";
import { seededRng } from "@/lib/reco/pick-one";
import { recommend } from "@/lib/reco/recommend";
import { makeScoreContext, scoreCandidate } from "@/lib/reco/score";
import {
  BASE_SETTINGS,
  EMPTY_HISTORY,
  NOW,
  makeCandidate,
  makeInput,
} from "@/lib/reco/test-fixtures";
import type { Candidate } from "@/lib/reco/types";
import { fromKstWallTime } from "@/lib/time";
import { EMPTY_STATS } from "./candidates";
import { statsLookup, toPlaceStats, type PlaceStatsRow } from "./place-stats";

const row = (over: Partial<PlaceStatsRow> = {}): PlaceStatsRow => ({
  place_id: "1",
  price_count: 0,
  price_median: null,
  thumbs_up: 0,
  thumbs_down: 0,
  closed_reports: 0,
  closed: false,
  wait_level: null,
  wait_reported_at: null,
  deal_count: 0,
  ...over,
});

const withRow = (id: string, over: Partial<PlaceStatsRow>): Candidate =>
  makeCandidate(id, toPlaceStats(row({ place_id: id, ...over })));

const scoreAt = (c: Candidate, now: Date) =>
  scoreCandidate(c, makeScoreContext(BASE_SETTINGS, EMPTY_HISTORY, now));

const minutesBefore = (now: Date, m: number) =>
  new Date(now.getTime() - m * 60_000).toISOString();

describe("toPlaceStats", () => {
  it("빈 집계는 콜드 스타트 값과 같다", () => {
    expect(toPlaceStats(row())).toEqual(EMPTY_STATS);
  });

  it("가격 제보가 있을 때만 priceReport, 없으면 null(추정가)", () => {
    expect(
      toPlaceStats(row({ price_count: 2, price_median: 9000 })).priceReport,
    ).toEqual({ medianKRW: 9000, count: 2 });
    expect(
      toPlaceStats(row({ price_count: 0, price_median: 9000 })).priceReport,
    ).toBeNull();
    expect(
      toPlaceStats(row({ price_count: 3, price_median: null })).priceReport,
    ).toBeNull();
  });

  it("웨이팅 단계 now는 walkIn, 모르는 단계와 깨진 시각은 버린다", () => {
    const at = NOW.toISOString();
    expect(
      toPlaceStats(row({ wait_level: "now", wait_reported_at: at })).waiting
        ?.level,
    ).toBe("walkIn");
    expect(
      toPlaceStats(row({ wait_level: "huge", wait_reported_at: at })).waiting,
    ).toBeNull();
    expect(
      toPlaceStats(row({ wait_level: "long", wait_reported_at: "x" })).waiting,
    ).toBeNull();
  });

  it("오늘 쉬어요 제보 수를 넘기고, 없거나 깨진 값은 0(T9.18)", () => {
    expect(toPlaceStats(row({ closed_today: 2 })).closedToday).toBe(2);
    expect(toPlaceStats(row({ closed_today: null })).closedToday).toBe(0);
    expect(toPlaceStats(row({ closed_today: -1 })).closedToday).toBe(0);
  });

  it("할인은 표시용 deal만 켠다", () => {
    expect(toPlaceStats(row({ deal_count: 2 })).deal).toEqual({
      active: true,
    });
    expect(toPlaceStats(row({ deal_count: 0 })).deal).toBeNull();
  });

  it("statsLookup: 없는 곳과 실패(null)는 EMPTY_STATS", () => {
    const get = statsLookup([row({ place_id: "9", thumbs_up: 4 })]);
    expect(get("9").thumbs.up).toBe(4);
    expect(get("8")).toBe(EMPTY_STATS);
    expect(statsLookup(null)("9")).toBe(EMPTY_STATS);
  });
});

describe("평판 C: 후기 3건 미만 중립", () => {
  it("👍👎 합이 3 미만이면 C = 0.5, 3 이상이면 👍 비율을 따른다", () => {
    expect(scoreAt(withRow("1", { thumbs_up: 2 }), NOW).factors.C).toBe(
      NEUTRAL,
    );
    const s = scoreAt(withRow("1", { thumbs_up: 3, thumbs_down: 0 }), NOW);
    expect(s.factors.C).toBeGreaterThan(NEUTRAL);
    expect(s.evidence.thumbsUpPercent).toBe(100);
  });
});

describe("예산 하드 필터: 가격 제보가 있을 때만 (AC-REC-1)", () => {
  const settings = { ...BASE_SETTINGS, budgetKRW: 10_000 };
  it("제보 중앙값이 예산을 넘으면 뺀다", () => {
    const c = withRow("1", { price_count: 1, price_median: 15_000 });
    const r = applyHardFilters([c], settings, EMPTY_HISTORY, NOW);
    expect(r.kept).toHaveLength(0);
    expect(r.filtered.overBudget).toBe(1);
  });

  it("제보가 없으면 비싼 카테고리 추정가여도 빼지 않는다(점수 B에서만)", () => {
    const c = makeCandidate("1", {
      ...toPlaceStats(row()),
      category: "gogi",
    });
    const r = applyHardFilters(
      [c],
      { ...settings, budgetKRW: 5_000 },
      EMPTY_HISTORY,
      NOW,
    );
    expect(r.kept).toHaveLength(1);
  });
});

describe("폐업 제보 3건 누적 시 추천 제외 (T6.15, MOD-03)", () => {
  it("서로 다른 3명 제보(closed)면 하드 필터로 빠지고 2건이면 남는다", () => {
    const closed = withRow("1", { closed_reports: 3, closed: true });
    const two = withRow("2", { closed_reports: 2 });
    const r = applyHardFilters(
      [closed, two],
      BASE_SETTINGS,
      EMPTY_HISTORY,
      NOW,
    );
    expect(r.kept.map((c) => c.id)).toEqual(["2"]);
    expect(r.filtered.closed).toBe(1);
  });

  it("서버가 closed로 판정하면 수가 모자라 보여도 뺀다(서버 판정 우선)", () => {
    expect(
      toPlaceStats(row({ closed_reports: 1, closed: true })).closedReports,
    ).toBeGreaterThanOrEqual(CLOSED_REPORT_THRESHOLD);
  });

  it("추천 결과에 폐업 곳이 나오지 않는다", () => {
    const candidates = Array.from({ length: 8 }, (_, i) =>
      withRow(String(i + 1), i < 4 ? { closed_reports: 3, closed: true } : {}),
    );
    for (let seed = 0; seed < 20; seed++) {
      const r = recommend(makeInput({ candidates }), seededRng(seed));
      for (const p of r.picks)
        expect(Number(p.candidate.id)).toBeGreaterThan(4);
    }
  });
});

describe("점심 피크 줄 길어요 감점 (T6.25, PLACE-08)", () => {
  const kst = (h: number, m = 0) => fromKstWallTime(2026, 10, 30, h, m);

  it("점심 피크(11:00~13:30 KST) 안, 30분 안 '줄 길어요'만 W = 1", () => {
    for (const now of [kst(11), kst(12, 10), kst(13, 29)]) {
      const c = withRow("1", {
        wait_level: "long",
        wait_reported_at: minutesBefore(now, 10),
      });
      expect(scoreAt(c, now).factors.W).toBe(1);
      expect(scoreAt(c, now).score).toBeLessThan(
        scoreAt(withRow("1", {}), now).score,
      );
    }
  });

  it("피크 밖(10:59, 13:30, 저녁)은 감점 없음", () => {
    for (const now of [kst(10, 59), kst(13, 30), kst(18, 30)]) {
      const c = withRow("1", {
        wait_level: "long",
        wait_reported_at: minutesBefore(now, 5),
      });
      expect(scoreAt(c, now).factors.W).toBe(0);
    }
  });

  it("바로 입장, 조금 기다림은 피크에도 감점 없음", () => {
    const now = kst(12);
    for (const level of ["now", "short"]) {
      const c = withRow("1", {
        wait_level: level,
        wait_reported_at: minutesBefore(now, 5),
      });
      expect(scoreAt(c, now).factors.W).toBe(0);
    }
  });

  it("30분이 지난 제보는 감점 없음(묶음을 뽑은 시각 기준)", () => {
    const now = kst(12, 40);
    const c = withRow("1", {
      wait_level: "long",
      wait_reported_at: minutesBefore(now, 30),
    });
    expect(scoreAt(c, now).factors.W).toBe(0);
  });

  it("감점이지 제외가 아니다: 하드 필터를 통과한다", () => {
    const now = kst(12);
    const c = withRow("1", {
      wait_level: "long",
      wait_reported_at: minutesBefore(now, 1),
    });
    expect(
      applyHardFilters([c], BASE_SETTINGS, EMPTY_HISTORY, NOW).kept,
    ).toHaveLength(1);
  });
});
