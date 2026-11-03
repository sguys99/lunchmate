import { describe, expect, it } from "vitest";
import {
  applyHardFilters,
  hardFilterReason,
  isOffMeal,
  personalFilterReason,
} from "./filter";
import {
  BASE_SETTINGS,
  EMPTY_HISTORY,
  makeCandidate,
  manyCandidates,
  NOW,
} from "./test-fixtures";

describe("하드 필터 순서 (T5.6)", () => {
  const settings = {
    ...BASE_SETTINGS,
    avoid: [{ kind: "food" as const, value: "회" }],
  };

  it("기피 → 다시 안 갈 곳 → 폐업 3건 → 예산 초과 순으로 첫 규칙 하나에만 센다", () => {
    const all = makeCandidate("x", {
      categoryText: "한식 > 회",
      closedReports: 5,
      priceReport: { medianKRW: 50_000, count: 3 },
    });
    const history = { visits: [], blocked: new Set(["x", "y"]) };
    expect(hardFilterReason(all, settings, history)).toBe("avoid");
    expect(
      hardFilterReason(
        { ...all, id: "y", categoryText: "한식" },
        settings,
        history,
      ),
    ).toBe("blocked");
    expect(
      hardFilterReason(
        { ...all, id: "z", categoryText: "한식" },
        settings,
        history,
      ),
    ).toBe("closed");
    expect(
      hardFilterReason(
        { ...all, id: "z", categoryText: "한식", closedReports: 2 },
        settings,
        history,
      ),
    ).toBe("overBudget");
  });

  it("폐업 제보는 3건부터 뺀다", () => {
    expect(
      hardFilterReason(
        makeCandidate("a", { closedReports: 2 }),
        BASE_SETTINGS,
        EMPTY_HISTORY,
      ),
    ).toBeNull();
    expect(
      hardFilterReason(
        makeCandidate("a", { closedReports: 3 }),
        BASE_SETTINGS,
        EMPTY_HISTORY,
      ),
    ).toBe("closed");
  });

  it("예산 초과는 제보 가격이 있을 때만, 예산과 같으면 통과", () => {
    expect(
      hardFilterReason(
        makeCandidate("a", { category: "ilsik" }),
        { ...BASE_SETTINGS, budgetKRW: 5_000 },
        EMPTY_HISTORY,
      ),
    ).toBeNull();
    expect(
      hardFilterReason(
        makeCandidate("a", { priceReport: { medianKRW: 12_000, count: 1 } }),
        BASE_SETTINGS,
        EMPTY_HISTORY,
      ),
    ).toBeNull();
    expect(
      hardFilterReason(
        makeCandidate("a", { priceReport: { medianKRW: 12_001, count: 1 } }),
        BASE_SETTINGS,
        EMPTY_HISTORY,
      ),
    ).toBe("overBudget");
  });

  it("빠진 수를 규칙별로 센다", () => {
    const cs = [
      makeCandidate("a", { name: "바다횟집" }),
      makeCandidate("b"),
      makeCandidate("c", { closedReports: 3 }),
      makeCandidate("d", { priceReport: { medianKRW: 20_000, count: 2 } }),
      makeCandidate("e"),
    ];
    const r = applyHardFilters(cs, settings, { blocked: new Set(["b"]) }, NOW);
    expect(r.kept.map((c) => c.id)).toEqual(["e"]);
    expect(r.filtered).toEqual({
      avoid: 1,
      blocked: 1,
      offMeal: 0,
      closed: 1,
      closedToday: 0,
      overBudget: 1,
    });
  });
});

describe("AC-REC-1 (필터 단계): 기피로 지정한 식당은 통과 목록에 남지 않는다", () => {
  it("칩, 알레르기, 직접 입력이 섞여도 하나라도 걸리면 뺀다", () => {
    const avoided = [
      makeCandidate("x1", {
        name: "가까운 횟집",
        distanceM: 10,
        thumbs: { up: 50, down: 0 },
      }),
      makeCandidate("x2", { categoryText: "한식 > 냉면" }),
      makeCandidate("x3", { name: "고수 듬뿍 쌀국수", category: "asian" }),
    ];
    const settings = {
      ...BASE_SETTINGS,
      avoid: [
        { kind: "food" as const, value: "회" },
        { kind: "allergy" as const, value: "메밀" },
        { kind: "custom" as const, value: "고수" },
      ],
    };
    const r = applyHardFilters(
      [...avoided, ...manyCandidates(10)],
      settings,
      EMPTY_HISTORY,
      NOW,
    );
    expect(r.kept.map((c) => c.id)).not.toEqual(expect.arrayContaining(["x1"]));
    for (const c of r.kept) expect(c.id.startsWith("x")).toBe(false);
    expect(r.filtered.avoid).toBe(3);
  });
});

