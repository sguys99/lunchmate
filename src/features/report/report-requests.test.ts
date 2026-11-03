import { describe, expect, it, vi } from "vitest";
import { fromKstWallTime } from "@/lib/time";
import type { ReportDeps } from "./report-requests";

vi.mock("server-only", () => ({}));

const {
  checkDeal,
  dealEndRange,
  registerDeal,
  reportDeal,
  reportMenu,
  reportPlace,
  reportReview,
  reportWait,
  undoDealCheck,
  undoWait,
  undoClosedToday,
} = await import("./report-requests");

const ID = "33333333-3333-4333-8333-333333333333";
const NOW = fromKstWallTime(2026, 11, 4, 12);

function deps(over: Partial<ReportDeps> = {}): ReportDeps {
  return {
    currentUserId: async () => "user-1",
    now: () => NOW,
    insertReviewReport: vi.fn(async () => null),
    insertPlaceReport: vi.fn(async () => null),
    insertMenuFlag: vi.fn(async () => null),
    registerDeal: vi.fn(async () => ({
      data: { deal_id: ID, merged_with: null, ends_on: "2026-11-11" },
      error: null,
    })),
    insertDealCheck: vi.fn(async () => null),
    updateDealCheck: vi.fn(async () => ({ count: 1, error: null })),
    deleteDealCheck: vi.fn(async () => ({ count: 1, error: null })),
    reportWait: vi.fn(async () => ({
      data: {
        accepted: true,
        report_id: ID,
        reported_at: "2026-11-04T03:00:00.000Z",
        retry_at: "2026-11-04T03:30:00.000Z",
      },
      error: null,
    })),
    deleteWaitReport: vi.fn(async () => ({ count: 1, error: null })),
    deleteClosedToday: vi.fn(async () => ({ count: 1, error: null })),
    ...over,
  };
}

describe("reportReview (MOD-01)", () => {
  it("사유와 기타 글", async () => {
    const d = deps();
    await expect(
      reportReview({ reviewId: ID, reason: "other", note: " 이상해요 " }, d),
    ).resolves.toEqual({ ok: true });
    expect(d.insertReviewReport).toHaveBeenCalledWith("user-1", {
      target_type: "review",
      review_id: ID,
      reason: "other",
      note: "이상해요",
    });
  });
  it("기타가 아닌데 글이 있으면 invalid, 할인 사유는 후기에 못 쓴다", async () => {
    await expect(
      reportReview({ reviewId: ID, reason: "spam", note: "글" }, deps()),
    ).resolves.toEqual({ ok: false, error: "invalid" });
    await expect(
      reportReview({ reviewId: ID, reason: "ad_false" }, deps()),
    ).resolves.toEqual({ ok: false, error: "invalid" });
  });
  it("기타 글의 금칙어는 banned", async () => {
    await expect(
      reportReview({ reviewId: ID, reason: "other", note: "ㅅㅂ" }, deps()),
    ).resolves.toEqual({ ok: false, error: "banned" });
  });
  it.each([
    [
      "reports_daily_limit_exceeded",
      "23514",
      { ok: false, error: "limit", bucket: "reports" },
    ],
    ["report_own_target", "23514", { ok: false, error: "own_target" }],
    ["report_target_unavailable", "23514", { ok: false, error: "unavailable" }],
    ["duplicate key", "23505", { ok: false, error: "duplicate" }],
  ])("%s", async (message, code, expected) => {
    const d = deps({ insertReviewReport: async () => ({ code, message }) });
    await expect(
      reportReview({ reviewId: ID, reason: "abuse" }, d),
    ).resolves.toEqual(expected);
  });
});

describe("reportDeal (DEAL-04)", () => {
  it("할인 사유 4개", async () => {
    const d = deps();
    await expect(
      reportDeal({ dealId: ID, reason: "ad_false" }, d),
    ).resolves.toEqual({ ok: true });
    expect(d.insertReviewReport).toHaveBeenCalledWith("user-1", {
      target_type: "deal",
      deal_id: ID,
      reason: "ad_false",
      note: null,
    });
    await expect(
      reportDeal({ dealId: ID, reason: "spam" }, deps()),
    ).resolves.toEqual({ ok: false, error: "invalid" });
  });
});

