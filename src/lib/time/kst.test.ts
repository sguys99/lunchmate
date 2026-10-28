import { describe, expect, it } from "vitest";

import {
  addKstDays,
  fromKstWallTime,
  getKstParts,
  isSameKstDay,
  kstDateKey,
  kstDayDiff,
  kstMinutesOfDay,
  startOfKstDay,
} from "@/lib/time";

const utc = (iso: string) => new Date(iso);

describe("getKstParts", () => {
  it("UTC에 9시간을 더한 벽시계 성분을 돌려준다", () => {
    expect(getKstParts(utc("2026-10-28T03:04:05Z"))).toEqual({
      year: 2026,
      month: 10,
      day: 28,
      hour: 12,
      minute: 4,
      second: 5,
      weekday: 3,
    });
  });

  it("KST 자정은 시(hour)가 24가 아니라 0이다", () => {
    const p = getKstParts(utc("2026-10-27T15:00:00Z"));
    expect(p).toMatchObject({
      month: 10,
      day: 28,
      hour: 0,
      minute: 0,
      weekday: 3,
    });
  });

  it("UTC 23:59는 KST로 다음 날 08:59다", () => {
    const p = getKstParts(utc("2026-10-27T23:59:00Z"));
    expect(p).toMatchObject({ day: 28, hour: 8, minute: 59 });
  });

  it("연말 UTC 15:00은 KST로 다음 해 1월 1일이다", () => {
    const p = getKstParts(utc("2026-12-31T15:00:00Z"));
    expect(p).toMatchObject({
      year: 2027,
      month: 1,
      day: 1,
      hour: 0,
      weekday: 5,
    });
  });

  it("잘못된 Date는 RangeError", () => {
    expect(() => getKstParts(new Date("nope"))).toThrow(RangeError);
  });
});

describe("kstDateKey / isSameKstDay", () => {
  it("KST 날짜 기준 키를 만든다 (UTC 날짜와 다를 수 있다)", () => {
    expect(kstDateKey(utc("2026-10-27T14:59:59.999Z"))).toBe("2026-10-27");
    expect(kstDateKey(utc("2026-10-27T15:00:00Z"))).toBe("2026-10-28");
  });

  it("윤년 2월 29일", () => {
    expect(kstDateKey(utc("2028-02-28T15:00:00Z"))).toBe("2028-02-29");
    expect(kstDateKey(utc("2028-02-29T15:00:00Z"))).toBe("2028-03-01");
  });

  it("같은 UTC 날짜라도 KST 자정을 넘으면 다른 날", () => {
    expect(
      isSameKstDay(utc("2026-10-27T14:00:00Z"), utc("2026-10-27T16:00:00Z")),
    ).toBe(false);
  });

  it("다른 UTC 날짜라도 같은 KST 날짜면 같은 날", () => {
    expect(
      isSameKstDay(
        utc("2026-10-27T15:00:00Z"),
        utc("2026-10-28T14:59:59.999Z"),
      ),
    ).toBe(true);
  });
});

describe("startOfKstDay / fromKstWallTime / addKstDays", () => {
  it("KST 자정은 전날 UTC 15:00", () => {
    expect(startOfKstDay(utc("2026-10-28T05:00:00Z")).toISOString()).toBe(
      "2026-10-27T15:00:00.000Z",
    );
  });

  it("KST 자정 직전 순간은 그 전날 시작으로", () => {
    expect(startOfKstDay(utc("2026-10-27T14:59:59.999Z")).toISOString()).toBe(
      "2026-10-26T15:00:00.000Z",
    );
  });

  it("연초 1월 1일 KST 자정", () => {
    expect(startOfKstDay(utc("2027-01-01T00:00:00Z")).toISOString()).toBe(
      "2026-12-31T15:00:00.000Z",
    );
  });

  it("벽시계 시각을 순간으로 바꾼다", () => {
    expect(fromKstWallTime(2026, 10, 28, 11, 30).toISOString()).toBe(
      "2026-10-28T02:30:00.000Z",
    );
  });

  it("날짜 넘침을 정규화한다 (윤년 2월 28일 + 1일)", () => {
    const start = fromKstWallTime(2028, 2, 28, 12);
    expect(kstDateKey(addKstDays(start, 1))).toBe("2028-02-29");
    expect(kstDateKey(addKstDays(start, 2))).toBe("2028-03-01");
    expect(kstDateKey(addKstDays(fromKstWallTime(2027, 2, 28), 1))).toBe(
      "2027-03-01",
    );
  });

  it("연말에서 다음 해로 넘어간다", () => {
    expect(
      kstDateKey(addKstDays(fromKstWallTime(2026, 12, 31, 23, 59), 1)),
    ).toBe("2027-01-01");
    expect(kstDateKey(addKstDays(fromKstWallTime(2027, 1, 1), -1))).toBe(
      "2026-12-31",
    );
  });

  it("KST 달력 날짜 차이", () => {
    expect(
      kstDayDiff(utc("2026-10-27T14:59:00Z"), utc("2026-10-27T15:00:00Z")),
    ).toBe(1);
    expect(
      kstDayDiff(fromKstWallTime(2026, 12, 30), fromKstWallTime(2027, 1, 2)),
    ).toBe(3);
  });

  it("하루 중 경과 분", () => {
    expect(kstMinutesOfDay(fromKstWallTime(2026, 10, 28, 13, 29))).toBe(
      13 * 60 + 29,
    );
  });
});
