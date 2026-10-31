import { describe, expect, it } from "vitest";
import { fromKstWallTime } from "@/lib/time";
import { waitLevelFromDb, waitLevelToDb } from "@/features/report/labels";
import { toDailyLimits, toMyReview, toMyVisit } from "@/features/feedback/my-records";
import {
  monthDayLabel,
  parsePlaceDealRow,
  parsePlaceReviewRow,
  parsePlaceStatsRow,
  toPlaceDetailStats,
  type PlaceStatsRow,
} from "./place-stats-model";

const NOW = fromKstWallTime(2026, 11, 4, 12);

const statsRow: PlaceStatsRow = {
  place_id: "123",
  price_count: 3,
  price_median: 9000,
  price_points: [8000, 9000, 10000],
  thumbs_up: 4,
  thumbs_down: 1,
  top_tags: [
    { tag: "solo_ok", count: 3 },
    { tag: "unknown", count: 9 },
    { tag: "quiet", count: 1 },
  ],
  closed_reports: 1,
  closed: false,
  wait_level: "now",
  wait_reported_at: "2026-11-04T02:50:00Z",
  wait_minutes_ago: 10,
  deal_count: 1,
};

describe("parsePlaceStatsRow", () => {
  it("DB 값을 화면 값으로(웨이팅 now → walkIn, 모르는 태그 버림)", () => {
    expect(parsePlaceStatsRow(statsRow)).toEqual({
      placeId: "123",
      priceCount: 3,
      priceMedian: 9000,
      pricePoints: [8000, 9000, 10000],
      thumbsUp: 4,
      thumbsDown: 1,
      topTags: [
        { tag: "solo_ok", count: 3 },
        { tag: "quiet", count: 1 },
      ],
      closedReports: 1,
      closed: false,
      wait: {
        level: "walkIn",
        reportedAt: "2026-11-04T02:50:00Z",
        minutesAgo: 10,
      },
      dealCount: 1,
    });
  });
  it("null 열(집계 없음)을 0과 빈 값으로", () => {
    const s = parsePlaceStatsRow({
      ...statsRow,
      price_median: null,
      price_points: null,
      top_tags: null,
      wait_level: null,
      wait_reported_at: null,
      wait_minutes_ago: null,
    });
    expect(s).toMatchObject({ priceMedian: null, pricePoints: [], topTags: [], wait: null });
  });
});

describe("웨이팅 단계 변환", () => {
  it("DB now/short/long ↔ 배지 walkIn/short/long", () => {
    expect(waitLevelFromDb("now")).toBe("walkIn");
    expect(waitLevelFromDb("long")).toBe("long");
    expect(waitLevelFromDb("odd")).toBeNull();
    expect(waitLevelToDb("walkIn")).toBe("now");
  });
});

