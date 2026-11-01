import { describe, expect, it } from "vitest";
import type { PlaceDeal } from "@/features/place/place-stats-model";
import {
  canSubmitContent,
  clockText,
  dealCounts,
  dealEndRange,
  dealMeta,
  dealStepProgress,
  endedDots,
  endsOnAfter,
  findDuplicate,
  flagNote,
  hasPlaceDetail,
  initialDealForm,
  isEndsOnInRange,
  limitState,
  msToNextWaitPhase,
  parsePrice,
  placeDetailValid,
  placeKindToDb,
  placeReportRequest,
  registerDealRequest,
  reportEventType,
  stepAfterType,
  untilChipOf,
  untilText,
  waitEventLevel,
  waitPhase,
  whenText,
  type MyWait,
} from "./flow";

// 2026-11-01(일) 12:24 KST
const NOW = new Date("2026-11-01T03:24:00Z");

function deal(over: Partial<PlaceDeal> = {}): PlaceDeal {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    source: "user",
    type: "lunch_special",
    content: "점심특선 순대국 9천 원",
    days: 0,
    slots: [],
    startsOn: "2026-10-29",
    endsOn: "2026-11-05",
    createdAt: "2026-10-29T03:00:00Z",
    stillCount: 4,
    endedCount: 1,
    myAnswer: null,
    isMine: false,
    ...over,
  };
}

describe("할인 기간 (DEAL-01, D-13 안건 7)", () => {
  it("기본 종료일은 KST 오늘 + 7일, 범위는 오늘~30일", () => {
    expect(initialDealForm(NOW).endsOn).toBe("2026-11-08");
    expect(dealEndRange(NOW)).toEqual({ min: "2026-11-01", max: "2026-12-01" });
  });

  it("KST 자정 직전과 직후가 다른 날로 계산된다", () => {
    const lateUtc = new Date("2026-11-01T14:59:00Z"); // KST 11/01 23:59
    const nextKst = new Date("2026-11-01T15:00:00Z"); // KST 11/02 00:00
    expect(endsOnAfter(lateUtc, 0)).toBe("2026-11-01");
    expect(endsOnAfter(nextKst, 0)).toBe("2026-11-02");
  });

  it("범위 밖 날짜와 형식 오류는 막는다", () => {
    expect(isEndsOnInRange("2026-11-01", NOW)).toBe(true);
    expect(isEndsOnInRange("2026-12-01", NOW)).toBe(true);
    expect(isEndsOnInRange("2026-12-02", NOW)).toBe(false);
    expect(isEndsOnInRange("2026-10-31", NOW)).toBe(false);
    expect(isEndsOnInRange("11/05", NOW)).toBe(false);
  });

  it("빠른 칩과 같은 날이면 그 칩, 직접 고른 날이면 null", () => {
    expect(untilChipOf("2026-11-04", NOW)).toBe(3);
    expect(untilChipOf("2026-11-15", NOW)).toBe(14);
    expect(untilChipOf("2026-11-10", NOW)).toBeNull();
  });

  it("종료일 표시: 오늘이면 오늘까지, 아니면 날짜", () => {
    expect(untilText("2026-11-01", NOW)).toBe("오늘까지");
    expect(untilText("2026-11-05", NOW)).toBe("11월 5일까지");
  });
});

describe("요일과 시간대 표시 (D-13 안건 6)", () => {
  it("언제든이면 null, 평일과 주말은 묶어 읽는다", () => {
    expect(whenText(0, [])).toBeNull();
    expect(whenText(31, ["lunch"])).toBe("평일 점심");
    expect(whenText(96, [])).toBe("주말");
    expect(whenText(1 | 4, ["dinner", "lunch"])).toBe("월, 수 점심, 저녁");
    expect(whenText(0, ["afternoon"])).toBe("오후");
  });

  it("할인 한 줄 메타는 제보 날과 종료일", () => {
    expect(dealMeta(deal(), NOW)).toEqual({
      meta: "3일 전 제보, 11월 5일까지",
      when: null,
    });
    expect(
      dealMeta(
        deal({ createdAt: "2026-11-01T01:00:00Z", days: 31, slots: ["lunch"] }),
        NOW,
      ),
    ).toEqual({ meta: "오늘 제보, 11월 5일까지", when: "평일 점심" });
  });
});

