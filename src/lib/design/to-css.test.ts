import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseDocument, stringify } from "yaml";
import {
  APP_COLOR_KEYS,
  BORDER_STEPS,
  CATEGORY_SLUGS,
  DURATION_STEPS,
  EASING_STEPS,
  RADIUS_COMPONENTS,
  RADIUS_STEPS,
  SHADCN_COLOR_KEYS,
  SHADOW_STEPS,
  SPACE_STEPS,
  SPRING_PRESETS,
  TYPE_STEPS,
  parseDesignDoc,
  splitDesignDoc,
  type DesignFrontmatter,
} from "./schema";
import {
  candidateCss,
  candidatesFile,
  candidateSelectors,
  finalTokensFile,
  staticVars,
  themeVars,
} from "./to-css";

const source = readFileSync(
  path.resolve(process.cwd(), "docs/design/candidates/_template.DESIGN.md"),
  "utf8",
);

/** 템플릿을 시안 id로 바꿔 파싱한다. */
function candidate(id: string, src = source): DesignFrontmatter {
  return parseDesignDoc(
    src
      .replace("id: template", `id: ${id}`)
      .replace("status: template", "status: candidate"),
  ).tokens;
}

/** 선택자 문자열 바로 뒤 { ... } 블록 본문을 꺼낸다. */
function block(css: string, selectorLine: string): string {
  const start = css.indexOf(`${selectorLine} {`);
  expect(start, `블록 없음: ${selectorLine}`).toBeGreaterThanOrEqual(0);
  const end = css.indexOf("}", start);
  return css.slice(start, end);
}

