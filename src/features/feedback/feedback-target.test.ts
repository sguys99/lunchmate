import { describe, expect, it } from "vitest";
import { fromKstWallTime, kstDateKey } from "@/lib/time";
import {
  canAnswerLate,
  canWriteReviewFor,
  feedbackBandMode,
  isAskableVisit,
  pickFeedbackTarget,
  pickOpenVisit,
  todayWriteOffer,
  wasPromptedToday,
  type MyVisit,
} from "./feedback-target";

const kst = (y: number, m: number, d: number, h = 0, min = 0) =>
  fromKstWallTime(y, m, d, h, min);

let seq = 0;
function visit(at: Date, over: Partial<MyVisit> = {}): MyVisit {
  seq += 1;
  return {
    id: `v${seq}`,
    placeId: String(1000 + seq),
    placeUrl: null,
    meal: "lunch",
    source: "rec",
    visitedOn: kstDateKey(at),
    createdAt: at.toISOString(),
    status: "candidate",
    feedbackRequestedAt: null,
    review: null,
    ...over,
  };
}

describe("isAskableVisit", () => {
  it("오늘 방문은 묻지 않는다(다음 접속 때)", () => {
    const now = kst(2026, 11, 4, 18);
    expect(isAskableVisit(visit(kst(2026, 11, 4, 12)), now)).toBe(false);
  });
  it("어제 방문은 묻는다", () => {
    expect(
      isAskableVisit(visit(kst(2026, 11, 3, 12)), kst(2026, 11, 4, 9)),
    ).toBe(true);
  });
  it("답한 방문은 묻지 않는다", () => {
    const v = visit(kst(2026, 11, 3, 12), { status: "not_visited" });
    expect(isAskableVisit(v, kst(2026, 11, 4, 9))).toBe(false);
  });
  it("평일 48시간이 지나면 묻지 않는다", () => {
    const v = visit(kst(2026, 11, 2, 12));
    expect(isAskableVisit(v, kst(2026, 11, 4, 11, 59))).toBe(true);
    expect(isAskableVisit(v, kst(2026, 11, 4, 12))).toBe(false);
  });
  it("금요일 방문은 월요일에 묻는다", () => {
    expect(
      isAskableVisit(visit(kst(2026, 11, 6, 12)), kst(2026, 11, 9, 10)),
    ).toBe(true);
  });
  it("토요일 방문은 다음 평일(월, 화)에 묻는다", () => {
    const v = visit(kst(2026, 11, 7, 12));
    expect(isAskableVisit(v, kst(2026, 11, 9, 10))).toBe(true);
    expect(isAskableVisit(v, kst(2026, 11, 10, 23))).toBe(true);
    expect(isAskableVisit(v, kst(2026, 11, 11, 0))).toBe(false);
  });
  it("공휴일(한글날 금)을 빼고 센다", () => {
    // 목 10/8 12시 → 금 공휴일, 주말 → 월 10/12, 화 10/13 12시 전까지
    const v = visit(kst(2026, 10, 8, 12));
    expect(isAskableVisit(v, kst(2026, 10, 13, 11))).toBe(true);
    expect(isAskableVisit(v, kst(2026, 10, 13, 12))).toBe(false);
  });
});

describe("pickFeedbackTarget", () => {
  const now = kst(2026, 11, 4, 9);
  it("가장 최근 후보를 고르고 새로 묻는다", () => {
    const older = visit(kst(2026, 11, 3, 12));
    const newer = visit(kst(2026, 11, 3, 19), { meal: "dinner" });
    expect(pickFeedbackTarget([older, newer], now)).toEqual({
      visit: newer,
      isNewPrompt: true,
    });
  });
  it("후보가 없으면 null", () => {
    expect(pickFeedbackTarget([], now)).toBeNull();
    expect(
      pickFeedbackTarget(
        [visit(kst(2026, 11, 3, 12), { status: "visited" })],
        now,
      ),
    ).toBeNull();
  });
  it("오늘 이미 물은 방문은 그날 그대로 다시 보인다(새로 묻는 것 아님)", () => {
    const asked = visit(kst(2026, 11, 2, 12), {
      feedbackRequestedAt: kst(2026, 11, 4, 8).toISOString(),
    });
    const newer = visit(kst(2026, 11, 3, 12));
    expect(pickFeedbackTarget([asked, newer], now)).toEqual({
      visit: asked,
      isNewPrompt: false,
    });
  });
  it("오늘 물은 방문에 답했으면 그날은 다른 방문을 묻지 않는다(하루 1회)", () => {
    const answered = visit(kst(2026, 11, 2, 12), {
      status: "visited",
      feedbackRequestedAt: kst(2026, 11, 4, 8).toISOString(),
    });
    const other = visit(kst(2026, 11, 3, 12));
    expect(pickFeedbackTarget([answered, other], now)).toBeNull();
  });
  it("어제 물었지만 답하지 않은 방문은 48시간 안이면 다시 묻는다", () => {
    const v = visit(kst(2026, 11, 3, 12), {
      feedbackRequestedAt: kst(2026, 11, 3, 20).toISOString(),
    });
    expect(pickFeedbackTarget([v], now)).toEqual({
      visit: v,
      isNewPrompt: true,
    });
  });
  it("alreadyPromptedToday를 직접 넘길 수 있다", () => {
    expect(
      pickFeedbackTarget([visit(kst(2026, 11, 3, 12))], now, true),
    ).toBeNull();
  });
  it("wasPromptedToday는 KST 날짜로 판정한다", () => {
    const v = visit(kst(2026, 11, 3, 12), {
      feedbackRequestedAt: "2026-11-03T15:00:00Z", // KST 11/4 00:00
    });
    expect(wasPromptedToday([v], now)).toBe(true);
  });
});

