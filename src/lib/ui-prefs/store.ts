// 화면 설정 저장소 (T4.25, SET-04, D-04). Zustand + persist(localStorage, 이 기기에만).
// 서버 렌더와 첫 클라이언트 렌더가 같도록 skipHydration으로 시작하고, UiPrefsProvider가 마운트 뒤 rehydrate한다.
// 첫 페인트의 화면 모드와 모션 속성은 그보다 먼저 init-script.ts가 같은 키에서 읽어 <html>에 단다.
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  DEFAULT_UI_PREFS,
  sanitizeUiPrefs,
  UI_PREFS_STORAGE_KEY,
  UI_PREFS_VERSION,
  type ThemePreference,
  type UiPrefs,
} from "./prefs";

export type UiPrefsState = UiPrefs & {
  /** 저장된 값을 읽어 왔는가(그 전에는 기본값이라 설정 화면이 컨트롤을 잠근다) */
  hydrated: boolean;
  setTheme: (theme: ThemePreference) => void;
  setReduceMotion: (value: boolean) => void;
  setHaptics: (value: boolean) => void;
};

export const useUiPrefs = create<UiPrefsState>()(
  persist(
    (set) => ({
      ...DEFAULT_UI_PREFS,
      hydrated: false,
      setTheme: (theme) => set({ theme }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setHaptics: (haptics) => set({ haptics }),
    }),
    {
      name: UI_PREFS_STORAGE_KEY,
      version: UI_PREFS_VERSION,
      // 저장소 접근이 막히면(사생활 보호 모드) zustand가 메모리로만 동작한다
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s): UiPrefs => ({
        theme: s.theme,
        reduceMotion: s.reduceMotion,
        haptics: s.haptics,
      }),
      // 다른 버전이나 손댄 값이 와도 알려진 필드만 받는다
      migrate: (persisted) => sanitizeUiPrefs(persisted),
      merge: (persisted, current) => ({
        ...current,
        ...sanitizeUiPrefs(persisted),
      }),
      onRehydrateStorage: () => () => {
        useUiPrefs.setState({ hydrated: true });
      },
    },
  ),
);

/** 지금 설정 값만(함수 제외) */
export function pickUiPrefs(s: UiPrefs): UiPrefs {
  return { theme: s.theme, reduceMotion: s.reduceMotion, haptics: s.haptics };
}
