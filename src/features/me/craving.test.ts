// 요즘 이게 땡겨요 남은 날 (T4.26, SET-05). KST 달력 날짜로 센다.
import { describe, expect, it } from "vitest";
import { cravingStatus, knownCravings, sameCravings } from "./craving";

// KST 2026-10-30 10:00 = UTC 01:00
const NOW = new Date("2026-10-30T01:00:00Z");

describe("cravingStatus", () => {
  it("고른 직후(서버 시각 + 7일)는 7일 남음", () => {
    expect(cravingStatus(["hansik"], "2026-11-06T01:00:00Z", NOW)).toEqual({
      kind: "active",
      daysLeft: 7,
    });
  });

  it("KST 날짜로 센다: 만료가 KST 다음 날 새벽이면 1일", () => {
    // UTC 10/30 16:00 = KST 10/31 01:00
    expect(cravingStatus(["ilsik"], "2026-10-30T16:00:00Z", NOW)).toEqual({
      kind: "active",
      daysLeft: 1,
    });
  });

  it("오늘 안에 끝나면 0(오늘까지)", () => {
    expect(cravingStatus(["ilsik"], "2026-10-30T09:00:00Z", NOW)).toEqual({
      kind: "active",
      daysLeft: 0,
    });
  });

  it("만료 시각에 닿으면 끝남(경계 포함)", () => {
    expect(cravingStatus(["ilsik"], "2026-10-30T01:00:00Z", NOW)).toEqual({
      kind: "expired",
    });
  });

  it("고른 것이 없으면 none", () => {
    expect(cravingStatus([], null, NOW)).toEqual({ kind: "none" });
  });
});

describe("knownCravings, sameCravings", () => {
  it("알려진 slug만 12종 순서로", () => {
    expect(knownCravings(["pub", "x", "hansik"])).toEqual(["hansik", "pub"]);
  });

  it("순서와 무관하게 같은 집합", () => {
    expect(sameCravings(["a", "b"], ["b", "a"])).toBe(true);
    expect(sameCravings(["a"], ["a", "b"])).toBe(false);
  });
});
