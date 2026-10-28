/**
 * DESIGN.md 프런트매터 → CSS 변수 변환 (T1.9). 순수 함수만 둔다(파일 IO는 scripts/build-tokens.ts).
 *
 * 명명 규칙과 선택자 정본: docs/design/candidates/FORMAT.md 3절.
 * - 색은 접두사 없음(shadcn, Tailwind 색 유틸이 그대로 읽음), 카테고리 색은 `cat-`, 나머지는 `--lm-`.
 * - 다크 블록에는 color와 shadow만, 테마와 무관한 토큰은 라이트 블록에 한 번만.
 * - 키 순서는 zod 스키마 순서(파싱 결과는 스키마 shape 순서로 만들어짐)라 입력 YAML 순서와 무관하게 결정적이다.
 *
 * Node type stripping으로도 읽히도록 erasable 문법만 쓰고, schema에서는 타입만 가져온다.
 */
import type { ColorTheme, DesignFrontmatter } from "./schema";

export type CssDecl = readonly [name: string, value: string];

type ThemeName = "light" | "dark";

/* ------------------------------------------------------------------ */
/* 값 포매터                                                            */
/* ------------------------------------------------------------------ */

function num(n: number): string {
  // -0 방지, 지수 표기 방지(스키마 범위상 나오지 않지만 방어)
  if (Object.is(n, -0)) return "0";
  return String(n);
}

/** 0에도 단위를 붙인다(calc() 안에서 단위 없는 0이 깨지는 것을 막음). */
function unit(n: number, u: string): string {
  return `${num(n)}${u}`;
}