describe("할인 등록 단계와 중복 (D-13 안건 1~3)", () => {
  it("중복이 없으면 3칸, 거쳤으면 4칸", () => {
    expect(dealStepProgress("type", false)).toEqual({ step: 1, total: 3 });
    expect(dealStepProgress("text", false)).toEqual({ step: 2, total: 3 });
    expect(dealStepProgress("confirm", false)).toEqual({ step: 3, total: 3 });
    expect(dealStepProgress("dup", true)).toEqual({ step: 2, total: 4 });
    expect(dealStepProgress("confirm", true)).toEqual({ step: 4, total: 4 });
    expect(dealStepProgress("done", true)).toEqual({ step: 0, total: 0 });
  });

  it("같은 출처(사용자), 같은 유형만 중복이다", () => {
    const list = [
      deal({ id: "a", type: "discount" }),
      deal({ id: "b", type: "lunch_special", source: "owner" }),
      deal({ id: "c", type: "lunch_special" }),
    ];
    expect(findDuplicate(list, "lunch_special")?.id).toBe("c");
    expect(findDuplicate(list, "event")).toBeNull();
    expect(stepAfterType(list, "discount")).toBe("dup");
    expect(stepAfterType(list, "happy_hour")).toBe("text");
    expect(stepAfterType([deal({ source: "owner" })], "lunch_special")).toBe(
      "text",
    );
  });

  it("요청은 유형 없이는 만들지 않고, 바꿔 넣기면 replace", () => {
    const form = initialDealForm(NOW);
    expect(
      registerDealRequest(form, { placeId: "123", placeUrl: null }),
    ).toBeNull();
    const req = registerDealRequest(
      {
        ...form,
        type: "happy_hour",
        content: "  생맥주 반값 ",
        dayIndexes: [0, 4],
        slots: ["dinner"],
        replace: true,
      },
      { placeId: "123", placeUrl: "https://place.map.kakao.com/123" },
    );
    expect(req).toEqual({
      placeId: "123",
      placeUrl: "https://place.map.kakao.com/123",
      type: "happy_hour",
      content: "생맥주 반값",
      endsOn: "2026-11-08",
      days: 1 | 16,
      slots: ["dinner"],
      replace: true,
    });
    const plain = registerDealRequest(
      { ...form, type: "discount", content: "1천 원 할인" },
      { placeId: "123", placeUrl: null },
    );
    expect(plain?.replace).toBeUndefined();
    expect(plain?.days).toBe(0);
  });

  it("내용은 공백만이거나 60자를 넘으면 넘어가지 않는다", () => {
    expect(canSubmitContent("   ", 60)).toBe(false);
    expect(canSubmitContent("a".repeat(61), 60)).toBe(false);
    expect(canSubmitContent("포장 할인", 60)).toBe(true);
  });
});

describe("아직 해요 / 끝났어요 수 (DEAL-03, D-13 안건 4, 5)", () => {
  it("서버 값 그대로", () => {
    expect(dealCounts(deal(), undefined)).toEqual({
      answer: null,
      still: 4,
      ended: 1,
    });
  });
  it("내가 방금 누른 답을 바로 더한다", () => {
    expect(dealCounts(deal(), "still")).toEqual({
      answer: "still",
      still: 5,
      ended: 1,
    });
    expect(dealCounts(deal(), "ended")).toEqual({
      answer: "ended",
      still: 4,
      ended: 2,
    });
  });
  it("서버가 이미 내 답을 셌으면 두 번 세지 않고, 되돌리면 뺀다", () => {
    const mine = deal({ myAnswer: "still", stillCount: 5 });
    expect(dealCounts(mine, undefined).still).toBe(5);
    expect(dealCounts(mine, "still").still).toBe(5);
    expect(dealCounts(mine, null)).toEqual({
      answer: null,
      still: 4,
      ended: 1,
    });
    expect(dealCounts(mine, "ended")).toEqual({
      answer: "ended",
      still: 4,
      ended: 2,
    });
  });
  it("점은 3개까지", () => {
    expect(endedDots(0)).toBe(0);
    expect(endedDots(2)).toBe(2);
    expect(endedDots(7)).toBe(3);
  });
});

