"use client";
// 앱 모션 설정 컨텍스트 (T2.11, T2.22로 분리). Motion 라이브러리에 의존하지 않는다.
//
// (app) 레이아웃은 이 Provider만 둔다. LazyMotion(MotionScope)은 기능 묶음을 비동기로 받아도 load-features와
// VisualElement 등 약 10KB gzip을 첫 로드에 넣으므로, Motion을 실제로 쓰는 화면이 자기 영역만 MotionProvider로 감싼다.
// CSS 전환만 쓰는 컴포넌트(하단 탭 활성 막대)는 useMotionPreference()로 앱 설정 "줄이기"를 따른다.
// OS 설정(prefers-reduced-motion)은 CSS motion-reduce:로, Motion 쪽은 motion-scope.tsx의 useMotionReduced로 본다.
import { createContext, use, type ReactNode } from "react";

/** 앱의 모션 설정. system: OS 설정을 따름, reduce: OS와 무관하게 줄임. */
export type MotionPreference = "system" | "reduce";

export const MotionPreferenceContext =
  createContext<MotionPreference>("system");

/** 앱 설정만 내려 준다. 설정 저장소(Zustand 등)가 생기면 그 값을 preference로 넘긴다 */
export function MotionPreferenceProvider({
  preference = "system",
  children,
}: {
  preference?: MotionPreference;
  children: ReactNode;
}) {
  return (
    <MotionPreferenceContext value={preference}>
      {children}
    </MotionPreferenceContext>
  );
}

/** 가장 가까운 Provider의 앱 설정. OS 설정은 포함하지 않는다(그건 useMotionReduced). */
export function useMotionPreference(): MotionPreference {
  return use(MotionPreferenceContext);
}
