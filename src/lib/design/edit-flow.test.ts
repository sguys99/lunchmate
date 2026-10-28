/**
 * G1 확인 (T1.21): DESIGN.md를 고치고 `pnpm tokens`를 실행하면 화면이 따라 바뀐다.
 * 화면 확인 기록은 docs/design/g1-comparison.md 7절. 이 테스트는 그 보장을 두 고리로 고정한다.
 *   1. 문서 → 생성물: 루트 DESIGN.md 사본의 값을 바꿔 실제 CLI(scripts/build-tokens.ts --root)로 생성하면
 *      tokens.css의 :root, .dark, 시스템 다크 블록에 바뀐 값이 들어간다.
 *   2. 생성물 → 화면: globals.css의 @theme inline과 type-* 유틸리티가 값을 쓰지 않고 그 변수를 var()로만 가리킨다.
 * 저장소 파일은 건드리지 않는다(임시 폴더에서만 생성).
 */
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const REPO = path.resolve(__dirname, "../../..");
const original = readFileSync(path.join(REPO, "DESIGN.md"), "utf8");

/** 원래 줄 → 바꾼 줄. 대비 검사를 통과하는 값만 쓴다(통과하지 못하면 CLI가 아무 파일도 쓰지 않는다). */
const EDITS = [
  {
    key: "color.light.shadcn.primary",
    from: '      primary: "oklch(0.43 0.055 118)"',
    to: '      primary: "oklch(0.43 0.12 25)"',
  },
  {
    key: "color.dark.shadcn.primary",
    from: '      primary: "oklch(0.76 0.07 118)"',
    to: '      primary: "oklch(0.76 0.1 25)"',
  },
  {
    key: "radius.components.card",
    from: "components: { card: xl, button: full",
    to: "components: { card: sm, button: full",
  },
  {
    key: "type.title.size",
    from: "title: { size: 1.875,",
    to: "title: { size: 2.5,",
  },
] as const;

function editDoc(src: string): string {
  return EDITS.reduce((acc, e) => {
    // 문서 형식이 바뀌어 원래 줄을 못 찾으면 테스트가 조용히 통과하지 않도록 한 번만 있는지 확인한다.
    expect(acc.split(e.from).length - 1, `${e.key}: 원래 줄`).toBe(1);
    return acc.replace(e.from, e.to);
  }, src);
}

/** `selector {` 다음부터 짝 맞는 `}`까지의 본문. */
function block(css: string, selector: string, from = 0): string {
  const start = css.indexOf(`${selector} {`, from);
  if (start < 0) throw new Error(`블록 없음: ${selector}`);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) {
      return css.slice(css.indexOf("{", start) + 1, i);
    }
  }
  throw new Error(`닫는 괄호 없음: ${selector}`);
}

function blocks(css: string) {
  const media = css.indexOf("@media (prefers-color-scheme: dark)");
  expect(media).toBeGreaterThan(0);
  return {
    root: block(css, ":root"),
    dark: block(css, ".dark"),
    systemDark: block(css, ":root:not(.light):not(.dark)", media),
  };
}

function varValue(body: string, name: string): string | undefined {
  const m = new RegExp(`(?:^|[;{\\s])${name}:\\s*([^;]+);`).exec(body);
  return m?.[1]?.replace(/\s+/g, " ").trim();
}

function runTokens(root: string) {
  return spawnSync(
    process.execPath,
    [
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      path.join(REPO, "scripts/build-tokens.ts"),
      "--root",
      root,
    ],
    { encoding: "utf8" },
  );
}