describe("웨이팅 결과 줄 단계 (PLACE-07, D-13 안건 8)", () => {
  const sent: MyWait = {
    kind: "sent",
    level: "long",
    reportId: "r1",
    reportedAt: "2026-11-01T03:24:00Z",
    undoUntil: "2026-11-01T03:26:00Z",
    retryAt: "2026-11-01T03:54:00Z",
  };
  const at = (iso: string) => new Date(iso);

  it("없으면 idle", () => {
    expect(waitPhase(null, NOW)).toBe("idle");
    expect(msToNextWaitPhase(null, NOW)).toBeNull();
  });
  it("2분 안은 취소, 그 뒤 30분까지 제한, 그 뒤 다시 idle", () => {
    expect(waitPhase(sent, at("2026-11-01T03:24:00Z"))).toBe("undo");
    expect(waitPhase(sent, at("2026-11-01T03:25:59Z"))).toBe("undo");
    expect(waitPhase(sent, at("2026-11-01T03:26:00Z"))).toBe("cooldown");
    expect(waitPhase(sent, at("2026-11-01T03:53:59Z"))).toBe("cooldown");
    expect(waitPhase(sent, at("2026-11-01T03:54:00Z"))).toBe("idle");
  });
  it("타이머는 다음 경계까지", () => {
    expect(msToNextWaitPhase(sent, at("2026-11-01T03:25:00Z"))).toBe(60_000);
    expect(msToNextWaitPhase(sent, at("2026-11-01T03:50:00Z"))).toBe(240_000);
    expect(msToNextWaitPhase(sent, at("2026-11-01T04:00:00Z"))).toBeNull();
  });
  it("서버 제한 응답은 취소 없이 제한만", () => {
    const cd: MyWait = { kind: "cooldown", retryAt: "2026-11-01T03:40:00Z" };
    expect(waitPhase(cd, NOW)).toBe("cooldown");
    expect(msToNextWaitPhase(cd, NOW)).toBe(16 * 60_000);
  });
  it("시각은 KST 벽시계, 이벤트 단계는 PRD 값", () => {
    expect(clockText("2026-11-01T03:24:00Z")).toBe("12시 24분");
    expect(clockText("2026-11-01T15:05:00Z")).toBe("0시 5분");
    expect(waitEventLevel("walkIn")).toBe("none");
    expect(waitEventLevel("long")).toBe("long");
  });
});

describe("하루 한도를 열 때 (MOD-05, D-13 안건 12)", () => {
  const limits = (reports: number, deals: number) => ({
    signedIn: true as const,
    limits: {
      reviews: { used: 0, limit: 20, remaining: 20 },
      reports: { used: 30 - reports, limit: 30, remaining: reports },
      deals: { used: 10 - deals, limit: 10, remaining: deals },
    },
  });
  it("불러오기 전, 비로그인, 막힘, 열림", () => {
    expect(limitState(undefined, "deals")).toEqual({ kind: "unknown" });
    expect(limitState({ signedIn: false }, "deals")).toEqual({
      kind: "signedOut",
    });
    expect(limitState(limits(5, 0), "deals")).toEqual({ kind: "blocked" });
    expect(limitState(limits(0, 4), "reports")).toEqual({ kind: "blocked" });
    expect(limitState(limits(2, 4), "reports")).toEqual({
      kind: "open",
      remaining: 2,
    });
  });
});

describe("식당 정보 제보 요청 (PLACE-05, D-13 안건 9)", () => {
  const place = { placeId: "123", placeUrl: null };
  const empty = { closed: null, price: "", fields: [] };
  it("메뉴의 정보가 틀려요는 DB info", () => {
    expect(placeKindToDb("wrong")).toBe("info");
    expect(placeKindToDb("closed")).toBe("closed");
  });
  it("세부 없이도 보낼 수 있다", () => {
    expect(hasPlaceDetail("closed", empty)).toBe(false);
    expect(placeReportRequest("closed", empty, place)).toEqual({
      placeId: "123",
      placeUrl: null,
      kind: "closed",
    });
  });
  it("가격은 숫자만, 1천~10만 원", () => {
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("11,000원")).toBe(11000);
    expect(parsePrice("500")).toBeNaN();
    expect(parsePrice("200000")).toBeNaN();
    expect(placeDetailValid("price", { ...empty, price: "500" })).toBe(false);
    expect(placeDetailValid("price", { ...empty, price: "9000" })).toBe(true);
    expect(
      placeReportRequest("price", { ...empty, price: "9000" }, place),
    ).toMatchObject({
      kind: "price",
      priceKrw: 9000,
    });
  });
  it("문 닫음과 정보 세부", () => {
    expect(
      placeReportRequest("closed", { ...empty, closed: "moved" }, place),
    ).toMatchObject({ closed: "moved" });
    expect(
      placeReportRequest(
        "info",
        { ...empty, fields: ["phone", "name"] },
        place,
      ),
    ).toMatchObject({ kind: "info", fields: ["phone", "name"] });
  });
});

describe("신고 (MOD-01, DEAL-04)", () => {
  it("기타 글은 기타일 때만, 빈 글은 null", () => {
    expect(flagNote("spam", "광고 같아요")).toBeNull();
    expect(flagNote("other", "   ")).toBeNull();
    expect(flagNote("other", " 다른 가게 얘기 ")).toBe("다른 가게 얘기");
    expect(flagNote("other", "가".repeat(150))?.length).toBe(100);
  });
  it("이벤트 type에는 대상 종류만", () => {
    expect(reportEventType("review")).toBe("review");
    expect(reportEventType("deal")).toBe("deal");
    expect(reportEventType("closed")).toBe("place_closed");
  });
});