describe("reportMenu (T10.16f, MENU-05)", () => {
  it("메뉴 줄(장소 + 비교 키)과 사유 칩만 보낸다", async () => {
    const d = deps();
    await expect(
      reportMenu({ placeId: "123", menuKey: "제육볶음", reason: "false" }, d),
    ).resolves.toEqual({ ok: true });
    expect(d.insertMenuFlag).toHaveBeenCalledWith("user-1", {
      place_id: "123",
      menu_key: "제육볶음",
      reason: "false",
    });
  });
  it("공백 있는 키, 대문자 키, 모르는 사유, 글은 받지 않는다", async () => {
    for (const bad of [
      { placeId: "123", menuKey: "제육 볶음", reason: "false" },
      { placeId: "123", menuKey: "Ramen", reason: "false" },
      { placeId: "123", menuKey: "제육", reason: "privacy" },
      { placeId: "123", menuKey: "제육", reason: "other", note: "글" },
      { placeId: "abc", menuKey: "제육", reason: "false" },
    ]) {
      await expect(reportMenu(bad, deps())).resolves.toEqual({
        ok: false,
        error: "invalid",
      });
    }
  });
  it("자기 메뉴뿐인 줄, 같은 줄 두 번은 DB 오류를 그대로 옮긴다", async () => {
    await expect(
      reportMenu(
        { placeId: "123", menuKey: "제육", reason: "false" },
        deps({
          insertMenuFlag: async () => ({
            code: "23505",
            message: "menu_flags_one_per_group",
          }),
        }),
      ),
    ).resolves.toEqual({ ok: false, error: "duplicate" });
    const own = await reportMenu(
      { placeId: "123", menuKey: "제육", reason: "false" },
      deps({
        insertMenuFlag: async () => ({
          code: "23514",
          message: "report_own_target",
        }),
      }),
    );
    expect(own.ok).toBe(false);
  });
  it("로그인하지 않았으면 unauthenticated", async () => {
    await expect(
      reportMenu(
        { placeId: "123", menuKey: "제육", reason: "false" },
        deps({ currentUserId: async () => null }),
      ),
    ).resolves.toEqual({ ok: false, error: "unauthenticated" });
  });
});

describe("reportPlace (PLACE-05)", () => {
  it.each([
    [{ kind: "closed", closed: "gone" }, { closed: "gone" }],
    [{ kind: "closed" }, {}],
    [{ kind: "price", priceKrw: 11000 }, { price_krw: 11000 }],
    [
      { kind: "info", fields: ["name", "phone"] },
      { fields: ["name", "phone"] },
    ],
  ])("%o → detail %o", async (extra, detail) => {
    const d = deps();
    await expect(reportPlace({ placeId: "123", ...extra }, d)).resolves.toEqual(
      { ok: true },
    );
    expect(d.insertPlaceReport).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ place_id: "123", detail }),
    );
  });
  it.each([
    ["자유 글", { kind: "info", note: "주소가 달라요" }],
    ["다른 종류의 세부", { kind: "closed", priceKrw: 9000 }],
    ["가격 범위 밖", { kind: "price", priceKrw: 500 }],
    ["모르는 정보 칸", { kind: "info", fields: ["menu"] }],
    ["좌표", { kind: "closed", lat: 37.5 }],
  ])("%s는 거절", async (_l, extra) => {
    await expect(
      reportPlace({ placeId: "123", ...extra }, deps()),
    ).resolves.toEqual({ ok: false, error: "invalid" });
  });
  it("같은 날 같은 종류는 duplicate", async () => {
    const d = deps({
      insertPlaceReport: async () => ({
        code: "23505",
        message: "place_reports_once_per_day",
      }),
    });
    await expect(
      reportPlace({ placeId: "123", kind: "closed" }, d),
    ).resolves.toEqual({ ok: false, error: "duplicate" });
  });
});

describe("registerDeal (DEAL-01, DEAL-04)", () => {
  const input = {
    placeId: "123",
    type: "lunch_special",
    content: "정식 9천 원",
  } as const;
  it("새로 등록", async () => {
    const d = deps();
    await expect(registerDeal(input, d)).resolves.toEqual({
      ok: true,
      status: "created",
      dealId: ID,
      endsOn: "2026-11-11",
    });
    expect(d.registerDeal).toHaveBeenCalledWith({
      p_place_id: "123",
      p_place_url: null,
      p_type: "lunch_special",
      p_content: "정식 9천 원",
      p_ends_on: null,
      p_days: 0,
      p_slots: [],
      p_replace: false,
    });
  });
  it("같은 유형이 있으면 merged", async () => {
    const d = deps({
      registerDeal: async () => ({
        data: { deal_id: null, merged_with: ID, ends_on: null },
        error: null,
      }),
    });
    await expect(registerDeal(input, d)).resolves.toEqual({
      ok: true,
      status: "merged",
      mergedWith: ID,
    });
  });
  it("종료일은 오늘~30일", async () => {
    await expect(
      registerDeal({ ...input, endsOn: "2026-12-04" }, deps()),
    ).resolves.toMatchObject({ ok: true });
    await expect(
      registerDeal({ ...input, endsOn: "2026-12-05" }, deps()),
    ).resolves.toEqual({ ok: false, error: "invalid" });
    await expect(
      registerDeal({ ...input, endsOn: "2026-11-03" }, deps()),
    ).resolves.toEqual({ ok: false, error: "invalid" });
  });
  it("내용 금칙어, 링크는 banned, 60자 넘으면 invalid", async () => {
    await expect(
      registerDeal({ ...input, content: "오픈채팅 문의" }, deps()),
    ).resolves.toEqual({ ok: false, error: "banned" });
    await expect(
      registerDeal({ ...input, content: "www.example.com" }, deps()),
    ).resolves.toEqual({ ok: false, error: "banned" });
    await expect(
      registerDeal({ ...input, content: "가".repeat(61) }, deps()),
    ).resolves.toEqual({ ok: false, error: "invalid" });
  });
  it("하루 10건 넘으면 limit deals", async () => {
    const d = deps({
      registerDeal: async () => ({
        data: null,
        error: { code: "23514", message: "deals_daily_limit_exceeded" },
      }),
    });
    await expect(registerDeal(input, d)).resolves.toEqual({
      ok: false,
      error: "limit",
      bucket: "deals",
    });
  });
  it("종료일 범위 도우미", () => {
    expect(dealEndRange(NOW)).toEqual({
      min: "2026-11-04",
      defaultValue: "2026-11-11",
      max: "2026-12-04",
    });
  });
});

