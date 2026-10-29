import { describe, expect, it } from "vitest";

import { CATEGORY_SLUGS } from "@/features/place/categories";

import {
  DESIGN_STATES,
  MOCK_HOME_ALL_SETS,
  MOCK_HOME_BADGE_OVERFLOW,
  MOCK_HOME_EMPTY,
  MOCK_HOME_TODAY,
  MOCK_PLACES,
  MOCK_POLL,
  parseDesignState,
} from "./index";

const FORBIDDEN = /[—–―·・‧]/;

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === "object")
    Object.values(value).forEach((v) => collectStrings(v, out));
  return out;
}

describe("MOCK_PLACES", () => {
  it("12곳이고 12개 카테고리를 모두 덮는다", () => {
    expect(MOCK_PLACES).toHaveLength(12);
    const cats = new Set(MOCK_PLACES.map((p) => p.category));
    for (const slug of CATEGORY_SLUGS) expect(cats.has(slug)).toBe(true);
  });

  it("id가 겹치지 않는다", () => {
    expect(new Set(MOCK_PLACES.map((p) => p.id)).size).toBe(12);
  });

  it.each(MOCK_PLACES.map((p) => [p.name, p] as const))(
    "%s: 필드 규칙을 지킨다",
    (_name, p) => {
      expect(Number.isInteger(p.walkMinutes)).toBe(true);
      expect(p.walkMinutes).toBeGreaterThanOrEqual(2);
      expect(p.walkMinutes).toBeLessThanOrEqual(15);
      expect(p.tags.length).toBeLessThanOrEqual(2);
      expect(p.statusBadges.length).toBeLessThanOrEqual(2);
      // 후기 3건 미만이면 👍 null (콜드 스타트)
      expect(p.thumbsUpRate === null).toBe(p.reviewCount < 3);
      // 추정 가격이면 추정 배지, 제보 수 0
      const badges: readonly string[] = p.statusBadges;
      expect(badges.includes("estimate")).toBe(p.priceSource === "estimate");
      if (p.priceSource === "estimate") expect(p.priceReportCount).toBe(0);
      expect(badges.includes("deal")).toBe("deal" in p);
      expect(badges.includes("waiting")).toBe("waiting" in p);
      expect(p.menu.length).toBeGreaterThanOrEqual(2);
      expect(p.menu.length).toBeLessThanOrEqual(3);
      expect(p.phone).toMatch(/^02-0000-\d{4}$/);
    },
  );

  it("화면 문구에 금지 문자(대시, 중간점)가 없다", () => {
    const strings = collectStrings([MOCK_PLACES, MOCK_POLL]);
    expect(strings.filter((s) => FORBIDDEN.test(s))).toEqual([]);
  });
});

describe("홈 시나리오", () => {
  it("각 세트는 서로 다른 카테고리 3장이다", () => {
    for (const set of MOCK_HOME_ALL_SETS) {
      expect(new Set(set.map((p) => p.category)).size).toBe(3);
    }
  });

  it("오늘 세트에 배지 2개 카드, 콜드 스타트 카드, 할인 카드가 있다", () => {
    expect(MOCK_HOME_TODAY.some((p) => p.statusBadges.length === 2)).toBe(true);
    expect(MOCK_HOME_TODAY.some((p) => p.thumbsUpRate === null)).toBe(true);
    expect(
      MOCK_HOME_TODAY.some((p) =>
        (p.statusBadges as readonly string[]).includes("deal"),
      ),
    ).toBe(true);
  });

  it("홈 카드는 허용 도보 10분 안이다", () => {
    for (const set of MOCK_HOME_ALL_SETS)
      for (const p of set) expect(p.walkMinutes).toBeLessThanOrEqual(10);
  });

  it("배지 넘침 세트: 서로 다른 카테고리 3장, 후보 배지 3개 이상, 필드 규칙 유지", () => {
    const set = MOCK_HOME_BADGE_OVERFLOW;
    expect(new Set(set.map((p) => p.category)).size).toBe(3);
    for (const p of set) {
      expect(p.statusBadges.length).toBeGreaterThanOrEqual(3);
      expect(new Set(p.statusBadges).size).toBe(p.statusBadges.length);
      expect(p.walkMinutes).toBeLessThanOrEqual(10);
      const badges: readonly string[] = p.statusBadges;
      expect(badges.includes("estimate")).toBe(p.priceSource === "estimate");
      expect(badges.includes("deal")).toBe("deal" in p);
      expect(badges.includes("waiting")).toBe("waiting" in p);
    }
    // 4종이 모두 겹치는 카드가 하나 이상
    expect(set.some((p) => p.statusBadges.length === 4)).toBe(true);
    expect(collectStrings(set).filter((s) => FORBIDDEN.test(s))).toEqual([]);
  });

  it("빈 상태는 0곳이다", () => {
    expect(MOCK_HOME_EMPTY.picks).toHaveLength(0);
  });
});

describe("MOCK_POLL", () => {
  it("후보 4곳, 득표 합은 참여자 수 이하", () => {
    expect(MOCK_POLL.candidates).toHaveLength(4);
    const total = MOCK_POLL.candidates.reduce((s, c) => s + c.votes, 0);
    expect(total).toBeLessThanOrEqual(MOCK_POLL.participantCount);
  });

  it("후보는 모두 목업 식당이고 내 투표는 후보 중 하나", () => {
    const ids = new Set<string>(MOCK_PLACES.map((p) => p.id));
    for (const c of MOCK_POLL.candidates) expect(ids.has(c.placeId)).toBe(true);
    expect(MOCK_POLL.candidates.map((c) => c.placeId)).toContain(
      MOCK_POLL.myVotePlaceId,
    );
  });

  it("기피 경고 후보는 정확히 1곳", () => {
    expect(MOCK_POLL.candidates.filter((c) => c.avoidWarning)).toHaveLength(1);
  });

  it("마감 시각은 KST 11:50, 시연 기준 시각보다 뒤", () => {
    const deadline = new Date(MOCK_POLL.deadlineAt);
    expect(deadline.toISOString()).toBe("2026-10-28T02:50:00.000Z");
    expect(deadline.getTime()).toBeGreaterThan(
      new Date(MOCK_POLL.mockNow).getTime(),
    );
  });
});

describe("parseDesignState", () => {
  it("없으면 ready", () => {
    expect(parseDesignState(undefined)).toBe("ready");
    expect(parseDesignState({})).toBe("ready");
    expect(parseDesignState(new URLSearchParams())).toBe("ready");
  });

  it.each(DESIGN_STATES)("%s를 해석한다", (state) => {
    expect(parseDesignState({ state })).toBe(state);
    expect(parseDesignState(new URLSearchParams({ state }))).toBe(state);
  });

  it("대소문자와 공백을 정리하고, 배열이면 첫 값", () => {
    expect(parseDesignState({ state: " Offline " })).toBe("offline");
    expect(parseDesignState({ state: ["error", "empty"] })).toBe("error");
  });

  it("모르는 값은 ready", () => {
    expect(parseDesignState({ state: "broken" })).toBe("ready");
  });
});
