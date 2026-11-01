import { describe, expect, it } from "vitest";
import { authCopy } from "@/copy/auth";
import { feedbackCopy } from "@/copy/feedback";
import { fromKstWallTime, kstDateKey } from "@/lib/time";
import {
  bandView as view,
  directedToday,
  promptSource,
} from "./band-model";
import { pickFeedbackTarget, type MyVisit } from "./feedback-target";

/** 서버(feedbackBandAction)가 고르는 대상을 테스트에서도 같은 함수로 */
function bandView(input: Omit<Parameters<typeof view>[0], "target">) {
  const t = pickFeedbackTarget(input.visits, input.now);
  return view({
    ...input,
    target: t ? { visitId: t.visit.id, isNewPrompt: t.isNewPrompt } : null,
  });
}

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

const now = kst(2026, 11, 4, 9); // 수요일 아침

describe("bandView", () => {
  it("어제 방문은 묻는 띠, 처음이면 isNewPrompt", () => {
    const y = visit(kst(2026, 11, 3, 12));
    const v = bandView({ visits: [y], now, local: null, directedLocal: false });
    expect(v).toMatchObject({ kind: "ask", isNewPrompt: true });
  });

  it("이 탭에서 길찾기를 눌렀으면 접힌 줄 (D-11 안건 2)", () => {
    const y = visit(kst(2026, 11, 3, 12));
    expect(
      bandView({ visits: [y], now, local: null, directedLocal: true }).kind,
    ).toBe("collapsed");
  });

  it("오늘 방문 후보가 있으면(새로 고침 뒤에도) 접힌 줄", () => {
    const y = visit(kst(2026, 11, 3, 12));
    const today = visit(kst(2026, 11, 4, 8, 50), { source: "map" });
    expect(
      bandView({ visits: [today, y], now, local: null, directedLocal: false })
        .kind,
    ).toBe("collapsed");
  });

  it("상세에서 쓴 오늘 방문은 길찾기가 아니다", () => {
    const today = visit(kst(2026, 11, 4, 8, 50), {
      source: "detail",
      status: "visited",
    });
    expect(directedToday([today], now, false)).toBe(false);
  });

  it("나 탭 상세에서 누른 오늘 길찾기(detail 후보)는 길찾기다 (2026-11-01)", () => {
    const today = visit(kst(2026, 11, 4, 8, 50), {
      source: "detail",
      status: "candidate",
    });
    expect(directedToday([today], now, false)).toBe(true);
  });

  it("방금 답했으면 고마움 줄", () => {
    const y = visit(kst(2026, 11, 3, 12));
    const v = bandView({
      visits: [y],
      now,
      local: { visit: y, answer: "up", reviewId: "r1", detailsSaved: false },
      directedLocal: true,
    });
    expect(v).toMatchObject({ kind: "thanks", answer: "up", reviewId: "r1" });
  });

  it("오늘 물은 방문에 이미 답했으면(다시 열어도) 고마움 줄을 그날 남긴다", () => {
    const y = visit(kst(2026, 11, 3, 12), {
      status: "visited",
      feedbackRequestedAt: kst(2026, 11, 4, 8).toISOString(),
      review: { id: "r9", rating: "down" },
    });
    expect(
      bandView({ visits: [y], now, local: null, directedLocal: false }),
    ).toMatchObject({ kind: "thanks", answer: "down", reviewId: "r9" });
  });

  it("안 갔어요로 답한 방문은 세부 입력 없이 고마움 줄 (FB-05)", () => {
    const y = visit(kst(2026, 11, 3, 12), {
      status: "not_visited",
      feedbackRequestedAt: kst(2026, 11, 4, 8).toISOString(),
    });
    expect(
      bandView({ visits: [y], now, local: null, directedLocal: false }),
    ).toMatchObject({ kind: "thanks", answer: "not_visited", reviewId: null });
  });

  it("어제 물은 방문에 답했으면 오늘은 띠가 없다", () => {
    const y = visit(kst(2026, 11, 2, 12), {
      status: "visited",
      feedbackRequestedAt: kst(2026, 11, 3, 8).toISOString(),
      review: { id: "r1", rating: "up" },
    });
    expect(
      bandView({ visits: [y], now, local: null, directedLocal: false }).kind,
    ).toBe("hidden");
  });

  it("오늘 이미 물은 방문은 다시 묻되 새로 묻는 것은 아니다(하루 1회)", () => {
    const y = visit(kst(2026, 11, 3, 12), {
      feedbackRequestedAt: kst(2026, 11, 4, 8).toISOString(),
    });
    expect(
      bandView({ visits: [y], now, local: null, directedLocal: false }),
    ).toMatchObject({ kind: "ask", isNewPrompt: false });
  });

  it("물을 방문이 없으면 숨김", () => {
    expect(
      bandView({ visits: [], now, local: null, directedLocal: false }).kind,
    ).toBe("hidden");
  });
});

describe("promptSource", () => {
  it("방문 출처를 그대로 쓴다(detail은 나 탭 상세의 길찾기, 2026-11-01)", () => {
    expect(promptSource(visit(now, { source: "detail" }))).toBe("detail");
    expect(promptSource(visit(now, { source: "poll" }))).toBe("poll");
  });
});

describe("집계 포함 고지 (T6.28)", () => {
  it("가입 화면과 후기 시트가 같은 문장을 쓴다(D-11 안건 8)", () => {
    expect(authCopy.terms.reviewNotice).toBe(feedbackCopy.aggregateNote);
  });
});