describe("checkDeal (DEAL-03)", () => {
  it("처음 답하면 넣고, 이미 있으면 바꾼다", async () => {
    const d = deps({
      insertDealCheck: vi.fn(async () => ({ code: "23505", message: "dup" })),
    });
    await expect(
      checkDeal({ dealId: ID, answer: "ended" }, d),
    ).resolves.toEqual({
      ok: true,
      answer: "ended",
    });
    expect(d.updateDealCheck).toHaveBeenCalledWith("user-1", ID, "ended");
  });
  it("내려간 할인은 unavailable", async () => {
    const d = deps({
      insertDealCheck: async () => ({
        code: "23514",
        message: "deal_not_open",
      }),
    });
    await expect(
      checkDeal({ dealId: ID, answer: "still" }, d),
    ).resolves.toEqual({
      ok: false,
      error: "unavailable",
    });
  });
  it("되돌리기", async () => {
    await expect(undoDealCheck({ dealId: ID }, deps())).resolves.toEqual({
      ok: true,
    });
  });
});

describe("reportWait (PLACE-07)", () => {
  it("배지 단계를 DB 값으로 보내고 2분 되돌리기 시각을 준다", async () => {
    const d = deps();
    await expect(
      reportWait({ placeId: "123", level: "walkIn" }, d),
    ).resolves.toEqual({
      ok: true,
      reportId: ID,
      reportedAt: "2026-11-04T03:00:00.000Z",
      undoUntil: "2026-11-04T03:02:00.000Z",
      retryAt: "2026-11-04T03:30:00.000Z",
    });
    expect(d.reportWait).toHaveBeenCalledWith({
      p_place_id: "123",
      p_level: "now",
    });
  });
  it("30분 안이면 cooldown + retryAt", async () => {
    const d = deps({
      reportWait: async () => ({
        data: {
          accepted: false,
          report_id: null,
          reported_at: "2026-11-04T03:00:00.000Z",
          retry_at: "2026-11-04T03:30:00.000Z",
        },
        error: null,
      }),
    });
    await expect(
      reportWait({ placeId: "123", level: "long" }, d),
    ).resolves.toEqual({
      ok: false,
      error: "cooldown",
      retryAt: "2026-11-04T03:30:00.000Z",
    });
  });
  it("DB 값(now)을 그대로 보내면 거절", async () => {
    await expect(
      reportWait({ placeId: "123", level: "now" }, deps()),
    ).resolves.toEqual({ ok: false, error: "invalid" });
  });
  it("2분이 지나 지운 행이 없으면 undo_expired", async () => {
    await expect(
      undoWait(
        { reportId: ID },
        deps({ deleteWaitReport: async () => ({ count: 0, error: null }) }),
      ),
    ).resolves.toEqual({ ok: false, error: "undo_expired" });
    await expect(undoWait({ reportId: ID }, deps())).resolves.toEqual({
      ok: true,
    });
  });
});

describe("오늘 쉬어요 되돌리기 (T9.18, D-40)", () => {
  const P = "12345";
  it("내 제보를 지우면 ok", async () => {
    const d = deps();
    expect(await undoClosedToday({ placeId: P }, d)).toEqual({ ok: true });
    expect(d.deleteClosedToday).toHaveBeenCalledWith(expect.any(String), P);
  });
  it("2분이 지나 지운 행이 없으면 undo_expired", async () => {
    expect(
      await undoClosedToday(
        { placeId: P },
        deps({ deleteClosedToday: async () => ({ count: 0, error: null }) }),
      ),
    ).toEqual({ ok: false, error: "undo_expired" });
  });
  it("장소 id 형식이 아니면 지우지 않는다", async () => {
    const d = deps();
    expect((await undoClosedToday({ placeId: "abc" }, d)).ok).toBe(false);
    expect(d.deleteClosedToday).not.toHaveBeenCalled();
  });
});
