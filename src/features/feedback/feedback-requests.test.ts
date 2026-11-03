import { describe, expect, it, vi } from "vitest";
import { fromKstWallTime } from "@/lib/time";
import type { FeedbackDeps, OpenVisitRow } from "./feedback-requests";

vi.mock("server-only", () => ({}));

const {
  deleteReview,
  markFeedbackPrompted,
  markNotVisited,
  rateVisit,
  removeVisit,
  updateReview,
  updateReviewSchema,
  writeFromDetail,
} = await import("./feedback-requests");

const VISIT = "11111111-1111-4111-8111-111111111111";
const REVIEW = "22222222-2222-4222-8222-222222222222";
const NOW = fromKstWallTime(2026, 11, 4, 12, 30);
const ok = { count: 1, error: null };

function deps(over: Partial<FeedbackDeps> = {}): FeedbackDeps {
  return {
    currentUserId: async () => "user-1",
    now: () => NOW,
    readVisit: async () => ({
      id: VISIT,
      visited_on: "2026-11-03",
      status: "candidate",
    }),
    findVisit: async () => null,
    listOpenVisits: async () => [],
    latestReviewAt: async () => null,
    insertVisit: vi.fn(async () => ({ id: VISIT, error: null })),
    deleteVisit: vi.fn(async () => ok),
    setNotVisited: vi.fn(async () => ok),
    markPrompted: vi.fn(async () => ok),
    insertReview: vi.fn(async () => ({ id: REVIEW, error: null })),
    findReviewIdByVisit: async () => REVIEW,
    updateReview: vi.fn(async () => ok),
    deleteReview: vi.fn(async () => ok),
    ...over,
  };
}

describe("rateVisit (FB-01)", () => {
  it("후기 행을 평가만으로 만든다", async () => {
    const d = deps();
    await expect(
      rateVisit({ visitId: VISIT, rating: "up" }, d),
    ).resolves.toEqual({ ok: true, reviewId: REVIEW, created: true });
    expect(d.insertReview).toHaveBeenCalledWith("user-1", VISIT, {
      rating: "up",
    });
  });
  it("이미 답한 방문이면 평가만 바꾼다", async () => {
    const d = deps({
      insertReview: async () => ({
        id: null,
        error: { code: "23505", message: "duplicate key" },
      }),
    });
    await expect(
      rateVisit({ visitId: VISIT, rating: "down" }, d),
    ).resolves.toEqual({ ok: true, reviewId: REVIEW, created: false });
    expect(d.updateReview).toHaveBeenCalledWith("user-1", REVIEW, {
      rating: "down",
    });
  });
  it.each([
    [
      "reviews_daily_limit_exceeded",
      { ok: false, error: "limit", bucket: "reviews" },
    ],
    ["reviews_visit_too_old", { ok: false, error: "too_old" }],
    ["reviews_visit_not_found", { ok: false, error: "not_found" }],
  ])("DB 오류 %s를 결과로 바꾼다", async (message, expected) => {
    const d = deps({
      insertReview: async () => ({
        id: null,
        error: { code: "23514", message },
      }),
    });
    await expect(
      rateVisit({ visitId: VISIT, rating: "up" }, d),
    ).resolves.toEqual(expected);
  });
  it("비로그인, 잘못된 입력", async () => {
    await expect(
      rateVisit(
        { visitId: VISIT, rating: "up" },
        deps({ currentUserId: async () => null }),
      ),
    ).resolves.toEqual({ ok: false, error: "unauthenticated" });
    await expect(
      rateVisit({ visitId: VISIT, rating: "meh" }, deps()),
    ).resolves.toEqual({ ok: false, error: "invalid" });
    await expect(
      rateVisit({ visitId: VISIT, rating: "up", lat: 37.5 }, deps()),
    ).resolves.toEqual({ ok: false, error: "invalid" });
  });
});

