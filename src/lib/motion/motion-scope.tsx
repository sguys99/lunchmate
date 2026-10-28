"use client";
// 모션 범위와 축소 모드 훅 (T2.11, T2.12). domAnimation을 직접 가져오지 않는 공통 부분이다 (T2.22로 분리).
//
// - Motion은 `m` 컴포넌트(`motion/react-m`) + LazyMotion strict로만 쓴다(CLAUDE.md 2장, tasks.md 2.4절).
//   strict라서 `motion.div`를 쓰면 런타임 오류가 난다. `import * as m from "motion/react-m"` 후 `m.div`.
// - 기능 묶음을 받는 방식은 감싸는 쪽이 고른다.
//   MotionProvider(provider.tsx): domAnimation 동기, 첫 렌더부터 애니메이션. 디자인 랩, PoC, 테스트, Motion을 쓰는 화면.
//   (app) 레이아웃에는 MotionScope가 없다(T2.22). 앱 설정은 MotionPreferenceProvider(preference.tsx)만 내려 주고,
//   Motion을 쓰는 화면이 자기 영역을 MotionProvider로 감싼다. preference를 생략하면 바깥 앱 설정을 그대로 잇는다.
//   drag가 필요한 곳만 <LazyMotion features={loadDomMax}>로 감싼다(비동기).
// - 축소 모드는 두 겹으로 지킨다.
//   1. MotionConfig reducedMotion: transform, layout 애니메이션을 Motion이 끈다(프리셋을 안 쓴 코드의 안전망).
//   2. useMotionPreset: opacity까지 포함해 모든 전환을 즉시(duration 0)로 바꾼 프리셋을 준다.
// - 사용자 설정: OS의 prefers-reduced-motion을 기본으로 따르고, 앱 설정에서 "줄이기"를 고르면
//   preference="reduce"로 넘긴다. 설정 저장소(Zustand 등)는 아직 없으므로 값만 받는다.
//
import {
  LazyMotion,
  MotionConfig,
  useReducedMotion,
  type LazyProps,
  type Transition,
} from "motion/react";
import type { ReactNode } from "react";
import {
  MotionPreferenceContext,
  useMotionPreference,
  type MotionPreference,
} from "./preference";
import {
  getMotionPreset,
  reduceTransition,
  type MotionPreset,
  type MotionPresetName,
} from "./presets";

export type { MotionPreference } from "./preference";
export { MotionPreferenceProvider, useMotionPreference } from "./preference";

export type MotionScopeProps = {
  children: ReactNode;
  /** 생략하면 바깥 MotionPreferenceProvider(없으면 system) 값을 잇는다 */
  preference?: MotionPreference;
};

/** 앱 설정 컨텍스트 + LazyMotion strict + MotionConfig. features는 감싸는 Provider가 정한다 */
export function MotionScope({
  children,
  preference: preferenceProp,
  features,
}: MotionScopeProps & { features: LazyProps["features"] }) {
  const inherited = useMotionPreference();
  const preference = preferenceProp ?? inherited;
  return (
    <MotionPreferenceContext value={preference}>
      <LazyMotion features={features} strict>
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
  const preference = useMotionPreference();
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
