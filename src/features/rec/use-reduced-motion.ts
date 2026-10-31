"use client";
// 모션을 줄여야 하는가 (OS prefers-reduced-motion 또는 앱 설정 "모션 줄이기"). Motion 라이브러리에 의존하지 않는다.
// 오늘(홈)은 CSS 전환만 써서(D-04) @/lib/motion(useMotionReduced, motion/react 포함)을 첫 로드에 넣지 않는다.
// 서버 렌더와 하이드레이션 첫 렌더는 false(OS 값을 모름). 앱 설정 reduce는 바로 반영한다.
import { useSyncExternalStore } from "react";
import { useMotionPreference } from "@/lib/motion/preference";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function useReducedMotion(): boolean {
  const preference = useMotionPreference();
  const system = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
  return preference === "reduce" || system;
}