describe("markNotVisited (FB-05)", () => {
  it("답 없는 방문을 not_visited로", async () => {
    const d = deps();
    await expect(markNotVisited({ visitId: VISIT }, d)).resolves.toEqual({
      ok: true,
    });
    expect(d.setNotVisited).toHaveBeenCalledWith("user-1", VISIT);
  });
  it("14일이 지나면 too_old", async () => {
    const d = deps({
      readVisit: async () => ({
        id: VISIT,
        visited_on: "2026-10-20",
        status: "candidate",
      }),
    });
    await expect(markNotVisited({ visitId: VISIT }, d)).resolves.toEqual({
      ok: false,
      error: "too_old",
    });
    expect(d.setNotVisited).not.toHaveBeenCalled();
  });
  it("이미 안 갔어요면 그대로 성공, 다녀옴이면 duplicate, 없으면 not_found", async () => {
    const at = (status: "visited" | "not_visited") =>
      deps({
        readVisit: async () => ({
          id: VISIT,
          visited_on: "2026-11-03",
          status,
        }),
      });
    await expect(
      markNotVisited({ visitId: VISIT }, at("not_visited")),
    ).resolves.toEqual({ ok: true });
    await expect(
      markNotVisited({ visitId: VISIT }, at("visited")),
    ).resolves.toEqual({ ok: false, error: "duplicate" });
    await expect(
      markNotVisited({ visitId: VISIT }, deps({ readVisit: async () => null })),
    ).resolves.toEqual({ ok: false, error: "not_found" });
  });
});

describe("markFeedbackPrompted (FB-04)", () => {
  it("물은 시각을 기록한다", async () => {
    const d = deps();
    await expect(markFeedbackPrompted({ visitId: VISIT }, d)).resolves.toEqual({
      ok: true,
    });
    expect(d.markPrompted).toHaveBeenCalledWith("user-1", VISIT);
  });
});

describe("updateReview (FB-02, FB-03, FB-07, MOD-04)", () => {
  it("보낸 칸만 바꾸고 null은 지운다", async () => {
    const d = deps();
    await updateReview(
      {
        reviewId: REVIEW,
        priceKrw: null,
        tags: ["solo_ok", "quiet"],
        body: "  국물이 진해요 ",
      },
      d,
    );
    expect(d.updateReview).toHaveBeenCalledWith("user-1", REVIEW, {
      price_krw: null,
      tags: ["solo_ok", "quiet"],
      body: "국물이 진해요",
    });
  });
  it("빈 글은 null(글 없음)", async () => {
    const d = deps();
    await updateReview({ reviewId: REVIEW, body: "   " }, d);
    expect(d.updateReview).toHaveBeenCalledWith("user-1", REVIEW, {
      body: null,
    });
  });
  it("금칙어면 banned, 저장하지 않는다", async () => {
    const d = deps();
    await expect(
      updateReview({ reviewId: REVIEW, body: "사장 시 발" }, d),
    ).resolves.toEqual({ ok: false, error: "banned" });
    await expect(
      updateReview({ reviewId: REVIEW, body: "문의 010-1234-5678" }, d),
    ).resolves.toEqual({ ok: false, error: "banned" });
    expect(d.updateReview).not.toHaveBeenCalled();
  });
  it("행이 없으면 not_found", async () => {
    await expect(
      updateReview(
        { reviewId: REVIEW, isPublic: false },
        deps({ updateReview: async () => ({ count: 0, error: null }) }),
      ),
    ).resolves.toEqual({ ok: false, error: "not_found" });
  });
});