describe("본인 기준 필터 (지도 탭 공용, 2026-10-31)", () => {
  it("기피 → 다시 안 갈 곳만 보고 폐업, 예산은 보지 않는다", () => {
    const c = makeCandidate("x", {
      categoryText: "한식 > 회",
      closedReports: 5,
      priceReport: { medianKRW: 50_000, count: 3 },
    });
    const avoid = [{ kind: "food" as const, value: "회" }];
    expect(personalFilterReason(c, avoid, new Set(["x"]))).toBe("avoid");
    expect(personalFilterReason(c, [], new Set(["x"]))).toBe("blocked");
    expect(personalFilterReason(c, [], new Set())).toBeNull();
  });
});

describe("끼니 적합도 하드 필터 (T9.16)", () => {
  const pub = makeCandidate("pub", {
    category: "pub",
    categoryText: "술집 > 호프,요리주점",
  });
  const rice = makeCandidate("rice");
  /** NOW 기준 7일 뒤까지 유효한 요즘 땡겨요 */
  const cravingPub = {
    categories: ["pub" as const],
    until: new Date(NOW.getTime() + 7 * 86_400_000),
  };

  it("점심에는 술집을 빼고 offMeal로 센다", () => {
    const r = applyHardFilters([pub, rice], BASE_SETTINGS, EMPTY_HISTORY, NOW);
    expect(r.kept.map((c) => c.id)).toEqual(["rice"]);
    expect(r.filtered.offMeal).toBe(1);
  });

  it("저녁에는 술집을 남긴다", () => {
    const r = applyHardFilters(
      [pub, rice],
      { ...BASE_SETTINGS, meal: "dinner" },
      EMPTY_HISTORY,
      NOW,
    );
    expect(r.kept.map((c) => c.id)).toEqual(["pub", "rice"]);
    expect(r.filtered.offMeal).toBe(0);
  });

  it("요즘 땡겨요로 술집을 고른 동안은 점심에도 남기고, 기한이 지나면 뺀다", () => {
    const kept = applyHardFilters(
      [pub],
      { ...BASE_SETTINGS, craving: cravingPub },
      EMPTY_HISTORY,
      NOW,
    );
    expect(kept.kept).toHaveLength(1);
    const expired = applyHardFilters(
      [pub],
      {
        ...BASE_SETTINGS,
        craving: { ...cravingPub, until: new Date(NOW.getTime() - 1) },
      },
      EMPTY_HISTORY,
      NOW,
    );
    expect(expired.kept).toHaveLength(0);
  });

  it("기피, 다시 안 갈 곳이 끼니 규칙보다 먼저 걸린다", () => {
    expect(
      hardFilterReason(
        pub,
        BASE_SETTINGS,
        { blocked: new Set(["pub"]) },
        { meal: "lunch", cravings: new Set() },
      ),
    ).toBe("blocked");
  });

  it("끼니 기준을 넘기지 않으면(회식 모드) 술집을 빼지 않는다", () => {
    expect(hardFilterReason(pub, BASE_SETTINGS, EMPTY_HISTORY)).toBeNull();
  });

  it("술집 말고는 끼니로 빼지 않는다", () => {
    for (const c of manyCandidates(12)) {
      expect(isOffMeal(c, "lunch", new Set())).toBe(c.category === "pub");
      expect(isOffMeal(c, "dinner", new Set())).toBe(false);
    }
  });
});

describe("이번 끼니 오늘 쉬어요 (T9.18, D-40)", () => {
  const lunch = { meal: "lunch" as const, cravings: new Set<string>() };

  it("서로 다른 2명이면 그 끼니 추천에서 빼고 closedToday로 센다", () => {
    const r = applyHardFilters(
      [
        makeCandidate("two", { closedToday: 2 }),
        makeCandidate("one", { closedToday: 1 }),
        makeCandidate("none"),
      ],
      BASE_SETTINGS,
      EMPTY_HISTORY,
      NOW,
    );
    expect(r.kept.map((c) => c.id)).toEqual(["one", "none"]);
    expect(r.filtered.closedToday).toBe(1);
  });

  it("폐업 3명이 먼저 걸리고, 회식 모드(끼니 기준 없음)는 빼지 않는다", () => {
    const c = makeCandidate("x", { closedReports: 3, closedToday: 2 });
    expect(hardFilterReason(c, BASE_SETTINGS, EMPTY_HISTORY, lunch)).toBe(
      "closed",
    );
    expect(
      hardFilterReason(
        makeCandidate("y", { closedToday: 5 }),
        BASE_SETTINGS,
        EMPTY_HISTORY,
      ),
    ).toBeNull();
  });
});
