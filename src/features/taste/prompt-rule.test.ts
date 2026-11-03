import { describe, expect, it } from "vitest";
import { shouldShowTastePrompt } from "./prompt-rule";

const NOW = new Date("2026-11-03T03:00:00Z");
const daysAgo = (d: number) =>
  new Date(NOW.getTime() - d * 86_400_000).toISOString();
const base = {
  tastePrompt: { joinedAt: daysAgo(1), dismissedAt: null },
  avoidCount: 0,
  likedCount: 0,
  now: NOW,
};

describe("홈 취향 띠 노출 (T9.17, D-39)", () => {
  it("가입 7일 안, 둘 다 비었고 닫은 적 없으면 보인다", () => {
    expect(shouldShowTastePrompt(base)).toBe(true);
  });
  it("비로그인(null)이면 숨긴다", () => {
    expect(shouldShowTastePrompt({ ...base, tastePrompt: null })).toBe(false);
  });
  it("못 먹는 음식이나 좋아하는 음식이 하나라도 있으면 숨긴다", () => {
    expect(shouldShowTastePrompt({ ...base, avoidCount: 1 })).toBe(false);
    expect(shouldShowTastePrompt({ ...base, likedCount: 1 })).toBe(false);
  });
  it("닫았으면 숨긴다", () => {
    expect(
      shouldShowTastePrompt({
        ...base,
        tastePrompt: { joinedAt: daysAgo(1), dismissedAt: daysAgo(0) },
      }),
    ).toBe(false);
  });
  it("가입 7일이 지나면 숨긴다", () => {
    expect(
      shouldShowTastePrompt({
        ...base,
        tastePrompt: { joinedAt: daysAgo(6.9), dismissedAt: null },
      }),
    ).toBe(true);
    expect(
      shouldShowTastePrompt({
        ...base,
        tastePrompt: { joinedAt: daysAgo(7), dismissedAt: null },
      }),
    ).toBe(false);
  });
});