describe("updateReviewSchema", () => {
  const base = { reviewId: REVIEW };
  it.each([
    ["가격 하한 미만", { priceKrw: 999 }],
    ["가격 상한 초과", { priceKrw: 100_001 }],
    ["소수 가격", { priceKrw: 9000.5 }],
    ["모르는 태그", { tags: ["cheap"] }],
    ["겹친 태그", { tags: ["quiet", "quiet"] }],
    ["101자 글", { body: "가".repeat(101) }],
    ["줄바꿈 글", { body: "첫 줄\n둘째 줄" }],
    ["바꿀 칸 없음", {}],
    ["서버 값(place_id)", { place_id: "1" }],
    ["숨김 값", { hidden_at: "2026-11-01" }],
  ])("%s는 거절", (_label, extra) => {
    expect(updateReviewSchema.safeParse({ ...base, ...extra }).success).toBe(
      false,
    );
  });
  it.each([
    ["가격 경계", { priceKrw: 1000 }],
    ["가격 경계 상한", { priceKrw: 100_000 }],
    [
      "태그 8개",
      {
        tags: [
          "solo_ok",
          "quick_15",
          "short_wait",
          "private_room",
          "group_seats",
          "good_value",
          "big_portion",
          "quiet",
        ],
      },
    ],
    ["100자 글", { body: "가".repeat(100) }],
    ["공개 여부", { isPublic: false }],
  ])("%s는 통과", (_label, extra) => {
    expect(updateReviewSchema.safeParse({ ...base, ...extra }).success).toBe(
      true,
    );
  });
});

describe("deleteReview (FB-07)", () => {
  it("내 후기를 지운다", async () => {
    const d = deps();
    await expect(deleteReview({ reviewId: REVIEW }, d)).resolves.toEqual({
      ok: true,
    });
  });
});

describe("removeVisit (HIS-01 방문 기록 삭제)", () => {
  it("세션 사용자의 방문만 지운다", async () => {
    const d = deps();
    await expect(removeVisit({ visitId: VISIT }, d)).resolves.toEqual({
      ok: true,
    });
    expect(d.deleteVisit).toHaveBeenCalledWith("user-1", VISIT);
  });
  it("지운 행이 없으면(남의 방문, 이미 지움) not_found", async () => {
    const d = deps({
      deleteVisit: vi.fn(async () => ({ count: 0, error: null })),
    });
    await expect(removeVisit({ visitId: VISIT }, d)).resolves.toEqual({
      ok: false,
      error: "not_found",
    });
  });
  it("로그인하지 않았거나 id가 uuid가 아니면 지우지 않는다", async () => {
    const out = deps({ currentUserId: async () => null });
    await expect(removeVisit({ visitId: VISIT }, out)).resolves.toMatchObject({
      ok: false,
      error: "unauthenticated",
    });
    const bad = deps();
    await expect(removeVisit({ visitId: "1" }, bad)).resolves.toMatchObject({
      ok: false,
    });
    expect(out.deleteVisit).not.toHaveBeenCalled();
    expect(bad.deleteVisit).not.toHaveBeenCalled();
  });
});

