import { describe, expect, it } from "vitest";
import { fromKstWallTime } from "@/lib/time";
import {
  clockOf,
  customDefault,
  deadlineMinutes,
  deadlineOptions,
  defaultDeadline,
  fixedSwapped,
  kstWeekdayName,
  minutesFromToday,
  parseDateTimeInput,
  parseTimeInput,
  toClosesAt,
  toDateTimeInput,
} from "./deadline";

const at = (h: number, m: number) => h * 60 + m;

describe("마감 빠른 선택 (POLL-01, D-15 안건 4~6)", () => {
  it("점심 11:05면 10분 뒤, 30분 뒤, 11:30, 직접", () => {
    expect(deadlineOptions("lunch", at(11, 5))).toEqual([
      { id: "in10", at: at(11, 15) },
      { id: "in30", at: at(11, 35) },
      { id: "fixed", at: at(11, 30) },
      { id: "custom", at: null },
    ]);
    expect(fixedSwapped("lunch", at(11, 5))).toBe(false);
  });

  it("11:30이 10분 안이거나 지났으면 그 칸이 1시간 뒤(칸 수 4 유지)", () => {
    for (const now of [at(11, 21), at(11, 45)]) {
      const o = deadlineOptions("lunch", now);
      expect(o).toHaveLength(4);
      expect(o[2]).toEqual({ id: "in60", at: now + 60 });
      expect(fixedSwapped("lunch", now)).toBe(true);
    }
    // 정확히 10분 앞은 고를 수 있다
    expect(deadlineOptions("lunch", at(11, 20))[2]?.id).toBe("fixed");
  });

  it("저녁 고정 칸은 18:00", () => {
    expect(deadlineOptions("dinner", at(16, 0))[2]).toEqual({
      id: "fixed",
      at: at(18, 0),
    });
  });

  it("회식: 1시간 뒤, 오늘 18:00, 내일 12:00, 직접. 18:00이 10분 안이면 빠지고 기본이 내일 12:00", () => {
    expect(deadlineOptions("party", at(15, 0)).map((o) => o.id)).toEqual([
      "in60",
      "today18",
      "tomorrow12",
      "custom",
    ]);
    expect(defaultDeadline("party", at(15, 0))).toBe("today18");
    expect(deadlineOptions("party", at(17, 55)).map((o) => o.id)).toEqual([
      "in60",
      "tomorrow12",
      "custom",
    ]);
    expect(defaultDeadline("party", at(17, 55))).toBe("tomorrow12");
    expect(deadlineOptions("party", at(15, 0))[2]?.at).toBe(1440 + 720);
  });

  it("기본 마감은 점심, 저녁 30분 뒤 (안건 6)", () => {
    expect(defaultDeadline("lunch", at(11, 0))).toBe("in30");
    expect(defaultDeadline("dinner", at(17, 0))).toBe("in30");
  });

  it("고른 칸이 시간이 흘러 사라지면 같은 자리의 새 칸", () => {
    expect(
      deadlineMinutes("lunch", { id: "fixed", custom: null }, at(11, 25)),
    ).toBe(at(12, 25));
  });

  it("직접: 10분 뒤부터, 점심과 저녁은 오늘 안, 회식은 7일 안", () => {
    const now = at(11, 0);
    expect(
      deadlineMinutes("lunch", { id: "custom", custom: at(11, 9) }, now),
    ).toBeNull();
    expect(
      deadlineMinutes("lunch", { id: "custom", custom: at(11, 10) }, now),
    ).toBe(at(11, 10));
    expect(
      deadlineMinutes("lunch", { id: "custom", custom: 1440 + 10 }, now),
    ).toBeNull();
    expect(
      deadlineMinutes("lunch", { id: "custom", custom: null }, now),
    ).toBeNull();
    expect(
      deadlineMinutes("party", { id: "custom", custom: 3 * 1440 }, now),
    ).toBe(3 * 1440);
    expect(
      deadlineMinutes("party", { id: "custom", custom: 8 * 1440 }, now),
    ).toBeNull();
  });

  it("직접 입력 기본값은 30분 뒤를 5분 단위로 올림", () => {
    expect(customDefault(at(11, 2))).toBe(at(11, 35));
  });
});

describe("시각 변환 (KST)", () => {
  const now = fromKstWallTime(2026, 11, 4, 11, 5); // 수요일

  it("분과 순간을 오간다", () => {
    const d = toClosesAt(now, at(11, 35));
    expect(d.toISOString()).toBe("2026-11-04T02:35:00.000Z");
    expect(minutesFromToday(now, d)).toBe(at(11, 35));
    expect(clockOf(1440 + 720)).toEqual({ hhmm: "12:00", dayOffset: 1 });
  });

  it("입력 값 읽기", () => {
    expect(parseTimeInput("12:05")).toBe(at(12, 5));
    expect(parseTimeInput("25:00")).toBeNull();
    expect(parseDateTimeInput("2026-11-05T18:00", now)).toBe(1440 + at(18, 0));
    expect(toDateTimeInput(now, 1440 + at(18, 0))).toBe("2026-11-05T18:00");
    expect(parseDateTimeInput("bad", now)).toBeNull();
  });

  it("제목 기본값 요일", () => {
    expect(kstWeekdayName(now)).toBe("수요일");
  });
});
