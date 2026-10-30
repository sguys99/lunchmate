"use client";
// 화면 설정 동기화 (T4.25, SET-04, D-04). (app) 레이아웃이 MotionPreferenceProvider 대신 한 번 마운트한다.
// - 마운트 뒤 저장소를 읽고(rehydrate), 값이 바뀔 때마다 <html> 클래스와 data-motion, haptic() 설정을 맞춘다.
// - 다른 탭에서 바꾼 값(storage 이벤트)도 다시 읽는다.
// - 모션 줄이기는 MotionPreferenceProvider의 preference("reduce")로도 내려 보내 useMotionReduced, 하단 탭 막대가 따른다.
// - 랜딩과 약관(루트 레이아웃)은 첫 페인트 스크립트만 쓰고 이 컴포넌트를 싣지 않는다(첫 로드 번들).
import { useEffect, type ReactNode } from "react";
import { setHapticsEnabled } from "@/lib/haptics";
import { MotionPreferenceProvider } from "@/lib/motion/preference";
import { applyUiPrefs, UI_PREFS_STORAGE_KEY } from "./prefs";
import { pickUiPrefs, useUiPrefs } from "./store";

export function UiPrefsProvider({ children }: { children: ReactNode }) {
  const reduceMotion = useUiPrefs((s) => s.reduceMotion);

  useEffect(() => {
    const sync = () => {
      const prefs = pickUiPrefs(useUiPrefs.getState());
      applyUiPrefs(document.documentElement, prefs);
      setHapticsEnabled(prefs.haptics);
    };
    const unsubscribe = useUiPrefs.subscribe(sync);
    void useUiPrefs.persist.rehydrate();
    const onStorage = (e: StorageEvent) => {
      if (e.key === UI_PREFS_STORAGE_KEY) void useUiPrefs.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      unsubscribe();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return (
    <MotionPreferenceProvider preference={reduceMotion ? "reduce" : "system"}>
      {children}
    </MotionPreferenceProvider>
  );
}
