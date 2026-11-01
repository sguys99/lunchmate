// 투표 만들기 시안 목업 규칙 (T7.2): 마감 빠른 선택, 만들 수 있는 조건, 쿼리 해석.
import { describe, expect, it } from "vitest";
import {
  canCreate,
  clockOf,
  customDefault,
  deadlineAt,
  deadlineOptions,
  initialDraft,
  nowMinutes,
} from "./mock";
import { parsePollCreateParams } from "./params";

describe("마감 빠른 선택", () => {
  it("11:05에는 10분 뒤, 30분 뒤, 11:30, 직접", () => {
    const ids = deadlineOptions("lunch", nowMinutes("noon")).map((o) => o.id);
    expect(ids).toEqual(["in10", "in30", "fixed", "custom"]);
  });

  it("11:30이 지났으면 그 칩 대신 1시간 뒤", () => {
    const ids = deadlineOptions("lunch", nowMinutes("late")).map((o) => o.id);
    expect(ids).toEqual(["in10", "in30", "in60", "custom"]);
  });

  it("11:25에는 11:30이 10분 안이라 1시간 뒤로 바꾼다", () => {
    const ids = deadlineOptions("lunch", 11 * 60 + 25).map((o) => o.id);
    expect(ids).toContain("in60");
    expect(ids).not.toContain("fixed");
  });

  it("회식은 1시간 뒤, 오늘 18:00, 내일 12:00, 직접", () => {
    const opts = deadlineOptions("party", nowMinutes("noon"));
    expect(opts.map((o) => o.id)).toEqual([
      "in60",
      "today18",
      "tomorrow12",
      "custom",
    ]);
    expect(clockOf(opts[2]!.at!)).toEqual({ hhmm: "12:00", tomorrow: true });
  });

  it("직접 입력은 10분 뒤부터, 기본값은 30분 뒤를 5분 단위로 올림", () => {
    const now = nowMinutes("noon");
    const d = {
      ...initialDraft(parsePollCreateParams({})),
      deadline: "custom" as const,
    };
    expect(deadlineAt({ ...d, customAt: "11:10" }, now)).toBeNull();
    expect(deadlineAt({ ...d, customAt: "11:15" }, now)).toBe(11 * 60 + 15);
    expect(customDefault(now)).toBe("11:35");
  });
});

describe("만들 수 있는 조건", () => {
  const now = nowMinutes("noon");

  it("빠른 투표는 오늘 카드 3장, 30분 뒤, 한 곳만으로 바로 만들 수 있다", () => {
    const d = initialDraft(parsePollCreateParams({}));
    expect(d.candidates).toHaveLength(3);
    expect(d.deadline).toBe("in30");
    expect(d.multi).toBe(false);
    expect(canCreate(d, now)).toBe(true);
  });

  it("상세에서 연 한 곳만으로는 만들 수 없다(후보 2곳 이상)", () => {
    const d = initialDraft(parsePollCreateParams({ entry: "detail" }));
    expect(d.candidates).toHaveLength(1);
    expect(canCreate(d, now)).toBe(false);
  });

  it("회식 모드는 다섯 곳, 회식, 오늘 18:00", () => {
    const d = initialDraft(parsePollCreateParams({ entry: "party" }));
    expect(d.candidates).toHaveLength(5);
    expect(d.kind).toBe("party");
    expect(d.title).toMatch(/회식$/);
    expect(d.deadline).toBe("today18");
  });
});

describe("쿼리", () => {
  it("4상태는 시트를 연 채로 시작한다", () => {
    expect(parsePollCreateParams({ state: "offline" }).flow).toBe("compose");
    expect(parsePollCreateParams({ state: "error", fail: "share" }).flow).toBe(
      "share",
    );
    expect(parsePollCreateParams({}).flow).toBe("home");
  });
});
