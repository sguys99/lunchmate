import { describe, expect, it } from "vitest";
import {
  MOCK_TODAY,
  MOCK_VISITS,
  getMeData,
  groupByWeek,
  monthGrid,
  monthStats,
  weekStart,
} from "./mock";
import { parseMeParams } from "./params";

describe("parseMeParams", () => {
  it("기본값", () => {
    expect(parseMeParams({})).toEqual({
      state: "ready",
      authOff: false,
      namesFail: false,
      view: "main",
      more: false,
      day: null,
    });
  });

  it("쿼리를 읽고 모르는 값은 기본값으로", () => {
    expect(
      parseMeParams({
        state: "offline",
        auth: "OFF",
        names: "fail",
        view: "Reviews",
        more: "on",
        day: "24",
      }),
    ).toMatchObject({
      state: "offline",
      authOff: true,
      namesFail: true,
      view: "reviews",
      more: true,
      day: 24,
    });
    expect(parseMeParams({ view: "nope", day: "40" })).toMatchObject({
      view: "main",
      day: null,
    });
  });
});

describe("기록 묶음", () => {
  it("월요일 시작 주로 묶고 이번 주, 지난주를 표시한다", () => {
    expect(weekStart(MOCK_TODAY)).toEqual({ y: 2026, m: 10, d: 26 });
    const groups = groupByWeek(MOCK_VISITS, MOCK_TODAY);
    expect(groups[0]?.kind).toBe("this");
    expect(groups[1]?.kind).toBe("last");
    expect(groups.slice(2).every((g) => g.kind === "older")).toBe(true);
    expect(groups.reduce((n, g) => n + g.visits.length, 0)).toBe(
      MOCK_VISITS.length,
    );
  });

  it("2026년 10월 달력은 목요일에 시작해 7칸 배수다", () => {
    const cells = monthGrid(2026, 10);
    expect(cells.slice(0, 5)).toEqual([null, null, null, null, 1]);
    expect(cells.length % 7).toBe(0);
    expect(cells.filter((c) => c !== null)).toHaveLength(31);
  });

  it("월 요약: 후보와 안 갔어요는 세지 않고, 평가 3개 미만이면 비율을 숨긴다", () => {
    const s = monthStats(MOCK_VISITS, 2026, 10);
    expect(s.visited).toBe(14);
    expect(s.upRate).toBe(86);
    expect(s.topCategories[0]).toEqual({ slug: "hansik", count: 3 });
    expect(monthStats(MOCK_VISITS.slice(1, 3), 2026, 10).upRate).toBeNull();
  });

  it("이름 해석 실패면 카카오 값(이름, 카테고리)만 지우고 place_url은 남긴다", () => {
    const d = getMeData(true);
    expect(
      d.visits.every((x) => x.place.name === null && x.place.category === null),
    ).toBe(true);
    expect(
      d.favorites.every((x) =>
        x.place.placeUrl.startsWith("https://place.map.kakao.com/"),
      ),
    ).toBe(true);
  });
});