describe("DESIGN.md를 고치면 tokens.css가 따라 바뀐다 (T1.21, 실제 CLI)", () => {
  let dir = "";
  let before = "";
  let after = "";

  function makeRoot(name: string, doc: string): string {
    const root = path.join(dir, name);
    mkdirSync(path.join(root, "docs/design/candidates"), { recursive: true });
    mkdirSync(path.join(root, "src/styles"), { recursive: true });
    writeFileSync(path.join(root, "DESIGN.md"), doc);
    return root;
  }

  beforeAll(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "lm-t121-"));
    const base = makeRoot("base", original);
    const edited = makeRoot("edited", editDoc(original));
    for (const root of [base, edited]) {
      const r = runTokens(root);
      expect(r.status, r.stderr || r.stdout).toBe(0);
    }
    before = readFileSync(path.join(base, "src/styles/tokens.css"), "utf8");
    after = readFileSync(path.join(edited, "src/styles/tokens.css"), "utf8");
  }, 60_000);

  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("원본 사본의 생성물은 저장소 tokens.css와 같다 (임시 폴더 생성이 실제와 같은 경로)", () => {
    expect(before).toBe(
      readFileSync(path.join(REPO, "src/styles/tokens.css"), "utf8"),
    );
  });

  it("라이트 primary: :root에서 바뀐다", () => {
    expect(varValue(blocks(before).root, "--primary")).toBe(
      "oklch(0.43 0.055 118)",
    );
    expect(varValue(blocks(after).root, "--primary")).toBe(
      "oklch(0.43 0.12 25)",
    );
  });

  it("다크 primary: .dark와 시스템 다크 블록 둘 다 바뀐다", () => {
    const b = blocks(before);
    const a = blocks(after);
    for (const key of ["dark", "systemDark"] as const) {
      expect(varValue(b[key], "--primary"), key).toBe("oklch(0.76 0.07 118)");
      expect(varValue(a[key], "--primary"), key).toBe("oklch(0.76 0.1 25)");
    }
  });

  it("카드 라운드: --lm-radius-card가 다른 단계를 가리킨다", () => {
    expect(varValue(blocks(before).root, "--lm-radius-card")).toBe(
      "var(--lm-radius-xl)",
    );
    expect(varValue(blocks(after).root, "--lm-radius-card")).toBe(
      "var(--lm-radius-sm)",
    );
  });

  it("제목 크기: --lm-type-title-size가 바뀐다", () => {
    expect(varValue(blocks(before).root, "--lm-type-title-size")).toBe(
      "1.875rem",
    );
    expect(varValue(blocks(after).root, "--lm-type-title-size")).toBe("2.5rem");
  });

  it("바꾼 4곳 말고는 생성물이 같다 (다른 변수가 딸려 바뀌지 않는다)", () => {
    const diff = (x: string, y: string) => {
      const ys = new Set(y.split("\n"));
      return x.split("\n").filter((l) => !ys.has(l));
    };
    expect(diff(after, before).map((l) => l.trim())).toEqual([
      "--primary: oklch(0.43 0.12 25);",
      "--lm-type-title-size: 2.5rem;",
      "--lm-radius-card: var(--lm-radius-sm);",
      "--primary: oklch(0.76 0.1 25);",
      "--primary: oklch(0.76 0.1 25);",
    ]);
  });
});

describe("globals.css는 토큰 변수를 var()로만 가리킨다 (T1.21)", () => {
  const globals = readFileSync(path.join(REPO, "src/app/globals.css"), "utf8");
  const themeInline = block(globals, "@theme inline");
  const decls = themeInline
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean);

  it("@theme inline 선언은 모두 `--이름: var(--이름)` 한 개", () => {
    expect(decls.length).toBeGreaterThan(100);
    const bad = decls.filter((d) => !/^--[\w-]+:\s*var\(--[\w-]+\)$/.test(d));
    expect(bad).toEqual([]);
  });

  it.each([
    ["--color-primary", "--primary"],
    ["--radius-card", "--lm-radius-card"],
    ["--text-title", "--lm-type-title-size"],
  ])("%s → var(%s)", (themeVar, tokenVar) => {
    expect(decls).toContain(`${themeVar}: var(${tokenVar})`);
  });

  it("type-title 유틸리티도 크기를 var()로 읽는다", () => {
    const util = block(globals, "@utility type-title");
    expect(util).toMatch(/font-size:\s*var\(--lm-type-title-size\);/);
    expect(util).not.toMatch(/\d(rem|px)/);
  });
});
