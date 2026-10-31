import { describe, expect, it, vi } from "vitest";
import type { MyReview } from "./my-records";
import {
  canSubmit,
  clampPrice,
  draftFromReview,
  EMPTY_DRAFT,
  feedbackSubmittedProps,
  limitBody,
  pricePresets,
  shortWon,
  stepPrice,
  submitReview,
  withRetry,
  type SubmitDeps,
} from "./review-draft";

const review: MyReview = {
  id: "11111111-1111-4111-8111-111111111111",
  visitId: "22222222-2222-4222-8222-222222222222",
  placeId: "123",
  placeUrl: null,
  visitedOn: "2026-10-30",
  meal: "lunch",
  rating: "up",
  priceKrw: 9000,
  tags: ["solo_ok"],
  body: "빨리 나옵니다",
  isPublic: false,
  hidden: false,
  createdAt: "2026-10-30T04:00:00Z",
  updatedAt: "2026-10-30T04:00:00Z",
};

function deps(over: Partial<SubmitDeps> = {}): SubmitDeps {
  return {
    rateVisit: vi.fn(async () => ({
      ok: true as const,
      reviewId: "r-new",
      created: true,
    })),
    updateReview: vi.fn(async () => ({ ok: true as const })),
    writeFromDetail: vi.fn(async () => ({
      ok: true as const,
      reviewId: "r-w",
      visitId: "v-w",
    })),
    ...over,
  };
}

describe("가격 (D-11 안건 4)", () => {
  it("칩은 추정가를 천 원 단위로 맞춘 -1천, 추정, +1천", () => {
    expect(pricePresets(9_000)).toEqual([8_000, 9_000, 10_000]);
    expect(pricePresets(9_400)).toEqual([8_000, 9_000, 10_000]);
    expect(pricePresets(1_200)).toEqual([1_000, 2_000]);
  });
  it("스테퍼는 500원 단계, 고르지 않았으면 추정가에서 시작", () => {
    expect(stepPrice(null, 9_000, 1)).toBe(9_500);
    expect(stepPrice(null, 9_000, -1)).toBe(8_500);
    expect(stepPrice(9_500, 9_000, 1)).toBe(10_000);
  });
  it("서버 범위 1천~10만 원 밖으로 나가지 않는다", () => {
    expect(stepPrice(1_000, 9_000, -1)).toBe(1_000);
    expect(stepPrice(100_000, 9_000, 1)).toBe(100_000);
    expect(clampPrice(120)).toBe(1_000);
  });
  it("짧은 가격 이름", () => {
    expect(shortWon(9_000)).toBe("9천 원");
    expect(shortWon(10_000)).toBe("1만 원");
    expect(shortWon(11_000)).toBe("1만 1천 원");
    expect(shortWon(9_500)).toBe("9,500원");
  });
});

describe("한 줄 후기", () => {
  it("줄바꿈을 빼고 100자에서 자른다", () => {
    expect(limitBody("a\nb")).toBe("a b");
    expect([...limitBody("가".repeat(130))]).toHaveLength(100);
  });
});

describe("canSubmit", () => {
  it("상세 쓰기는 한 탭 답 필수 (D-11 안건 9)", () => {
    const write = { kind: "write", placeId: "1", placeUrl: null } as const;
    expect(canSubmit(write, EMPTY_DRAFT)).toBe(false);
    expect(canSubmit(write, { ...EMPTY_DRAFT, rating: "down" })).toBe(true);
  });
  it("홈 세부는 하나라도 남겨야 한다", () => {
    const details = { kind: "details", reviewId: "r", rating: "up" } as const;
    expect(canSubmit(details, EMPTY_DRAFT)).toBe(false);
    expect(canSubmit(details, { ...EMPTY_DRAFT, tags: ["quiet"] })).toBe(true);
  });
});

