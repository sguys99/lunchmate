/*
 * 생성물, 직접 수정 금지. 원본: DESIGN.md (루트) 프런트매터 motion
 * 다시 만들기: pnpm tokens (scripts/build-tokens.ts, 변환: src/lib/design/to-ts.ts)
 * final "Quiet Stone" (final)
 * 단위: duration, stagger는 ms. easing은 cubic-bezier(x1, y1, x2, y2).
 */
import type { DesignFrontmatter } from "@/lib/design/schema";

export const motionTokens: DesignFrontmatter["motion"] = {
  duration: { fast: 180, base: 260, slow: 300 },
  easing: {
    standard: [0.3, 0, 0.2, 1],
    enter: [0.22, 1, 0.36, 1],
    exit: [0.5, 0, 0.75, 0],
    emphasized: [0.4, 0, 0.1, 1],
  },
  spring: {
    swipe: { stiffness: 260, damping: 34, mass: 1 },
    sheet: { stiffness: 170, damping: 28, mass: 1 },
    shuffle: { stiffness: 200, damping: 30, mass: 1 },
    press: { stiffness: 500, damping: 36, mass: 0.6 },
    bar: { stiffness: 120, damping: 24, mass: 1 },
  },
  stagger: 70,
  reducedMotion: "instant",
};
