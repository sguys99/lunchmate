import { describe, expect, it } from "vitest";
import { HOUR_MS } from "./constants";
import {
  businessMsBetween,
  dateKeyDiff,
  HOLIDAY_TABLE_LAST_YEAR,
  isKstBusinessDay,
  isKstHoliday,
  isWithinBusinessWindow,
  KR_PUBLIC_HOLIDAYS,
} from "./holidays";
import { fromKstWallTime, getKstParts } from "./kst";

const kst = (y: number, m: number, d: number, h = 0, min = 0) =>
  fromKstWallTime(y, m, d, h, min);

describe("공휴일 표 (월력요항 2026, 2027)", () => {
  it.each([
    ["2026-03-02", "3.1절 대체"],
    ["2026-05-01", "노동절(2026 개정)"],
    ["2026-05-25", "부처님오신날 대체"],
    ["2026-06-03", "지방선거"],
    ["2026-07-17", "제헌절(2026 개정)"],
    ["2026-08-17", "광복절 대체"],
    ["2026-10-05", "개천절 대체"],
    ["2027-02-09", "설날 대체"],
    ["2027-05-03", "노동절 대체"],
    ["2027-07-19", "제헌절 대체"],
    ["2027-10-11", "한글날 대체"],
    ["2027-12-27", "성탄절 대체"],
  ])("%s %s", (key) => {
    expect(KR_PUBLIC_HOLIDAYS[key]).toBeDefined();
  });
  it("2026년 22일, 2027년 24일 (대체공휴일, 선거일 포함)", () => {
    const keys = Object.keys(KR_PUBLIC_HOLIDAYS);
    expect(keys.filter((k) => k.startsWith("2026-"))).toHaveLength(22);
    expect(keys.filter((k) => k.startsWith("2027-"))).toHaveLength(24);
  });
  it("표가 올해와 내년을 담는다(해마다 늘리기 알림)", () => {
    const year = getKstParts(new Date()).year;
    expect(HOLIDAY_TABLE_LAST_YEAR).toBeGreaterThanOrEqual(
      Math.min(year + 1, 2027),
    );
  });
  it("KST 날짜로 판정한다(UTC 전날 15시 = KST 자정)", () => {
    expect(isKstHoliday(new Date("2026-12-24T15:00:00Z"))).toBe(true);
    expect(isKstHoliday(new Date("2026-12-24T14:59:59Z"))).toBe(false);
  });
  it("영업일: 주말과 공휴일 제외", () => {
    expect(isKstBusinessDay(kst(2026, 11, 6, 12))).toBe(true); // 금
    expect(isKstBusinessDay(kst(2026, 11, 7, 12))).toBe(false); // 토
    expect(isKstBusinessDay(kst(2026, 10, 9, 12))).toBe(false); // 한글날(금)
  });
});

describe("businessMsBetween", () => {
  it("평일 안", () => {
    expect(businessMsBetween(kst(2026, 11, 3, 12), kst(2026, 11, 4, 12))).toBe(
      24 * HOUR_MS,
    );
  });
  it("금 12시 → 월 12시는 24시간", () => {
    expect(businessMsBetween(kst(2026, 11, 6, 12), kst(2026, 11, 9, 12))).toBe(
      24 * HOUR_MS,
    );
  });
  it("토요일 방문은 월요일 0시부터 센다", () => {
    expect(
      businessMsBetween(kst(2026, 11, 7, 12), kst(2026, 11, 9, 10)),
    ).toBe(10 * HOUR_MS);
  });
  it("추석 연휴와 개천절 대체공휴일을 건너뛴다", () => {
    // 수 9/23 12~24시 12시간 + 목~토 추석, 일요일 0 + 월 9/28 0~12시 12시간
    expect(
      businessMsBetween(kst(2026, 9, 23, 12), kst(2026, 9, 28, 12)),
    ).toBe(24 * HOUR_MS);
  });
  it("거꾸로면 0", () => {
    expect(businessMsBetween(kst(2026, 11, 4), kst(2026, 11, 3))).toBe(0);
  });
});

describe("isWithinBusinessWindow (FB-04 48시간)", () => {
  const fri = kst(2026, 11, 6, 12, 30);
  it("금요일 점심 방문은 월요일 내내, 화요일 12:30 전까지 묻는다", () => {
    expect(isWithinBusinessWindow(fri, 48 * HOUR_MS, kst(2026, 11, 9, 23))).toBe(
      true,
    );
    expect(
      isWithinBusinessWindow(fri, 48 * HOUR_MS, kst(2026, 11, 10, 12, 29)),
    ).toBe(true);
    expect(
      isWithinBusinessWindow(fri, 48 * HOUR_MS, kst(2026, 11, 10, 12, 30)),
    ).toBe(false);
  });
  it("성탄절(금) 앞 목요일 방문은 다음 월요일에도 묻는다", () => {
    expect(
      isWithinBusinessWindow(
        kst(2026, 12, 24, 12),
        48 * HOUR_MS,
        kst(2026, 12, 28, 18),
      ),
    ).toBe(true);
  });
});

describe("dateKeyDiff", () => {
  it("달력 날짜 차이", () => {
    expect(dateKeyDiff("2026-10-31", "2026-11-01")).toBe(1);
    expect(dateKeyDiff("2026-11-01", "2026-11-15")).toBe(14);
    expect(dateKeyDiff("2026-11-01", "2026-11-01")).toBe(0);
    expect(Number.isNaN(dateKeyDiff("bad", "2026-11-01"))).toBe(true);
  });
});