describe("submitReview", () => {
  it("홈 세부: 내 후기 수정으로 보내고 빈 글은 null", async () => {
    const d = deps();
    const r = await submitReview(
      { kind: "details", reviewId: "r1", rating: "down" },
      { ...EMPTY_DRAFT, priceKrw: 8_500, body: "  " , tags: ["quiet"]},
      d,
    );
    expect(r).toEqual({ ok: true, reviewId: "r1", rating: "down" });
    expect(d.updateReview).toHaveBeenCalledWith({
      reviewId: "r1",
      priceKrw: 8_500,
      tags: ["quiet"],
      body: null,
      isPublic: true,
    });
  });

  it("수정: 모든 칸을 보낸다", async () => {
    const d = deps();
    await submitReview(
      { kind: "edit", reviewId: review.id, review },
      draftFromReview(review),
      d,
    );
    expect(d.updateReview).toHaveBeenCalledWith({
      reviewId: review.id,
      rating: "up",
      priceKrw: 9000,
      tags: ["solo_ok"],
      body: "빨리 나옵니다",
      isPublic: false,
    });
  });

  it("상세 쓰기: 방문과 후기를 함께", async () => {
    const d = deps();
    const r = await submitReview(
      { kind: "write", placeId: "123", placeUrl: null },
      { ...EMPTY_DRAFT, rating: "up" },
      d,
    );
    expect(r).toEqual({ ok: true, reviewId: "r-w", rating: "up" });
    expect(d.writeFromDetail).toHaveBeenCalledWith(
      expect.objectContaining({ placeId: "123", rating: "up" }),
    );
  });

  it("접힌 줄: 한 탭 답만이면 세부를 보내지 않는다", async () => {
    const d = deps();
    await submitReview(
      { kind: "rate", visitId: "v1" },
      { ...EMPTY_DRAFT, rating: "up" },
      d,
    );
    expect(d.rateVisit).toHaveBeenCalledOnce();
    expect(d.updateReview).not.toHaveBeenCalled();
  });

  it("접힌 줄: 세부가 실패하면 저장된 후기 id를 돌려주고, 다시 보내기는 세부만", async () => {
    const failing = deps({
      updateReview: vi.fn(async () => ({ ok: false as const, error: "banned" as const })),
    });
    const draft = { ...EMPTY_DRAFT, rating: "up" as const, body: "나쁜 말" };
    const r = await submitReview({ kind: "rate", visitId: "v1" }, draft, failing);
    expect(r).toMatchObject({ ok: false, error: "banned", savedReviewId: "r-new" });

    const again = deps();
    await submitReview({ kind: "rate", visitId: "v1" }, draft, again, "r-new");
    expect(again.rateVisit).not.toHaveBeenCalled();
    expect(again.updateReview).toHaveBeenCalledWith(
      expect.objectContaining({ reviewId: "r-new" }),
    );
  });
});

describe("withRetry (PRD 12장)", () => {
  it("저장 실패는 한 번 더 보낸다", async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: "save" })
      .mockResolvedValueOnce({ ok: true });
    await expect(withRetry(fn)).resolves.toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(2);
  });
  it("금칙어, 한도는 다시 보내지 않는다", async () => {
    const fn = vi.fn().mockResolvedValue({ ok: false, error: "banned" });
    await withRetry(fn);
    expect(fn).toHaveBeenCalledOnce();
  });
  it("예외(네트워크)는 저장 실패로 바꾼다", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(withRetry(fn)).resolves.toEqual({ ok: false, error: "save" });
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("feedback_submitted 속성 (PRD 10.2)", () => {
  it("한 탭 답은 세부 없음", () => {
    expect(feedbackSubmittedProps("not_visited", null)).toEqual({
      rating: "not_visited",
      has_price: false,
      tag_count: 0,
      has_review: false,
    });
  });
  it("세부가 있으면 개수만(글 내용은 보내지 않는다)", () => {
    expect(
      feedbackSubmittedProps("up", {
        ...EMPTY_DRAFT,
        priceKrw: 9000,
        tags: ["quiet", "solo_ok"],
        body: "맛있어요",
      }),
    ).toEqual({ rating: "up", has_price: true, tag_count: 2, has_review: true });
  });
});
