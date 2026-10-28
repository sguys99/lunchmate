import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "@/lib/format";
import { DAY_MS, HOUR_MS, MINUTE_MS, fromKstWallTime } from "@/lib/time";

const ago = (now: Date, ms: number) => new Date(now.getTime() - ms);

describe("formatRelativeTime", () => {
  const now = fromKstWallTime(2026, 10, 29, 12, 0); // KST 10/29 12:00

  it("1분 미만은 방금 (0, 59.999초)", () => {
    expect(formatRelativeTime(now, now)).toBe("방금");
    expect(formatRelativeTime(ago(now, MINUTE_MS - 1), now)).toBe("방금");
  });

  it("미래 시각(시계 차이)도 방금", () => {
    expect(formatRelativeTime(ago(now, -5 * MINUTE_MS), now)).toBe("방금");
  });

  it("N분 전 (내림, 경계)", () => {
    expect(formatRelativeTime(ago(now, MINUTE_MS), now)).toBe("1분 전");
    expect(formatRelativeTime(ago(now, 12 * MINUTE_MS + 59_000), now)).toBe(
      "12분 전",
    );
    expect(formatRelativeTime(ago(now, HOUR_MS - 1), now)).toBe("59분 전");
  });

  it("N시간 전 (내림, 경계)", () => {
    expect(formatRelativeTime(ago(now, HOUR_MS), now)).toBe("1시간 전");
    expect(
      formatRelativeTime(ago(now, 3 * HOUR_MS + 59 * MINUTE_MS), now),
    ).toBe("3시간 전");
    expect(formatRelativeTime(ago(now, DAY_MS - 1), now)).toBe("23시간 전");
  });

  it("자정을 넘어도 24시간 안이면 시간으로", () => {
    const earlyMorning = fromKstWallTime(2026, 10, 29, 1, 0);
    const lastNight = fromKstWallTime(2026, 10, 28, 22, 0);
    expect(formatRelativeTime(lastNight, earlyMorning)).toBe("3시간 전");
  });

  it("24시간 이상이고 KST 달력으로 하루 전이면 어제", () => {
    expect(formatRelativeTime(ago(now, DAY_MS), now)).toBe("어제");
    const yesterdayMorning = fromKstWallTime(2026, 10, 28, 0, 0);
    expect(formatRelativeTime(yesterdayMorning, now)).toBe("어제");
  });

  it("KST 날짜로 센다 (UTC 날짜가 아니라)", () => {
    // KST 10/27 23:30 → now KST 10/29 12:00: 이틀 전
    expect(formatRelativeTime(fromKstWallTime(2026, 10, 27, 23, 30), now)).toBe(
      "2일 전",
    );
  });

  it("2~6일 전", () => {
    expect(formatRelativeTime(ago(now, 3 * DAY_MS), now)).toBe("3일 전");
    expect(formatRelativeTime(ago(now, 6 * DAY_MS), now)).toBe("6일 전");
  });

  it("7일 이상은 날짜 (같은 해, 다른 해)", () => {
    expect(formatRelativeTime(ago(now, 7 * DAY_MS), now)).toBe("10월 22일");
    expect(formatRelativeTime(fromKstWallTime(2025, 12, 31, 23, 0), now)).toBe(
      "2025년 12월 31일",
    );
  });

  it("연초에 작년 말 KST 날짜", () => {
    const newYear = fromKstWallTime(2027, 1, 1, 9, 0);
    expect(
      formatRelativeTime(fromKstWallTime(2026, 12, 31, 8, 0), newYear),
    ).toBe("어제");
    expect(
      formatRelativeTime(fromKstWallTime(2026, 12, 20, 8, 0), newYear),
    ).toBe("2026년 12월 20일");
  });

  it("잘못된 Date는 RangeError", () => {
    expect(() => formatRelativeTime(new Date("nope"), now)).toThrow(RangeError);
    expect(() => formatRelativeTime(now, new Date(Number.NaN))).toThrow(
      RangeError,
    );
  });
});
