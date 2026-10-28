/**
 * 햅틱 유틸 (T2.14)
 * - 지원 기기에서만 kind별 패턴으로 진동, 미지원(SSR, iOS Safari)이면 아무 동작 없음.
 * - 앱 설정 off, OS 축소 모드, 호출자 reduced면 진동하지 않는다.
 * - MIN_INTERVAL_MS 안의 연속 호출은 버린다.
 * - 브라우저 거부, 예외는 삼키고 false.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HAPTIC_PATTERNS,
  MIN_INTERVAL_MS,
  haptic,
  isHapticsEnabled,
  isHapticsSupported,
  resetHapticsForTest,
  setHapticsEnabled,
} from "./index";

let vibrate: ReturnType<typeof vi.fn>;

function stubBrowser({
  supported = true,
  reducedMotion = false,
}: { supported?: boolean; reducedMotion?: boolean } = {}) {
  vibrate = vi.fn(() => true);
  vi.stubGlobal("navigator", supported ? { vibrate } : {});
  vi.stubGlobal("window", {
    matchMedia: (query: string) => ({
      matches: reducedMotion && query === "(prefers-reduced-motion: reduce)",
    }),
  });
}

beforeEach(() => {
  resetHapticsForTest();
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("지원 기기", () => {
  it("tap은 10ms 한 번", () => {
    stubBrowser();
    expect(isHapticsSupported()).toBe(true);
    expect(haptic("tap")).toBe(true);
    expect(vibrate).toHaveBeenCalledWith(10);
  });

  it("success는 짧게 두 번(배열 패턴)", () => {
    stubBrowser();
    haptic("success");
    expect(vibrate).toHaveBeenCalledWith([12, 60, 12]);
  });

  it("모든 패턴은 한 번의 진동이 100ms 이하", () => {
    for (const pattern of Object.values(HAPTIC_PATTERNS)) {
      const list = typeof pattern === "number" ? [pattern] : pattern;
      list.forEach((ms, i) => {
        if (i % 2 === 0) expect(ms).toBeLessThanOrEqual(100);
      });
    }
  });

  it("브라우저가 거부하면(제스처 밖 호출 등) false", () => {
    stubBrowser();
    vibrate.mockReturnValue(false);
    expect(haptic("tap")).toBe(false);
  });

  it("vibrate가 던져도 예외를 삼킨다", () => {
    stubBrowser();
    vibrate.mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => haptic("tap")).not.toThrow();
    expect(haptic("warning")).toBe(false);
  });
});

describe("미지원 환경", () => {
  it("navigator.vibrate가 없으면(iOS Safari) 아무 동작 없이 false", () => {
    stubBrowser({ supported: false });
    expect(isHapticsSupported()).toBe(false);
    expect(haptic("tap")).toBe(false);
  });

  it("navigator, window가 없으면(SSR) false", () => {
    vi.stubGlobal("navigator", undefined);
    vi.stubGlobal("window", undefined);
    expect(isHapticsSupported()).toBe(false);
    expect(haptic("success")).toBe(false);
  });

  it("matchMedia가 없어도 동작한다", () => {
    stubBrowser();
    vi.stubGlobal("window", {});
    expect(haptic("tap")).toBe(true);
  });
});

describe("축소 모드", () => {
  it("OS prefers-reduced-motion: reduce면 진동하지 않는다", () => {
    stubBrowser({ reducedMotion: true });
    expect(haptic("tap")).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("호출자가 reduced: true(앱 모션 설정)를 넘기면 진동하지 않는다", () => {
    stubBrowser();
    expect(haptic("select", { reduced: true })).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
  });
});

describe("앱 설정", () => {
  it("setHapticsEnabled(false)면 진동하지 않고, 다시 켜면 진동한다", () => {
    stubBrowser();
    setHapticsEnabled(false);
    expect(isHapticsEnabled()).toBe(false);
    expect(haptic("tap")).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();

    setHapticsEnabled(true);
    expect(haptic("tap")).toBe(true);
    expect(vibrate).toHaveBeenCalledTimes(1);
  });
});

describe("스로틀", () => {
  it(`${MIN_INTERVAL_MS}ms 안의 연속 호출은 버린다`, () => {
    stubBrowser();
    expect(haptic("tap")).toBe(true);
    vi.advanceTimersByTime(MIN_INTERVAL_MS - 1);
    expect(haptic("tap")).toBe(false);
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it(`${MIN_INTERVAL_MS}ms가 지나면 다시 진동한다`, () => {
    stubBrowser();
    haptic("tap");
    vi.advanceTimersByTime(MIN_INTERVAL_MS);
    expect(haptic("select")).toBe(true);
    expect(vibrate).toHaveBeenCalledTimes(2);
  });

  it("꺼짐이나 축소로 버린 호출은 스로틀 시각을 바꾸지 않는다", () => {
    stubBrowser();
    haptic("tap", { reduced: true });
    expect(haptic("tap")).toBe(true);
  });
});
