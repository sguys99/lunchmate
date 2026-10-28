/**
 * 결정 축하 효과 (T2.13 PoC, tasks.md 2.4절 canvas-confetti). 투표 확정, "그냥 골라줘" 결과에서 쓴다.
 *
 * - canvas-confetti는 처음 부를 때 동적 import한다(첫 번들에 넣지 않는다). preloadCelebrate()로 미리 받을 수 있다.
 * - 축소 모드(앱 설정 또는 OS)면 모듈도 받지 않고 바로 "skipped". 라이브러리의 disableForReducedMotion도 함께 켠다.
 * - 색은 하드코딩하지 않는다. 지금 테마의 토큰 CSS 변수(oklch)를 읽어 캔버스에 한 번 칠한 뒤 픽셀 값을 #rrggbb로 바꿔 넘긴다.
 *   canvas-confetti는 hex만 읽기 때문이다. 변환에 실패하면 무지개 기본색 대신 효과를 생략한다.
 * - 양은 절제한다(Quiet Stone): 입자 적게, 짧게, 작게. 숫자는 "얼마나"만 정하고 색과 시간 토큰은 건드리지 않는다.
 *
 * 사용: `await celebrate({ reduced, origin: originOf(buttonEl) })`
 */
import type { Options } from "canvas-confetti";

/** 축하 조각에 쓸 토큰. 올리브 주색과 같은 계열의 옅은 단계만 쓴다. */
export const CELEBRATE_COLOR_TOKENS = [
  "--primary",
  "--chart-2",
  "--chart-3",
  "--chart-5",
] as const;

/** 한 번 터뜨리는 양. 기본값(입자 50, 틱 200)보다 적고 짧다. */
export const CELEBRATE_BURST = {
  particleCount: 28,
  spread: 58,
  startVelocity: 26,
  gravity: 1.1,
  decay: 0.9,
  ticks: 110,
  scalar: 0.75,
  shapes: ["square", "circle"],
} as const satisfies Options;

export type CelebrateResult = "fired" | "skipped" | "unsupported";

type ConfettiFn = (options?: Options) => Promise<undefined> | null;

let confettiPromise: Promise<ConfettiFn> | null = null;

/** canvas-confetti를 한 번만 받는다. 버튼 hover나 확정 직전에 미리 불러도 된다. */
export function preloadCelebrate(): Promise<ConfettiFn> {
  confettiPromise ??= import("canvas-confetti").then((mod) => mod.default);
  return confettiPromise;
}

/** [r, g, b] (0~255) → #rrggbb */
export function toHex([r, g, b]: readonly [number, number, number]): string {
  const part = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

/**
 * 토큰 변수 → hex. 캔버스 fillStyle이 oklch를 해석하게 하고 칠한 픽셀을 읽는다.
 * 해석하지 못한 값은 빠진다(빈 배열이면 효과를 생략한다).
 */
export function readTokenColors(
  names: readonly string[] = CELEBRATE_COLOR_TOKENS,
  scope: Element = document.documentElement,
): string[] {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  const style = getComputedStyle(scope);
  const out: string[] = [];
  for (const name of names) {
    const value = style.getPropertyValue(name).trim();
    if (!value) continue;
    // 해석 실패를 알아보려고 투명으로 비운 뒤 칠한다. 실패하면 fillStyle이 그대로 남아 알파 0이 읽힌다.
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "transparent";
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0, a = 0] = ctx.getImageData(0, 0, 1, 1).data;
    if (a > 0) out.push(toHex([r, g, b]));
  }
  return out;
}

/** 요소 가운데를 화면 비율 좌표(0~1)로. 축하가 누른 버튼에서 피어나게 한다. */
export function originOf(el: Element | null): { x: number; y: number } {
  if (!el || typeof window === "undefined") return { x: 0.5, y: 0.6 };
  const r = el.getBoundingClientRect();
  return {
    x: (r.left + r.width / 2) / window.innerWidth,
    y: (r.top + r.height / 2) / window.innerHeight,
  };
}

export async function celebrate({
  reduced,
  origin,
  scope,
}: {
  /** useMotionReduced() 값 */
  reduced: boolean;
  origin?: { x: number; y: number };
  /** 토큰을 읽을 요소. 기본은 <html> */
  scope?: Element;
}): Promise<CelebrateResult> {
  if (reduced) return "skipped";
  const colors = readTokenColors(CELEBRATE_COLOR_TOKENS, scope);
  if (colors.length === 0) return "unsupported";
  const confetti = await preloadCelebrate();
  // 반환 Promise는 조각이 다 떨어질 때 풀린다. 기다리지 않는다(화면 전환을 막지 않게).
  void confetti({
    ...CELEBRATE_BURST,
    shapes: [...CELEBRATE_BURST.shapes],
    colors,
    origin,
    disableForReducedMotion: true,
  });
  return "fired";
}
