// 기기별 화면 설정 (T4.25, SET-04, design-decisions D-04). 순수 모듈(React, zustand 없음).
//
// - 화면 모드(system, light, dark), 모션 줄이기, 진동은 기기마다 다른 설정이라 DB가 아니라 이 브라우저에 둔다(T4.4 결정).
//   localStorage 금지 규칙(CLAUDE.md 7장)은 카카오 장소 데이터에 대한 것이고, 이 값에는 장소, 좌표, 개인 식별 정보가 없다.
// - 저장 형식은 zustand persist 형식 {"state": {...}, "version": 1}. 첫 페인트 전 스크립트(init-script.ts)가 같은 키와 형식을 읽는다.
// - 화면 모드는 <html>의 .light/.dark 클래스로 고정한다(tokens.css가 아는 선택자). system이면 클래스를 지우고
//   prefers-color-scheme을 따른다. 모션 줄이기는 <html data-motion="reduce">이고 globals.css의 motion-safe, motion-reduce
//   변형과 전역 안전망이 OS prefers-reduced-motion과 함께 본다.
// - 진동은 haptic()이 이 값(setHapticsEnabled)만 따른다. 모션 줄이기와 묶지 않는다(D-04).

export const THEME_PREFERENCES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export type UiPrefs = {
  theme: ThemePreference;
  /** 앱 설정 "모션 줄이기". OS 설정과 별개로 켤 수 있다(OS가 줄이기면 이 값과 무관하게 줄인다) */
  reduceMotion: boolean;
  /** 진동 켜기 */
  haptics: boolean;
};

export const DEFAULT_UI_PREFS: UiPrefs = {
  theme: "system",
  reduceMotion: false,
  haptics: true,
};

export const UI_PREFS_STORAGE_KEY = "lm-ui-prefs";
export const UI_PREFS_VERSION = 1;

/** 저장된 값(알 수 없는 모양 포함)을 안전한 설정으로 바꾼다. 틀린 필드는 기본값 */
export function sanitizeUiPrefs(raw: unknown): UiPrefs {
  const o =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    theme: (THEME_PREFERENCES as readonly unknown[]).includes(o.theme)
      ? (o.theme as ThemePreference)
      : DEFAULT_UI_PREFS.theme,
    reduceMotion:
      typeof o.reduceMotion === "boolean"
        ? o.reduceMotion
        : DEFAULT_UI_PREFS.reduceMotion,
    haptics:
      typeof o.haptics === "boolean" ? o.haptics : DEFAULT_UI_PREFS.haptics,
  };
}

/** 문서 루트에 필요한 최소 모양(테스트에서 가짜 요소를 넣는다) */
export type RootLike = {
  classList: Pick<DOMTokenList, "add" | "remove" | "toggle">;
  dataset: Record<string, string | undefined>;
};

/** <html>에 화면 모드 클래스와 모션 속성을 반영한다. init-script.ts와 같은 결과여야 한다 */
export function applyUiPrefs(root: RootLike, prefs: UiPrefs): void {
  root.classList.toggle("light", prefs.theme === "light");
  root.classList.toggle("dark", prefs.theme === "dark");
  if (prefs.reduceMotion) root.dataset.motion = "reduce";
  else delete root.dataset.motion;
}