describe("writeFromDetail (FB-06)", () => {
  const input = {
    placeId: "123456",
    placeUrl: "https://place.map.kakao.com/123456",
    rating: "up",
    priceKrw: 9000,
    body: "빨리 나와요",
  } as const;
  it("오늘 이 끼니 방문(source detail)을 만들고 후기를 붙인다", async () => {
    const d = deps();
    await expect(writeFromDetail(input, d)).resolves.toEqual({
      ok: true,
      reviewId: REVIEW,
      visitId: VISIT,
    });
    expect(d.insertVisit).toHaveBeenCalledWith("user-1", {
      place_id: "123456",
      place_url: "https://place.map.kakao.com/123456",
      meal: "lunch",
      source: "detail",
    });
    expect(d.insertReview).toHaveBeenCalledWith("user-1", VISIT, {
      rating: "up",
      price_krw: 9000,
      body: "빨리 나와요",
    });
  });
  it("이미 오늘 방문이 있으면 그 방문에 붙인다", async () => {
    const d = deps({
      insertVisit: vi.fn(async () => ({
        id: null,
        error: { code: "23505", message: "visits_unique_per_meal" },
      })),
      findVisit: async () => ({ id: VISIT, hasReview: false }),
    });
    await expect(writeFromDetail(input, d)).resolves.toMatchObject({
      ok: true,
    });
  });
  it("그 방문에 후기가 있으면 duplicate", async () => {
    const d = deps({
      insertVisit: vi.fn(async () => ({
        id: null,
        error: { code: "23505", message: "dup" },
      })),
      findVisit: async () => ({ id: VISIT, hasReview: true }),
    });
    await expect(writeFromDetail(input, d)).resolves.toEqual({
      ok: false,
      error: "duplicate",
    });
  });
  it("후기 저장이 막히면 방금 만든 방문을 지운다", async () => {
    const d = deps({
      insertReview: async () => ({
        id: null,
        error: { code: "23514", message: "reviews_daily_limit_exceeded" },
      }),
    });
    await expect(writeFromDetail(input, d)).resolves.toEqual({
      ok: false,
      error: "limit",
      bucket: "reviews",
    });
    expect(d.deleteVisit).toHaveBeenCalledWith("user-1", VISIT);
  });
  describe("답 없는 방문 후보가 있으면 그 방문을 평가한다 (2026-11-01)", () => {
    const OPEN = "33333333-3333-4333-8333-333333333333";
    const open = (over: Partial<OpenVisitRow> = {}): OpenVisitRow => ({
      id: OPEN,
      status: "candidate",
      visitedOn: "2026-11-03",
      createdAt: "2026-11-03T03:00:00Z",
      review: null,
      ...over,
    });
    it("마지막 후기 뒤의 길찾기 후보에 붙이고 새 방문은 만들지 않는다", async () => {
      const d = deps({
        listOpenVisits: async () => [open()],
        latestReviewAt: async () => "2026-10-28T04:00:00Z",
      });
      await expect(writeFromDetail(input, d)).resolves.toEqual({
        ok: true,
        reviewId: REVIEW,
        visitId: OPEN,
      });
      expect(d.insertVisit).not.toHaveBeenCalled();
      expect(d.insertReview).toHaveBeenCalledWith(
        "user-1",
        OPEN,
        expect.objectContaining({ rating: "up", price_krw: 9000 }),
      );
    });
    it("마지막 후기보다 먼저 생긴 후보, 14일 지난 후보는 고르지 않는다", async () => {
      const d = deps({
        listOpenVisits: async () => [
          open({ createdAt: "2026-10-27T03:00:00Z" }),
          open({
            id: VISIT,
            visitedOn: "2026-10-01",
            createdAt: "2026-10-01T03:00:00Z",
          }),
        ],
        latestReviewAt: async () => "2026-10-28T04:00:00Z",
      });
      await writeFromDetail(input, d);
      expect(d.insertVisit).toHaveBeenCalled();
    });
    it("읽기에 실패하면 원래 흐름(오늘 방문)으로 간다", async () => {
      const d = deps({
        listOpenVisits: async () => {
          throw new Error("load");
        },
      });
      await expect(writeFromDetail(input, d)).resolves.toMatchObject({
        ok: true,
      });
      expect(d.insertVisit).toHaveBeenCalled();
    });
    it("후보 평가가 막히면 그 오류를 돌려주고 방문은 지우지 않는다", async () => {
      const d = deps({
        listOpenVisits: async () => [open()],
        insertReview: async () => ({
          id: null,
          error: { code: "23514", message: "reviews_daily_limit_exceeded" },
        }),
      });
      await expect(writeFromDetail(input, d)).resolves.toMatchObject({
        ok: false,
        error: "limit",
      });
      expect(d.deleteVisit).not.toHaveBeenCalled();
    });
  });
  it("평가 없이는 쓸 수 없다(D-11 안건 9), 장소명은 받지 않는다", async () => {
    const noRating: Record<string, unknown> = { ...input };
    delete noRating.rating;
    await expect(writeFromDetail(noRating, deps())).resolves.toEqual({
      ok: false,
      error: "invalid",
    });
    await expect(
      writeFromDetail({ ...input, name: "정담 국밥" }, deps()),
    ).resolves.toEqual({ ok: false, error: "invalid" });
  });
});