function varNames(body: string): string[] {
  return [...body.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((m) => m[1] ?? "");
}

const COLOR_VARS = [
  ...SHADCN_COLOR_KEYS.map((k) => `--${k}`),
  ...APP_COLOR_KEYS.map((k) => `--${k}`),
  ...CATEGORY_SLUGS.flatMap((s) => [`--cat-${s}-surface`, `--cat-${s}-ink`]),
];

const STATIC_VARS = [
  "--lm-font-sans",
  "--lm-font-heading",
  "--lm-font-numeric",
  "--lm-numeric-features",
  ...TYPE_STEPS.flatMap((s) =>
    ["size", "line-height", "weight", "tracking", "font"].map(
      (p) => `--lm-type-${s}-${p}`,
    ),
  ),
  "--lm-space-base",
  ...SPACE_STEPS.map((s) => `--lm-space-${s}`),
  "--radius",
  ...RADIUS_STEPS.map((s) => `--lm-radius-${s}`),
  ...RADIUS_COMPONENTS.map((c) => `--lm-radius-${c}`),
  ...BORDER_STEPS.map((s) => `--lm-border-${s}`),
  ...DURATION_STEPS.map((s) => `--lm-duration-${s}`),
  ...EASING_STEPS.map((s) => `--lm-ease-${s}`),
  ...SPRING_PRESETS.flatMap((p) =>
    ["stiffness", "damping", "mass"].map((k) => `--lm-spring-${p}-${k}`),
  ),
  "--lm-stagger",
  "--lm-illust-stroke",
  "--lm-illust-area",
  "--lm-layout-max-width",
  "--lm-layout-min-width",
  "--lm-layout-gutter",
  "--lm-layout-desktop-breakpoint",
  "--lm-layout-desktop-columns",
  "--lm-layout-desktop-list-max-width",
  "--lm-layout-bottom-action-zone-ratio",
  "--lm-layout-bottom-action-zone-min-touch",
  "--lm-layout-tab-bar-height",
];

const SHADOW_VARS = SHADOW_STEPS.map((s) => `--lm-shadow-${s}`);

describe("변수 목록", () => {
  const t = candidate("a");

  it("테마 변수는 색 전부(shadcn 31, app 15, 카테고리 24)와 그림자 4개", () => {
    expect(themeVars(t, "light").map(([n]) => n)).toEqual([
      ...COLOR_VARS,
      ...SHADOW_VARS,
    ]);
    expect(themeVars(t, "dark").map(([n]) => n)).toEqual([
      ...COLOR_VARS,
      ...SHADOW_VARS,
    ]);
  });

  it("정적 변수는 FORMAT.md 3.1 이름 그대로", () => {
    expect(staticVars(t).map(([n]) => n)).toEqual(STATIC_VARS);
  });

  it("값에 단위와 형식을 붙인다", () => {
    const v = Object.fromEntries(staticVars(t));
    expect(v["--lm-type-title-size"]).toBe("1.5rem");
    expect(v["--lm-type-title-tracking"]).toBe("-0.015em");
    expect(v["--lm-type-numeric-lg-font"]).toBe("var(--lm-font-numeric)");
    expect(v["--lm-numeric-features"]).toBe('"tnum" 1');
    expect(v["--lm-font-sans"]).toMatch(/^"Pretendard Variable", Pretendard,/);
    expect(v["--lm-radius-lg"]).toBe("var(--radius)");
    expect(v["--lm-radius-xl"]).toBe("calc(var(--radius) * 1.4)");
    expect(v["--lm-radius-card"]).toBe("var(--lm-radius-xl)");
    expect(v["--lm-radius-chip"]).toBe("9999px");
    expect(v["--lm-radius-tab-bar"]).toBe("0");
    expect(v["--lm-duration-base"]).toBe("220ms");
    expect(v["--lm-ease-standard"]).toBe("cubic-bezier(0.2, 0, 0, 1)");
    expect(v["--lm-illust-stroke"]).toBe("0px");
    expect(v["--lm-layout-desktop-columns"]).toBe("2fr 3fr");
    expect(v["--lm-layout-bottom-action-zone-ratio"]).toBe("0.333");
  });

  it("slashedZero면 zero 기능을 더한다", () => {
    const z = structuredClone(t);
    z.font.numeric.slashedZero = true;
    expect(Object.fromEntries(staticVars(z))["--lm-numeric-features"]).toBe(
      '"tnum" 1, "zero" 1',
    );
  });

  it("하드코딩 색 표기가 없다(oklch만)", () => {
    const css = candidateCss(t);
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
  });
});

describe("시안 CSS", () => {
  const css = candidateCss(candidate("a"));
  const sel = candidateSelectors("a");

  it("라이트 블록에 색, 그림자, 정적 변수 모두", () => {
    const names = varNames(block(css, '[data-design="a"]'));
    expect(names).toEqual([...COLOR_VARS, ...SHADOW_VARS, ...STATIC_VARS]);
  });

  it("다크 블록(.dark 조상, 같은 요소, data-theme)에는 색과 그림자만", () => {
    expect(sel.dark).toEqual([
      ':where(.dark) [data-design="a"]',
      '[data-design="a"]:where(.dark)',
      '[data-design="a"][data-theme="dark"]',
    ]);
    const names = varNames(block(css, sel.dark.join(",\n")));
    expect(names).toEqual([...COLOR_VARS, ...SHADOW_VARS]);
    expect(block(css, sel.dark.join(",\n"))).toContain("color-scheme: dark");
  });

  it("시스템 다크는 .light나 .dark가 없을 때만, media 안에", () => {
    expect(css).toContain(
      '@media (prefers-color-scheme: dark) {\n  :where(:root:not(.light):not(.dark)) [data-design="a"] {',
    );
    const names = varNames(
      block(css, '  :where(:root:not(.light):not(.dark)) [data-design="a"]'),
    );
    expect(names).toEqual([...COLOR_VARS, ...SHADOW_VARS]);
  });

  it("data-theme=light 강제 블록이 다크 뒤에 있다", () => {
    const forced = css.indexOf('[data-design="a"][data-theme="light"] {');
    expect(forced).toBeGreaterThan(css.indexOf("@media"));
    expect(
      varNames(block(css, '[data-design="a"][data-theme="light"]')),
    ).toEqual([...COLOR_VARS, ...SHADOW_VARS]);
  });

  it("라이트 값과 다크 값이 각 블록에 맞게 들어간다", () => {
    const t = candidate("a");
    expect(block(css, '[data-design="a"]')).toContain(
      `--background: ${t.color.light.shadcn.background};`,
    );
    expect(block(css, sel.dark.join(",\n"))).toContain(
      `--background: ${t.color.dark.shadcn.background};`,
    );
  });
});

describe("파일 출력", () => {
  it("시안 파일은 id 순으로 정렬되고 생성물 주석이 있다", () => {
    const css = candidatesFile([
      candidate("c"),
      candidate("a"),
      candidate("b"),
    ]);
    expect(css.startsWith("/*\n * 생성물, 직접 수정 금지")).toBe(true);
    const a = css.indexOf('[data-design="a"] {');
    const b = css.indexOf('[data-design="b"] {');
    const c = css.indexOf('[data-design="c"] {');
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
    expect(css.endsWith("}\n")).toBe(true);
  });

  it("같은 id가 둘이면 실패", () => {
    expect(() => candidatesFile([candidate("a"), candidate("a")])).toThrow(
      /meta.id가 겹치는/,
    );
  });

  it("확정본은 :root, .dark, 시스템 다크 구조", () => {
    const t = parseDesignDoc(
      source
        .replace("id: template", "id: final")
        .replace("status: template", "status: final"),
    ).tokens;
    const css = finalTokensFile(t);
    expect(css).toContain("생성물, 직접 수정 금지. 원본: DESIGN.md");
    expect(varNames(block(css, ":root"))).toEqual([
      ...COLOR_VARS,
      ...SHADOW_VARS,
      ...STATIC_VARS,
    ]);
    expect(varNames(block(css, ".dark"))).toEqual([
      ...COLOR_VARS,
      ...SHADOW_VARS,
    ]);
    expect(css).toContain(
      "@media (prefers-color-scheme: dark) {\n  :root:not(.light):not(.dark) {",
    );
  });

  it("결정적: 같은 입력이면 같은 출력, YAML 키 순서를 섞어도 같은 출력", () => {
    const base = candidatesFile([candidate("a")]);
    expect(candidatesFile([candidate("a")])).toBe(base);

    // 프런트매터 최상위와 color.light.shadcn 키 순서를 뒤집어 다시 쓴다
    const { body } = splitDesignDoc(source);
    const fm = parseDocument(splitDesignDocRaw(source)).toJS() as Record<
      string,
      unknown
    >;
    const reversed = Object.fromEntries(Object.entries(fm).reverse());
    const color = reversed.color as {
      light: { shadcn: Record<string, string> };
    };
    color.light.shadcn = Object.fromEntries(
      Object.entries(color.light.shadcn).reverse(),
    );
    const shuffled = `---\n${stringify(reversed)}---\n${body}`;
    expect(candidatesFile([candidate("a", shuffled)])).toBe(base);
  });
});

describe("잘못된 문서", () => {
  it("검증 실패한 문서는 변환 전에 에러", () => {
    const broken = source.replace(
      /background: "oklch\([^)]*\)"/,
      "background: '#ffffff'",
    );
    expect(() => candidate("a", broken)).toThrow(
      /color\.light\.shadcn\.background/,
    );
  });

  it("스키마를 우회한 이상한 객체도 이름 중복이면 에러", () => {
    const t = structuredClone(candidate("a"));
    // app 색에 shadcn과 같은 키를 억지로 넣는다
    (t.color.light.app as Record<string, string>).background = "oklch(0 0 0)";
    expect(() => candidateCss(t)).toThrow(/중복/);
  });
});

/** 프런트매터 원문(YAML 텍스트)만 꺼낸다. */
function splitDesignDocRaw(src: string): string {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src);
  return m?.[1] ?? "";
}