describe("toPlaceDetailStats", () => {
  const stats = parsePlaceStatsRow(statsRow);
  const review = (over: Record<string, unknown> = {}) =>
    parsePlaceReviewRow({
      id: "r1",
      nickname: "점심러",
      avatar_url: null,
      visit_month: 10,
      rating: "up",
      price_krw: 9000,
      tags: ["solo_ok"],
      body: "빨리 나와요",
      is_mine: false,
      reported_by_me: false,
      ...over,
    });
  it("집계, 공개 후기, 할인, 내 방문을 상세 모델로", () => {
    const deal = parsePlaceDealRow({
      id: "d1",
      source: "user",
      type: "lunch_special",
      content: "정식 9천 원",
      days: 0,
      slots: [],
      starts_on: "2026-11-02",
      ends_on: "2026-11-09",
      created_at: "2026-11-02T03:00:00Z",
      still_count: 2,
      ended_count: 0,
      my_answer: null,
      is_mine: false,
    });
    const r1 = review();
    const mine = review({ id: "r2", is_mine: true });
    const reported = review({ id: "r3", reported_by_me: true });
    if (!r1 || !mine || !reported || !deal) throw new Error("fixture");
    const d = toPlaceDetailStats({
      stats,
      reviews: { status: "ok", reviews: [r1, mine, reported], hasMore: false },
      deals: [deal],
      myVisits: [
        { visitedOn: "2026-10-22", createdAt: "2026-10-22T03:00:00Z", status: "visited", review: { id: "x", rating: "up" } },
        { visitedOn: "2026-11-03", createdAt: "2026-11-03T03:00:00Z", status: "not_visited", review: null },
      ],
      now: NOW,
    });
    expect(d.priceReports).toEqual([8000, 9000, 10000]);
    expect(d.thumbs).toEqual({ up: 4, down: 1 });
    expect(d.tags).toEqual([
      { label: "혼밥 OK", count: 3 },
      { label: "조용함", count: 1 },
    ]);
    expect(d.reviews?.map((r) => r.id)).toEqual(["r1"]);
    expect(d.reviewTotal).toBe(1);
    expect(d.waiting).toEqual({ level: "walkIn", minutesAgo: 10 });
    expect(d.deal).toEqual({ title: "정식 9천 원", daysAgo: 2, untilLabel: "11월 9일" });
    expect(d.myVisit).toEqual({ dateLabel: "10월 22일", rating: "up" });
  });
  it("후기를 못 불러오면 null, 비로그인은 빈 목록", () => {
    expect(toPlaceDetailStats({ stats, reviews: null, now: NOW }).reviews).toBeNull();
    expect(
      toPlaceDetailStats({
        stats,
        reviews: { status: "login_required", ratingCount: 5 },
        now: NOW,
      }).reviews,
    ).toEqual([]);
  });
  it("집계가 없으면 빈 상세", () => {
    expect(toPlaceDetailStats({ stats: null, now: NOW })).toEqual({
      priceReports: [],
      thumbs: { up: 0, down: 0 },
      tags: [],
      reviews: [],
      reviewTotal: 0,
      waiting: null,
      deal: null,
      myVisit: null,
    });
  });
  it("비공개 글(body null) 행은 공개 후기로 만들지 않는다(AC-FB-2 방어)", () => {
    expect(review({ body: null })).toBeNull();
  });
  it("monthDayLabel", () => {
    expect(monthDayLabel("2026-01-05")).toBe("1월 5일");
  });
});

describe("내 기록 변환", () => {
  it("toMyVisit", () => {
    expect(
      toMyVisit({
        id: "v1",
        place_id: "123",
        place_url: null,
        meal: "lunch",
        source: "detail",
        visited_on: "2026-11-03",
        created_at: "2026-11-03T03:00:00Z",
        status: "visited",
        feedback_requested_at: null,
        reviews: { id: "r1", rating: "down" },
      }),
    ).toMatchObject({ source: "detail", review: { id: "r1", rating: "down" } });
    expect(
      toMyVisit({
        id: "v1",
        place_id: "123",
        place_url: null,
        meal: "brunch",
        source: "rec",
        visited_on: "2026-11-03",
        created_at: "x",
        status: "candidate",
        feedback_requested_at: null,
        reviews: null,
      }),
    ).toBeNull();
  });
  it("toMyReview", () => {
    expect(
      toMyReview({
        id: "r1",
        visit_id: "v1",
        place_id: "123",
        rating: "up",
        price_krw: null,
        tags: ["quiet", "bad"],
        body: "비공개 글",
        is_public: false,
        hidden_at: null,
        created_at: "a",
        updated_at: "b",
        visits: { place_url: null, visited_on: "2026-11-03", meal: "dinner" },
      }),
    ).toMatchObject({ tags: ["quiet"], isPublic: false, hidden: false, meal: "dinner" });
  });
  it("toDailyLimits", () => {
    expect(
      toDailyLimits([
        { bucket: "reviews", used: 2, limit_count: 20, remaining: 18 },
        { bucket: "reports", used: 0, limit_count: 30, remaining: 30 },
        { bucket: "deals", used: 10, limit_count: 10, remaining: 0 },
      ]),
    ).toEqual({
      reviews: { used: 2, limit: 20, remaining: 18 },
      reports: { used: 0, limit: 30, remaining: 30 },
      deals: { used: 10, limit: 10, remaining: 0 },
    });
    expect(toDailyLimits([])).toBeNull();
  });
});
