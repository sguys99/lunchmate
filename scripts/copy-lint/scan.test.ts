import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_CHARS,
  findForbidden,
  formatViolation,
  scanFile,
  scanPlainText,
  scanSource,
} from "./scan";

// 금지 문자는 테스트 소스에서도 이스케이프로만 쓴다
const EM = "—";
const MID = "·";

describe("금지 문자 탐지", () => {
  it.each(FORBIDDEN_CHARS.map((c) => [c.code, c.char] as const))(
    "%s를 문자열 리터럴에서 찾는다",
    (code, ch) => {
      const v = scanSource("a.ts", `const s = "점심${ch}저녁";\n`);
      expect(v).toHaveLength(1);
      expect(v[0]).toMatchObject({ code, line: 1, column: 14, char: ch });
    },
  );

  it("10종 모두 목록에 있다", () => {
    expect(FORBIDDEN_CHARS.map((c) => c.code).sort()).toEqual(
      [
        "U+00B7",
        "U+2012",
        "U+2013",
        "U+2014",
        "U+2015",
        "U+2027",
        "U+2219",
        "U+22C5",
        "U+30FB",
        "U+FF65",
      ].sort(),
    );
  });

  it("허용 문자(하이픈, 마이너스, 물결)는 통과", () => {
    expect(scanSource("a.ts", `const s = "11:30~13:00 a-b ‐ − , /";`)).toEqual(
      [],
    );
  });

  it("JS 이스케이프로 쓴 금지 문자도 찾는다", () => {
    const v = scanSource("a.ts", 'const s = "a\\u2014b \\u{B7} \\xB7";');
    expect(v.map((x) => [x.code, x.raw])).toEqual([
      ["U+2014", "\\u2014"],
      ["U+00B7", "\\u{B7}"],
      ["U+00B7", "\\xB7"],
    ]);
  });

  it("역슬래시 이스케이프 뒤 문자는 오탐하지 않는다", () => {
    expect(findForbidden("\\\\u2014", { escapes: true })).toEqual([]);
  });
});

describe("주석 무시", () => {
  it("줄 주석과 블록 주석, JSX 주석 속 금지 문자는 무시", () => {
    const src = [
      `// 점심${EM}저녁`,
      `/* 한식${MID}국밥 */`,
      `/** 문서 ${EM} 주석 */`,
      `const a = 1; // 끝 ${EM}`,
      `export const C = () => <div>{/* ${MID} */}안녕</div>;`,
    ].join("\n");
    expect(scanSource("a.tsx", src)).toEqual([]);
  });

  it("import 경로 문자열은 검사하지 않는다", () => {
    expect(
      scanSource(
        "a.ts",
        `import x from "./a${EM}b";\nexport { y } from "./c${MID}";`,
      ),
    ).toEqual([]);
  });
});

describe("ignore 주석", () => {
  it("바로 윗줄 `// copy-lint-ignore-next-line 이유`가 있으면 무시", () => {
    const src = [
      "// copy-lint-ignore-next-line 외부 상호명 원문 그대로",
      `const a = "가${EM}나";`,
      `const b = "다${EM}라";`,
    ].join("\n");
    const v = scanSource("a.ts", src);
    expect(v).toHaveLength(1);
    expect(v[0]?.line).toBe(3);
  });

  it("이유가 없으면 무시하지 않는다", () => {
    const src = [
      "// copy-lint-ignore-next-line",
      `const a = "가${EM}나";`,
    ].join("\n");
    expect(scanSource("a.ts", src)).toHaveLength(1);
  });

  it("두 줄 위 지시문은 효과가 없다", () => {
    const src = [
      "// copy-lint-ignore-next-line 이유",
      "",
      `const a = "가${EM}나";`,
    ].join("\n");
    expect(scanSource("a.ts", src)).toHaveLength(1);
  });

  it("JSX 주석 형태 지시문도 인정", () => {
    const src = [
      "export const C = () => (",
      "  <p>",
      "    {/* copy-lint-ignore-next-line 인용 원문 */}",
      `    가${EM}나`,
      "  </p>",
      ");",
    ].join("\n");
    expect(scanSource("a.tsx", src)).toEqual([]);
  });
});

describe("JSX", () => {
  it("JSX 텍스트의 줄, 열을 정확히 보고", () => {
    const src = [
      "export const C = () => (",
      `  <p>한식${MID}국밥</p>`,
      ");",
    ].join("\n");
    const v = scanSource("a.tsx", src);
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ line: 2, column: 8, code: "U+00B7" });
  });

  it("JSX 속성 문자열", () => {
    const v = scanSource(
      "a.tsx",
      `export const C = () => <img alt="국밥${EM}한식" />;`,
    );
    expect(v.map((x) => x.code)).toEqual(["U+2014"]);
  });

  it("JSX 텍스트와 속성의 HTML 엔티티", () => {
    const v = scanSource(
      "a.tsx",
      `export const C = () => <p title="a&middot;b">x&mdash;y &#8211; &#x2015; &amp;</p>;`,
    );
    expect(v.map((x) => [x.code, x.raw])).toEqual([
      ["U+00B7", "&middot;"],
      ["U+2014", "&mdash;"],
      ["U+2013", "&#8211;"],
      ["U+2015", "&#x2015;"],
    ]);
  });

  it(".ts 파일의 일반 문자열 속 엔티티 표기는 문자 그대로라 무시", () => {
    expect(scanSource("a.ts", `const s = "&mdash;";`)).toEqual([]);
  });
});

describe("템플릿 리터럴", () => {
  it("치환 없는 템플릿", () => {
    expect(scanSource("a.ts", `const s = \`가${EM}나\`;`)).toHaveLength(1);
  });

  it("Head, Middle, Tail 모두 검사하고 치환식 안 문자열도 검사", () => {
    const src = `const s = \`가${EM}\${a}나${MID}\${"b${EM}"}다–\`;`;
    const v = scanSource("a.ts", src);
    expect(v.map((x) => x.code)).toEqual([
      "U+2014",
      "U+00B7",
      "U+2014",
      "U+2013",
    ]);
  });

  it("여러 줄 템플릿의 줄 번호", () => {
    const src = ["const s = `첫 줄", `둘째${EM}줄\`;`].join("\n");
    expect(scanSource("a.ts", src)[0]).toMatchObject({ line: 2, column: 3 });
  });
});

describe("텍스트 파일과 출력", () => {
  it("JSON 매니페스트는 전체를 검사 (이스케이프 포함)", () => {
    const v = scanPlainText(
      "public/manifest.json",
      `{\n  "name": "런치메이트${EM}점심",\n  "d": "a\\u00b7b"\n}`,
    );
    expect(v.map((x) => [x.line, x.code])).toEqual([
      [2, "U+2014"],
      [3, "U+00B7"],
    ]);
  });

  it("scanFile은 확장자로 검사 방식을 고른다", () => {
    expect(
      scanFile("src/app/opengraph-image.alt.txt", `가${EM}나`),
    ).toHaveLength(1);
    expect(scanFile("src/a.ts", `// 가${EM}나`)).toEqual([]);
  });

  it("형식: 파일:줄:열  금지 문자 '문자'(코드)  →  안내", () => {
    const [v] = scanSource("src/a.ts", `const s = "a${EM}b";`);
    expect(v && formatViolation(v)).toBe(
      `src/a.ts:1:13  금지 문자 '${EM}'(U+2014)  →  쉼표, 마침표, 괄호로 바꾸고 범위는 ~ (예: 11:30~13:00)`,
    );
  });
});
