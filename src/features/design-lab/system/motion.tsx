"use client";
// 디자인 랩 모션 공용 조각 (T1.14). 정식 프리셋 모듈은 T2.11 src/lib/motion에서 만든다.
//
// - Motion은 `m` 컴포넌트(`motion/react-m`) + LazyMotion strict로만 쓴다(CLAUDE.md 2장, tasks.md 2.4절).
//   strict라서 `motion.div`를 쓰면 런타임 오류가 난다. `import * as m from "motion/react-m"` 후 `m.div`.
// - 기본 기능은 domAnimation(동기). drag가 필요한 곳만 <LazyMotion features={loadDomMax}>로 감싼다(비동기).
// - prefers-reduced-motion: MotionConfig reducedMotion="user"가 transform/layout 애니메이션을 끈다.
//   그 밖의 효과(숫자 롤링, 쉬머, 자동 셔플 등)는 usePrefersReducedMotion()으로 직접 분기한다.
import {
  LazyMotion,
  MotionConfig,
  domAnimation,
  useReducedMotion,
  type Transition,
} from "motion/react";
import type { ReactNode } from "react";
import type {
  DesignMotionTokens,
  DurationStep,
  EasingPreset,
  SpringPreset,
} from "./types";

export function DesignMotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

/** drag(스와이프)가 필요한 영역만: <LazyMotion features={loadDomMax}>...</LazyMotion> */
export const loadDomMax = () => import("./dom-max").then((mod) => mod.default);

/** prefers-reduced-motion: reduce 이면 true. 서버 렌더와 첫 렌더에서는 false. */
export function usePrefersReducedMotion(): boolean {
  return useReducedMotion() ?? false;
}

/** 토큰 spring 프리셋 → Motion transition. 예: transition={springOf(tokens.motion, "swipe")} */
export function springOf(
  motion: DesignMotionTokens,
  preset: SpringPreset,
): Transition {
  const { stiffness, damping, mass } = motion.spring[preset];
  return { type: "spring", stiffness, damping, mass };
}

/** 토큰 duration + easing → Motion tween transition (초 단위로 바꾼다). */
export function tweenOf(
  motion: DesignMotionTokens,
  duration: DurationStep,
  easing: EasingPreset = "standard",
): Transition {
  const [x1, y1, x2, y2] = motion.easing[easing];
  return {
    type: "tween",
    duration: motion.duration[duration] / 1000,
    ease: [x1, y1, x2, y2],
  };
}

/** 목록 등장 간격(초). 예: transition={{ ...tweenOf(...), delay: i * staggerOf(motion) }} */
export function staggerOf(motion: DesignMotionTokens): number {
  return motion.stagger / 1000;
}
