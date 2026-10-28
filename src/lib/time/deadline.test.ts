import { describe, expect, it } from "vitest";

import {
  CRAVING_TTL_MS,
  FEEDBACK_WINDOW_MS,
  POLL_LINK_TTL_MS,
  WAIT_REPORT_TTL_MS,
  clampDealDays,
  dealEndDateKey,
  dealEndsAt,
  fromKstWallTime,
  isExpired,
  isPast,
  msSince,
  msUntil,
} from "@/lib/time";

const at = (base: Date, deltaMs: number) => new Date(base.getTime() + deltaMs);

describe("isPast / msUntil (마감 판정, 정각 포함)", () => {
  const deadline = fromKstWallTime(2026, 10, 28, 11, 30);

  it("1ms 전에는 마감 전", () => {
    expect(isPast(deadline, at(deadline, -1))).toBe(false);
    expect(msUntil(deadline, at(deadline, -1))).toBe(1);
  });

  it("마감 시각 정각은 이미 마감", () => {
    expect(isPast(deadline, deadline)).toBe(true);
    expect(msUntil(deadline, deadline)).toBe(0);
  });

  it("지난 뒤에는 남은 시간 0으로 고정", () => {
    expect(isPast(deadline, at(deadline, 1))).toBe(true);
    expect(msUntil(deadline, at(deadline, 60_000))).toBe(0);
  });

  it("msSince는 경과 시간, 미래면 0", () => {
    expect(msSince(deadline, at(deadline, 12 * 60_000))).toBe(12 * 60_000);
    expect(msSince(deadline, at(deadline, -5))).toBe(0);
  });
});

describe("isExpired (TTL 경계 포함)", () => {
  const start = new Date("2026-10-28T02:00:00Z");

  it.each([
    ["웨이팅 제보 30분 (PLACE-07)", WAIT_REPORT_TTL_MS, 30 * 60_000],
    ["피드백 48시간 (FB-04)", FEEDBACK_WINDOW_MS, 48 * 3_600_000],
    ["투표 링크 마감 후 24시간 (POLL-11)", POLL_LINK_TTL_MS, 24 * 3_600_000],
    ["땡겨요 7일 (SET-05)", CRAVING_TTL_MS, 7 * 86_400_000],
  ])("%s", (_name, ttl, expected) => {
    expect(ttl).toBe(expected);
    expect(isExpired(start, ttl, at(start, ttl - 1))).toBe(false);
    expect(isExpired(start, ttl, at(start, ttl))).toBe(true);
    expect(isExpired(start, ttl, at(start, ttl + 1))).toBe(true);
  });

  it("미래 시작 시각은 만료 아님", () => {
    expect(isExpired(start, WAIT_REPORT_TTL_MS, at(start, -1))).toBe(false);
  });
});

describe("할인 종료일 (DEAL-01, AC-DEAL-1)", () => {
  it("기본 7일: KST 등록일 + 7일", () => {
    expect(dealEndDateKey(fromKstWallTime(2026, 10, 28, 12))).toBe(
      "2026-11-04",
    );
  });

  it("KST 날짜 기준으로 센다 (UTC 10/27 15:00 = KST 10/28 00:00)", () => {
    expect(dealEndDateKey(new Date("2026-10-27T15:00:00Z"), 1)).toBe(
      "2026-10-29",
    );
    expect(dealEndDateKey(new Date("2026-10-27T14:59:59Z"), 1)).toBe(
      "2026-10-28",
    );
  });

  it("종료일 당일 23:59:59.999(KST)까지 보이고 다음 날 00:00에 숨긴다", () => {
    const start = fromKstWallTime(2026, 10, 28, 12);
    const endsAt = dealEndsAt(start);
    expect(endsAt.toISOString()).toBe("2026-11-04T15:00:00.000Z"); // KST 11/05 00:00
    expect(isPast(endsAt, at(endsAt, -1))).toBe(false);
    expect(isPast(endsAt, endsAt)).toBe(true);
  });

  it("최대 30일, 최소 1일로 맞춘다", () => {
    expect(clampDealDays(45)).toBe(30);
    expect(clampDealDays(0)).toBe(1);
    expect(clampDealDays(2.7)).toBe(2);
    expect(clampDealDays(Number.NaN)).toBe(7);
    expect(clampDealDays()).toBe(7);
    expect(dealEndDateKey(fromKstWallTime(2026, 12, 15), 99)).toBe(
      "2027-01-14",
    );
  });

  it("윤년 2월을 넘는다", () => {
    expect(dealEndDateKey(fromKstWallTime(2028, 2, 25), 7)).toBe("2028-03-03");
  });
});
