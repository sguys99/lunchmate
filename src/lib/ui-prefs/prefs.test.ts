// 화면 설정 순수 규칙 (T4.25, SET-04, D-04): 저장 값 정리, <html> 반영, 첫 페인트 스크립트와 같은 결과.
import { describe, expect, it } from "vitest";
import { UI_PREFS_INIT_SCRIPT } from "./init-script";
import {
  applyUiPrefs,
  DEFAULT_UI_PREFS,
  sanitizeUiPrefs,
  UI_PREFS_STORAGE_KEY,
  type RootLike,
  type UiPrefs,
} from "./prefs";

function fakeRoot(initial: string[] = []) {
  const classes = new Set(initial);
  const root: RootLike & { classes: Set<string> } = {
    classes,
    classList: {
      add: (...t: string[]) => t.forEach((c) => classes.add(c)),
      remove: (...t: string[]) => t.forEach((c) => classes.delete(c)),
      toggle: (c: string, force?: boolean) => {
        const on = force ?? !classes.has(c);
        if (on) classes.add(c);
        else classes.delete(c);
        return on;
      },
    },
    dataset: {},
  };
  return root;
}

/** 첫 페인트 스크립트를 가짜 window, document로 실행한다 */
function runInitScript(stored: string | null, throws = false) {
  const root = fakeRoot();
  const window = {
    localStorage: {
      getItem: (key: string) => {
        if (throws) throw new Error("SecurityError");
        return key === UI_PREFS_STORAGE_KEY ? stored : null;
      },
    },
  };
  const document = { documentElement: root };
  new Function("window", "document", UI_PREFS_INIT_SCRIPT)(window, document);
  return root;
}

const persisted = (state: unknown) => JSON.stringify({ state, version: 1 });

describe("sanitizeUiPrefs", () => {
  it("알 수 없는 모양이면 기본값(시스템, 모션 그대로, 진동 켬)", () => {
    expect(sanitizeUiPrefs(null)).toEqual(DEFAULT_UI_PREFS);
    expect(sanitizeUiPrefs("dark")).toEqual(DEFAULT_UI_PREFS);
  });

  it("틀린 필드만 기본값으로 바꾼다", () => {
    expect(
      sanitizeUiPrefs({ theme: "sepia", reduceMotion: true, haptics: "no" }),
    ).toEqual({ theme: "system", reduceMotion: true, haptics: true });
  });
});

describe("applyUiPrefs", () => {
  it("dark는 .dark만, light는 .light만, system은 둘 다 지운다", () => {
    const root = fakeRoot(["light"]);
    applyUiPrefs(root, { ...DEFAULT_UI_PREFS, theme: "dark" });
    expect([...root.classes]).toEqual(["dark"]);
    applyUiPrefs(root, { ...DEFAULT_UI_PREFS, theme: "light" });
    expect([...root.classes]).toEqual(["light"]);
    applyUiPrefs(root, DEFAULT_UI_PREFS);
    expect(root.classes.size).toBe(0);
  });

  it("모션 줄이기는 data-motion=reduce, 끄면 속성을 지운다", () => {
    const root = fakeRoot();
    applyUiPrefs(root, { ...DEFAULT_UI_PREFS, reduceMotion: true });
    expect(root.dataset.motion).toBe("reduce");
    applyUiPrefs(root, DEFAULT_UI_PREFS);
    expect("motion" in root.dataset).toBe(false);
  });

  it("진동 설정은 <html>에 아무것도 달지 않는다(모션과 분리, D-04)", () => {
    const root = fakeRoot();
    applyUiPrefs(root, { ...DEFAULT_UI_PREFS, haptics: false });
    expect(root.classes.size).toBe(0);
    expect(root.dataset).toEqual({});
  });
});

describe("첫 페인트 스크립트 (FOUC 방지)", () => {
  const cases: UiPrefs[] = [
    { theme: "dark", reduceMotion: false, haptics: true },
    { theme: "light", reduceMotion: true, haptics: false },
    { theme: "system", reduceMotion: true, haptics: true },
  ];

  it.each(cases)("applyUiPrefs와 같은 결과: %o", (prefs) => {
    const fromScript = runInitScript(persisted(prefs));
    const fromApply = fakeRoot();
    applyUiPrefs(fromApply, prefs);
    expect([...fromScript.classes]).toEqual([...fromApply.classes]);
    expect(fromScript.dataset).toEqual(fromApply.dataset);
  });

  it("저장 값이 없거나 깨졌거나 저장소가 막히면 아무것도 하지 않는다(시스템 따름)", () => {
    for (const root of [
      runInitScript(null),
      runInitScript("{not json"),
      runInitScript(persisted({ theme: "sepia" })),
      runInitScript(null, true),
    ]) {
      expect(root.classes.size).toBe(0);
      expect(root.dataset).toEqual({});
    }
  });
});
