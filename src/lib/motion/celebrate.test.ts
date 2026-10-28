/**
 * 결정 축하 (T2.13): 축소 모드면 모듈을 받지 않고 생략, 색은 hex로 바꿔 넘긴다.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const confetti = vi.hoisted(() => vi.fn(() => null));
vi.mock("canvas-confetti", () => ({ default: confetti }));

import { CELEBRATE_BURST, celebrate, toHex } from "./celebrate";

afterEach(() => {
  confetti.mockClear();
});

describe("toHex", () => {
  it("0~255 정수를 두 자리 16진수로", () => {
    expect(toHex([0, 15, 255])).toBe("#000fff");
  });

  it("범위 밖과 소수는 잘라서 반올림", () => {
    expect(toHex([-3, 300, 127.6])).toBe("#00ff80");
  });
});

describe("celebrate", () => {
  it("축소 모드면 아무것도 그리지 않는다", async () => {
    await expect(celebrate({ reduced: true })).resolves.toBe("skipped");
    expect(confetti).not.toHaveBeenCalled();
  });

  it("양은 라이브러리 기본값(입자 50, 틱 200)보다 적고 짧다", () => {
    expect(CELEBRATE_BURST.particleCount).toBeLessThan(50);
    expect(CELEBRATE_BURST.ticks).toBeLessThan(200);
  });
});