describe("canAnswerLate (나 탭 14일)", () => {
  const v = (on: string, status: MyVisit["status"] = "candidate") => ({
    visitedOn: on,
    status,
  });
  const now = kst(2026, 11, 15, 12);
  it("방문일 포함 14일 뒤까지", () => {
    expect(canAnswerLate(v("2026-11-01"), now)).toBe(true);
    expect(canAnswerLate(v("2026-10-31"), now)).toBe(false);
    expect(canAnswerLate(v("2026-11-15"), now)).toBe(true);
  });
  it("이미 답했으면 false", () => {
    expect(canAnswerLate(v("2026-11-10", "not_visited"), now)).toBe(false);
  });
  it("후기 쓰기는 안 갔어요 뒤에도 14일 안이면 된다", () => {
    expect(
      canWriteReviewFor({ visitedOn: "2026-11-10", review: null }, now),
    ).toBe(true);
    expect(
      canWriteReviewFor(
        { visitedOn: "2026-11-10", review: { id: "r", rating: "up" } },
        now,
      ),
    ).toBe(false);
  });
});

describe("feedbackBandMode (D-11 안건 2)", () => {
  it.each([
    [{ hasTarget: true, answered: false, directionsClickedToday: false }, "ask"],
    [
      { hasTarget: true, answered: false, directionsClickedToday: true },
      "collapsed",
    ],
    [{ hasTarget: true, answered: true, directionsClickedToday: true }, "thanks"],
    [
      { hasTarget: false, answered: false, directionsClickedToday: false },
      "hidden",
    ],
  ] as const)("%o → %s", (input, mode) => {
    expect(feedbackBandMode(input)).toBe(mode);
  });
});

describe("상세 쓰기가 붙일 방문과 오늘 후기 쓰기 (2026-11-01)", () => {
  const now = kst(2026, 11, 4, 12, 30);
  const latest = { createdAt: kst(2026, 10, 30, 13).toISOString(), visitedOn: "2026-10-30" };

  it("마지막 후기 뒤의 답 없는 후보 중 가장 최근 것을 고른다", () => {
    const older = visit(kst(2026, 11, 2, 12));
    const newer = visit(kst(2026, 11, 3, 12));
    expect(pickOpenVisit([older, newer], latest.createdAt, now)?.id).toBe(newer.id);
  });
  it("후기 전 후보, 답한 방문, 안 갔어요, 14일 지난 방문은 고르지 않는다", () => {
    const visits = [
      visit(kst(2026, 10, 29, 12)),
      visit(kst(2026, 11, 3, 12), { status: "visited", review: { id: "r", rating: "up" } }),
      visit(kst(2026, 11, 3, 18), { status: "not_visited" }),
    ];
    expect(pickOpenVisit(visits, latest.createdAt, now)).toBeNull();
    expect(pickOpenVisit([visit(kst(2026, 10, 15, 12))], null, now)).toBeNull();
  });
  it("후기가 없으면 14일 안 후보 아무거나(가장 최근)", () => {
    const v = visit(kst(2026, 11, 1, 12));
    expect(pickOpenVisit([v], null, now)?.id).toBe(v.id);
  });

  it("새 후보가 있으면 그 방문으로 보인다", () => {
    const v = visit(kst(2026, 11, 4, 11, 50), { source: "detail" });
    expect(todayWriteOffer([v], latest, now)).toEqual({ visitId: v.id });
  });
  it("새 후보가 없어도 마지막 후기가 오늘 이전 방문이면 오늘 새 방문으로 보인다", () => {
    expect(todayWriteOffer([], latest, now)).toEqual({ visitId: null });
  });
  it("마지막 후기가 오늘 방문이고 새 후보가 없으면 보이지 않는다", () => {
    expect(
      todayWriteOffer(
        [],
        { createdAt: kst(2026, 11, 4, 12).toISOString(), visitedOn: "2026-11-04" },
        now,
      ),
    ).toBeNull();
  });
});
