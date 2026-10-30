"use client";
// 화면 단계가 바뀌면 그 단계 제목으로 포커스를 옮긴다(DESIGN.md 5장 "화면이 바뀌면 제목으로 초점").
// 첫 렌더(와 개발 모드 이중 실행)는 직전 값과 같아 건너뛴다.
import { useEffect, useRef } from "react";

export function useFocusOnChange<T extends HTMLElement>(key: string) {
  const ref = useRef<T | null>(null);
  const prev = useRef(key);
  useEffect(() => {
    if (prev.current === key) return;
    prev.current = key;
    ref.current?.focus({ preventScroll: false });
  }, [key]);
  return ref;
}
