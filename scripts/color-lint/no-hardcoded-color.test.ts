/**
 * 하드코딩 색 금지 규칙 테스트 (T1.19). ESLint RuleTester를 Vitest의 describe/it으로 돌린다.
 */
import { RuleTester } from "eslint";
import { describe, expect, it } from "vitest";
import { blankCssComments, findHardcodedColors } from "./match.mjs";
import rule from "./no-hardcoded-color.mjs";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
  // 기본 파서(espree) + JSX. 규칙은 Literal, TemplateElement만 보므로 TS 파서와 결과가 같다.
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
});

const err = (match: string) => ({
  messageId: "hardcoded" as const,
  data: { match },
});

tester.run("no-hardcoded-color", rule, {
  valid: [
    'const a = "bg-primary text-primary-foreground";',
    'const a = "bg-cat-hansik-surface stroke-cat-hansik-ink";',
    'const s = { color: "var(--muted-foreground)" };',
    'const m = "hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]";',
    'const link = <a href="#main">본문</a>;',
    'const url = "https://example.com/#abc";',
    'const ent = "&#123;";',
    'const id = "#add-button";',
    'const n = "#1 추천";',
    "const re = /#fff|rgb\\(/;",
    "const t = <p>#fff 같은 화면 문구는 보지 않습니다</p>;",
    'const f = "fill-transparent text-current";',
  ],
  invalid: [
    { code: 'const a = "#fff";', errors: [err("#fff")] },
    { code: 'const a = "#FFFA";', errors: [err("#FFFA")] },
    { code: 'const a = "#a1b2c3";', errors: [err("#a1b2c3")] },
    { code: 'const a = "#a1b2c3d4";', errors: [err("#a1b2c3d4")] },
    { code: 'const a = "bg-[#1a1a1a] p-4";', errors: [err("#1a1a1a")] },
    { code: 'const a = "text-[rgb(0_0_0)]";', errors: [err("rgb(")] },
    { code: 'const a = "fill-[oklch(0.5_0.1_40)]";', errors: [err("oklch(")] },
    {
      code: 'const s = { color: "rgba(0, 0, 0, 0.5)" };',
      errors: [err("rgba(")],
    },
    {
      code: 'const s = { background: "hsl(20 10% 50%)", color: "hsla(0, 0%, 0%, .4)" };',
      errors: [err("hsl("), err("hsla(")],
    },
    { code: 'const svg = <path fill="#000" />;', errors: [err("#000")] },
    {
      code: "const c = <div className={`bg-[#abcdef] ${x}`} />;",
      errors: [err("#abcdef")],
    },
    {
      code: "const s = `oklab(0.5 0 0) ${x} color(display-p3 1 0 0)`;",
      errors: [err("oklab("), err("color(")],
    },
  ],
});

describe("CSS 검사 도우미", () => {
  it("주석 안 색은 지우고 위치는 유지한다", () => {
    const css = "/* #fff oklch(0 0 0) */\na { color: #123456; }";
    const found = findHardcodedColors(blankCssComments(css));
    expect(found).toEqual([
      { index: css.indexOf("#123456"), match: "#123456" },
    ]);
  });

  it("var()와 color-mix 토큰 혼합은 통과한다", () => {
    expect(
      findHardcodedColors(
        "a { color: var(--primary); background: color-mix(in oklch, var(--a), var(--b) 10%); }",
      ),
    ).toEqual([]);
  });
});