function kebab(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

const BARE_FAMILY_RE = /^-?[a-zA-Z][a-zA-Z0-9-]*$/;

function fontFamily(name: string): string {
  return BARE_FAMILY_RE.test(name) ? name : `"${name.replace(/"/g, '\\"')}"`;
}

function fontStack(stack: { family: string; fallback: string[] }): string {
  return [stack.family, ...stack.fallback].map(fontFamily).join(", ");
}

/** 주석 안에 넣을 문자열에서 주석 종료 기호를 무력화한다. */
function commentSafe(s: string): string {
  return s.replace(/\*\//g, "* /");
}

/* ------------------------------------------------------------------ */
/* 변수 목록                                                            */
/* ------------------------------------------------------------------ */

/** 한 테마의 색 변수 (shadcn → app → category 순). */
export function colorVars(theme: ColorTheme): CssDecl[] {
  const out: CssDecl[] = [];
  for (const [k, v] of Object.entries(theme.shadcn)) out.push([`--${k}`, v]);
  for (const [k, v] of Object.entries(theme.app)) out.push([`--${k}`, v]);
  for (const [slug, c] of Object.entries(theme.category)) {
    out.push([`--cat-${slug}-surface`, c.surface]);
    out.push([`--cat-${slug}-ink`, c.ink]);
  }
  return out;
}

/** 테마별로 달라지는 변수: 색 + 그림자. */
export function themeVars(
  tokens: DesignFrontmatter,
  theme: ThemeName,
): CssDecl[] {
  const out = colorVars(tokens.color[theme]);
  for (const [k, v] of Object.entries(tokens.shadow[theme])) {
    out.push([`--lm-shadow-${k}`, v]);
  }
  return out;
}

/** 테마와 무관한 변수: font, type, space, radius, border, motion, illustration, layout. */
export function staticVars(tokens: DesignFrontmatter): CssDecl[] {
  const out: CssDecl[] = [];
  const { font, type, space, radius, border, motion, illustration, layout } =
    tokens;

  // font
  out.push(["--lm-font-sans", fontStack(font.sans)]);
  out.push(["--lm-font-heading", fontStack(font.heading)]);
  out.push(["--lm-font-numeric", `var(--lm-font-${font.numeric.use})`]);
  out.push([
    "--lm-numeric-features",
    font.numeric.slashedZero ? `"tnum" 1, "zero" 1` : `"tnum" 1`,
  ]);

  // type
  for (const [step, t] of Object.entries(type)) {
    out.push([`--lm-type-${step}-size`, unit(t.size, "rem")]);
    out.push([`--lm-type-${step}-line-height`, num(t.lineHeight)]);
    out.push([`--lm-type-${step}-weight`, num(t.weight)]);
    out.push([`--lm-type-${step}-tracking`, unit(t.tracking, "em")]);
    out.push([`--lm-type-${step}-font`, `var(--lm-font-${t.font})`]);
  }

  // space
  out.push(["--lm-space-base", unit(space.base, "rem")]);
  for (const [step, v] of Object.entries(space.scale)) {
    out.push([`--lm-space-${step}`, unit(v, "rem")]);
  }

  // radius
  out.push(["--radius", unit(radius.base, "rem")]);
  for (const [step, m] of Object.entries(radius.scale)) {
    out.push([
      `--lm-radius-${step}`,
      m === 1 ? "var(--radius)" : `calc(var(--radius) * ${num(m)})`,
    ]);
  }
  for (const [c, ref] of Object.entries(radius.components)) {
    const value =
      ref === "full"
        ? "9999px"
        : ref === "none"
          ? "0"
          : `var(--lm-radius-${ref})`;
    out.push([`--lm-radius-${c}`, value]);
  }

  // border
  for (const [step, v] of Object.entries(border)) {
    out.push([`--lm-border-${step}`, unit(v, "px")]);
  }

  // motion
  for (const [step, v] of Object.entries(motion.duration)) {
    out.push([`--lm-duration-${step}`, `${num(v)}ms`]);
  }
  for (const [step, b] of Object.entries(motion.easing)) {
    out.push([`--lm-ease-${step}`, `cubic-bezier(${b.map(num).join(", ")})`]);
  }
  for (const [preset, s] of Object.entries(motion.spring)) {
    out.push([`--lm-spring-${preset}-stiffness`, num(s.stiffness)]);
    out.push([`--lm-spring-${preset}-damping`, num(s.damping)]);
    out.push([`--lm-spring-${preset}-mass`, num(s.mass)]);
  }
  out.push(["--lm-stagger", `${num(motion.stagger)}ms`]);

  // illustration
  out.push(["--lm-illust-stroke", unit(illustration.strokeWidth, "px")]);
  out.push(["--lm-illust-area", num(illustration.cardAreaRatio)]);

  // layout (중첩 키는 하이픈으로)
  const px = (n: number) => unit(n, "px");
  out.push(["--lm-layout-max-width", px(layout.maxWidth)]);
  out.push(["--lm-layout-min-width", px(layout.minWidth)]);
  out.push(["--lm-layout-gutter", px(layout.gutter)]);
  out.push(["--lm-layout-desktop-breakpoint", px(layout.desktop.breakpoint)]);
  out.push([
    "--lm-layout-desktop-columns",
    layout.desktop.columns.map((c) => `${num(c)}fr`).join(" "),
  ]);
  out.push([
    "--lm-layout-desktop-list-max-width",
    px(layout.desktop.listMaxWidth),
  ]);
  out.push([
    `--lm-layout-${kebab("bottomActionZone")}-ratio`,
    num(layout.bottomActionZone.ratio),
  ]);
  out.push([
    `--lm-layout-${kebab("bottomActionZone")}-${kebab("minTouch")}`,
    px(layout.bottomActionZone.minTouch),
  ]);
  out.push([`--lm-layout-${kebab("tabBarHeight")}`, px(layout.tabBarHeight)]);

  return out;
}

/** 이름 중복을 막는다(FORMAT.md 3.1: 같은 이름이 두 번 생기면 실패). */
function assertUnique(decls: readonly CssDecl[], where: string): void {
  const seen = new Set<string>();
  for (const [name] of decls) {
    if (seen.has(name)) {
      throw new Error(`CSS 변수 이름이 중복됩니다: ${name} (${where})`);
    }
    seen.add(name);
  }
}

/* ------------------------------------------------------------------ */
/* CSS 출력 (prettier 형식)                                             */
/* ------------------------------------------------------------------ */

function rule(
  selectors: readonly string[],
  decls: readonly CssDecl[],
  indent = "",
): string {
  const head = selectors.map((s) => `${indent}${s}`).join(",\n");
  const body = decls.map(([n, v]) => `${indent}  ${n}: ${v};`).join("\n");
  return `${head} {\n${body}\n${indent}}`;
}

function media(query: string, inner: string): string {
  return `@media ${query} {\n${inner}\n}`;
}

const SCHEME_LIGHT: CssDecl = ["color-scheme", "light"];
const SCHEME_DARK: CssDecl = ["color-scheme", "dark"];

/** 선택자 묶음. 테스트와 디자인 랩(T1.14)이 같은 규칙을 참조하도록 export한다. */
export function candidateSelectors(id: string) {
  const d = `[data-design="${id}"]`;
  return {
    light: [d],
    dark: [
      `:where(.dark) ${d}`,
      `${d}:where(.dark)`,
      `${d}[data-theme="dark"]`,
    ],
    systemDark: [`:where(:root:not(.light):not(.dark)) ${d}`],
    forcedLight: [`${d}[data-theme="light"]`],
  };
}

export const FINAL_SELECTORS = {
  light: [":root"],
  dark: [".dark"],
  systemDark: [":root:not(.light):not(.dark)"],
} as const;

function metaLine(tokens: DesignFrontmatter): string {
  const m = tokens.meta;
  return commentSafe(`${m.id}: ${m.name} v${m.version} (${m.status})`);
}

/**
 * 시안 한 벌의 CSS.
 *
 * 우선순위 설계(명시도):
 * - `[data-design]` 라이트 (0,1,0)
 * - 다크(.dark 조상 또는 같은 요소, 시스템 다크)는 `:where()`로 감싸 (0,1,0), 라이트보다 뒤에 둬서 이김
 * - 컨테이너 강제 `[data-theme="light|dark"]`는 (0,2,0)이라 전역 테마와 무관하게 이김(T1.14 스위처)
 */
export function candidateCss(tokens: DesignFrontmatter): string {
  const id = tokens.meta.id;
  const sel = candidateSelectors(id);
  const light = [
    SCHEME_LIGHT,
    ...themeVars(tokens, "light"),
    ...staticVars(tokens),
  ];
  const dark = [SCHEME_DARK, ...themeVars(tokens, "dark")];
  const forcedLight = [SCHEME_LIGHT, ...themeVars(tokens, "light")];
  assertUnique(light, `${id} 라이트`);
  assertUnique(dark, `${id} 다크`);

  return [
    `/* ${metaLine(tokens)} */\n${rule(sel.light, light)}`,
    rule(sel.dark, dark),
    media("(prefers-color-scheme: dark)", rule(sel.systemDark, dark, "  ")),
    rule(sel.forcedLight, forcedLight),
  ].join("\n\n");
}

/** src/styles/design-candidates.css 전체. 시안은 meta.id 순으로 정렬한다. */
export function candidatesFile(all: readonly DesignFrontmatter[]): string {
  const ids = all.map((t) => t.meta.id);
  const dup = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dup !== undefined) {
    throw new Error(`meta.id가 겹치는 시안이 있습니다: ${dup}`);
  }
  const sorted = [...all].sort((a, b) =>
    a.meta.id < b.meta.id ? -1 : a.meta.id > b.meta.id ? 1 : 0,
  );
  const header = [
    "/*",
    " * 생성물, 직접 수정 금지. 원본: docs/design/candidates/*.DESIGN.md",
    " * 다시 만들기: pnpm tokens (scripts/build-tokens.ts, 규칙은 FORMAT.md 3절)",
    " *",
    ' * [data-design="<id>"]      라이트',
    " * .dark 조상/같은 요소, 시스템 다크(.light 강제 시 제외)  다크",
    ' * [data-theme="dark|light"]  같은 요소에서 테마 강제 (디자인 랩 스위처)',
    " */",
  ].join("\n");
  return `${[header, ...sorted.map(candidateCss)].join("\n\n")}\n`;
}

/** 확정본(루트 DESIGN.md) → src/styles/tokens.css 전체. */
export function finalTokensFile(tokens: DesignFrontmatter): string {
  const light = [
    SCHEME_LIGHT,
    ...themeVars(tokens, "light"),
    ...staticVars(tokens),
  ];
  const dark = [SCHEME_DARK, ...themeVars(tokens, "dark")];
  assertUnique(light, "확정본 라이트");
  assertUnique(dark, "확정본 다크");
  const header = [
    "/*",
    " * 생성물, 직접 수정 금지. 원본: DESIGN.md (루트)",
    " * 다시 만들기: pnpm tokens (scripts/build-tokens.ts, 규칙은 docs/design/candidates/FORMAT.md 3절)",
    ` * ${metaLine(tokens)}`,
    " */",
  ].join("\n");
  return `${[
    header,
    rule(FINAL_SELECTORS.light, light),
    `/* 다크: shadcn 표준 .dark 클래스 */\n${rule(FINAL_SELECTORS.dark, dark)}`,
    `/* 시스템 다크: .light나 .dark로 명시하지 않은 경우 */\n${media(
      "(prefers-color-scheme: dark)",
      rule(FINAL_SELECTORS.systemDark, dark, "  "),
    )}`,
  ].join("\n\n")}\n`;
}
