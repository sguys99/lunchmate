"use client";
// 앱 전역 모션 설정 (T2.11, T2.12). domAnimation을 동기로 넣는 기본 Provider.
// 공통 부분(범위, 축소 모드 훅, loadDomMax)은 motion-scope.tsx, 앱 설정 컨텍스트는 preference.tsx (T2.22).
import { domAnimation } from "motion/react";
import { MotionScope, type MotionScopeProps } from "./motion-scope";

export * from "./motion-scope";

/** domAnimation 동기(첫 번들 포함, 약 37KB gzip). 첫 렌더부터 애니메이션이 필요한 범위에 쓴다 */
export function MotionProvider(props: MotionScopeProps) {
  return <MotionScope {...props} features={domAnimation} />;
}
