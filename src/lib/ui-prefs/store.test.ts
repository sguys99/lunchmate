// @vitest-environment jsdom
// 화면 설정 저장소 (T4.25, SET-04): 이 기기 localStorage에 persist 형식으로 저장하고, 다시 읽을 때 값을 정리한다.
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_UI_PREFS, UI_PREFS_STORAGE_KEY } from "./prefs";
import { pickUiPrefs, useUiPrefs } from "./store";

function stored() {
  const raw = localStorage.getItem(UI_PREFS_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as { state: unknown; version: number }) : null;
}

beforeEach(() => {
  localStorage.clear();
  useUiPrefs.setState({ ...DEFAULT_UI_PREFS, hydrated: false });
});

describe("useUiPrefs", () => {
  it("다시 읽기 전에는 기본값이고 hydrated가 false다(서버 렌더와 같음)", () => {
    expect(pickUiPrefs(useUiPrefs.getState())).toEqual(DEFAULT_UI_PREFS);
    expect(useUiPrefs.getState().hydrated).toBe(false);
  });

  it("바꾼 값은 설정 세 개만 버전 1 형식으로 저장한다", () => {
    const s = useUiPrefs.getState();
    s.setTheme("dark");
    s.setReduceMotion(true);
    s.setHaptics(false);
    expect(stored()).toEqual({
      state: { theme: "dark", reduceMotion: true, haptics: false },
      version: 1,
    });
  });

  it("rehydrate는 저장 값을 읽고 hydrated를 켠다", async () => {
    localStorage.setItem(
      UI_PREFS_STORAGE_KEY,
      JSON.stringify({
        state: { theme: "light", reduceMotion: true, haptics: false },
        version: 1,
      }),
    );
    await useUiPrefs.persist.rehydrate();
    const s = useUiPrefs.getState();
    expect(pickUiPrefs(s)).toEqual({
      theme: "light",
      reduceMotion: true,
      haptics: false,
    });
    expect(s.hydrated).toBe(true);
  });

  it("손댄 값은 알려진 값만 받고 나머지는 기본값", async () => {
    localStorage.setItem(
      UI_PREFS_STORAGE_KEY,
      JSON.stringify({
        state: { theme: "neon", reduceMotion: "yes", extra: 1 },
        version: 1,
      }),
    );
    await useUiPrefs.persist.rehydrate();
    expect(pickUiPrefs(useUiPrefs.getState())).toEqual(DEFAULT_UI_PREFS);
    expect("extra" in useUiPrefs.getState()).toBe(false);
  });

  it("저장 값이 없어도 hydrated가 켜진다", async () => {
    await useUiPrefs.persist.rehydrate();
    expect(useUiPrefs.getState().hydrated).toBe(true);
  });
});
