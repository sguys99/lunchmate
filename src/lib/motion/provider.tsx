"use client";
// 앱 전역 모션 설정과 축소 모드 훅 (T2.11, T2.12). 루트 레이아웃 연결은 T2.6(앱 셸).
//
// - Motion은 `m` 컴포넌트(`motion/react-m`) + LazyMotion strict로만 쓴다(CLAUDE.md 2장, tasks.md 2.4절).
//   strict라서 `motion.div`를 쓰면 런타임 오류가 난다. `import * as m from "motion/react-m"` 후 `m.div`.
// - 기본 기능은 domAnimation(동기). drag가 필요한 곳만 <LazyMotion features={loadDomMax}>로 감싼다(비동기).
// - 축소 모드는 두 겹으로 지킨다.
//   1. MotionConfig reducedMotion: transform, layout 애니메이션을 Motion이 끈다(프리셋을 안 쓴 코드의 안전망).
//   2. useMotionPreset: opacity까지 포함해 모든 전환을 즉시(duration 0)로 바꾼 프리셋을 준다.
// - 사용자 설정: OS의 prefers-reduced-motion을 기본으로 따르고, 앱 설정에서 "줄이기"를 고르면
//   MotionProvider preference="reduce"로 넘긴다. 설정 저장소(Zustand 등)는 아직 없으므로 값만 받는다.
import {
  LazyMotion,
  MotionConfig,
  domAnimation,
  useReducedMotion,
  type Transition,
} from "motion/react";
import { createContext, use, type ReactNode } from "react";
import {
  getMotionPreset,
  reduceTransition,
  type MotionPreset,
  type MotionPresetName,
} from "./presets";

/** 앱의 모션 설정. system: OS 설정을 따름, reduce: OS와 무관하게 줄임. */
export type MotionPreference = "system" | "reduce";

const MotionPreferenceContext = createContext<MotionPreference>("system");

export function MotionProvider({
  children,
  preference = "system",
}: {
  children: ReactNode;
  preference?: MotionPreference;
}) {
  return (
    <MotionPreferenceContext value={preference}>
      <LazyMotion features={domAnimation} strict>
        <MotionConfig
          reducedMotion={preference === "reduce" ? "always" : "user"}
        >
          {children}
        </MotionConfig>
      </LazyMotion>
    </MotionPreferenceContext>
  );
}

/** drag(스와이프)가 필요한 영역만: <LazyMotion features={loadDomMax}>...</LazyMotion> */
export const loadDomMax = () => import("./dom-max").then((mod) => mod.default);

/**
 * 모션을 줄여야 하면 true: 앱 설정이 reduce이거나 OS가 prefers-reduced-motion: reduce.
 * 서버 렌더와 첫 렌더에서 OS 값은 알 수 없어 false로 본다(앱 설정 reduce는 바로 반영).
 * 숫자 롤링, 쉬머, 자동 셔플처럼 프리셋 밖 효과도 이 값으로 분기한다.
 */
export function useMotionReduced(): boolean {
  const preference = use(MotionPreferenceContext);
  const system = useReducedMotion() ?? false;
  return preference === "reduce" || system;
}

/** 축소 모드를 따르는 프리셋. `<m.div {...useMotionPreset("enter")} />` */
export function useMotionPreset(name: MotionPresetName): MotionPreset {
  return getMotionPreset(name, useMotionReduced());
}

/** 직접 만든 transition(tweenOf, springOf 조합)도 축소 모드면 즉시로 바꾼다. */
export function useMotionTransition(transition: Transition): Transition {
  return reduceTransition(transition, useMotionReduced());
}
