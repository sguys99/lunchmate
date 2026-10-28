import { describe, expect, it } from "vitest";

import { countdownFromMs, countdownUntil, formatCountdown } from "@/lib/format";
import { HOUR_MS, MINUTE_MS, fromKstWallTime } from "@/lib/time";

describe("countdownFromMs", () => {
  it("1시간 미만은 m:ss", () => {
    expect(formatCountdown(3 * MINUTE_MS + 12_000)).toBe("3:12");
    expect(formatCountdown(59 * MINUTE_MS + 59_000)).toBe("59:59");
    expect(formatCountdown(5_000)).toBe("0:05");
  });

  it("1시간 이상은 h:mm:ss", () => {
    expect(formatCountdown(HOUR_MS + 2 * MINUTE_MS + 5_000)).toBe("1:02:05");
    expect(formatCountdown(HOUR_MS)).toBe("1:00:00");
    expect(formatCountdown(24 * HOUR_MS)).toBe("24:00:00");
  });

  it("초는 올림 (1ms 남아도 0:01, 정각 전에 0:00이 뜨지 않는다)", () => {
    expect(formatCountdown(1)).toBe("0:01");
    expect(formatCountdown(1_001)).toBe("0:02");
    expect(formatCountdown(HOUR_MS - 1)).toBe("1:00:00");
  });

  it("0과 음수는 마감", () => {
    expect(countdownFromMs(0)).toEqual({ status: "closed" });
    expect(countdownFromMs(-1)).toEqual({ status: "closed" });
    expect(countdownFromMs(-Infinity)).toEqual({ status: "closed" });
    expect(formatCountdown(0)).toBeNull();
  });

  it("숫자 성분을 나눠 준다 (NumberFlow용)", () => {
    expect(countdownFromMs(HOUR_MS + 2 * MINUTE_MS + 5_000)).toEqual({
      status: "open",
      totalSeconds: 3725,
      hours: 1,
      minutes: 2,
      seconds: 5,
      hasHours: true,
      text: "1:02:05",
    });
    expect(countdownFromMs(192_000)).toMatchObject({
      hours: 0,
      minutes: 3,
      seconds: 12,
      hasHours: false,
    });
  });

  it("큰 수", () => {
    expect(formatCountdown(100 * HOUR_MS)).toBe("100:00:00");
  });

  it("NaN, Infinity는 RangeError", () => {
    expect(() => countdownFromMs(Number.NaN)).toThrow(RangeError);
    expect(() => countdownFromMs(Infinity)).toThrow(RangeError);
  });
});

describe("countdownUntil (마감 정각 포함)", () => {
  const deadline = fromKstWallTime(2026, 10, 29, 11, 30);
  const at = (ms: number) => new Date(deadline.getTime() + ms);

  it("마감 전", () => {
    expect(countdownUntil(deadline, at(-192_000))).toMatchObject({
      status: "open",
      text: "3:12",
    });
    expect(countdownUntil(deadline, at(-1))).toMatchObject({ text: "0:01" });
  });

  it("마감 정각과 이후는 closed", () => {
    expect(countdownUntil(deadline, deadline)).toEqual({ status: "closed" });
    expect(countdownUntil(deadline, at(60_000))).toEqual({ status: "closed" });
  });

  it("잘못된 Date는 RangeError", () => {
    expect(() => countdownUntil(new Date("x"), deadline)).toThrow(RangeError);
  });
});
