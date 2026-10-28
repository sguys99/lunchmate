/**
 * ESLint 규칙 `lunchmate/no-hardcoded-color` (T1.19). eslint.config.mjs에서 src/의 .ts/.tsx에 켠다.
 * 문자열 리터럴, 템플릿 리터럴, JSX 속성 값 안의 `#hex`, `rgb(`류 색 함수, Tailwind 임의값 색을 오류로 본다.
 * 패턴: ./match.mjs. 정규식 리터럴과 JSX 텍스트(화면 문구)는 보지 않는다.
 */
import { findHardcodedColors } from "./match.mjs";

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "하드코딩 색 금지. DESIGN.md 토큰(tokens.css 변수, Tailwind 테마 이름)만 쓴다",
    },
    schema: [],
    messages: {
      hardcoded:
        "하드코딩 색 `{{match}}`를 쓰지 않습니다. DESIGN.md 토큰(var(--primary), bg-primary, text-cat-hansik-ink 등)을 쓰세요 (CLAUDE.md 6.3).",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;

    /**
     * @param {import("estree").Node} node
     * @param {string} text  검사할 값
     * @param {number} offset 소스에서 값이 시작하는 위치
     */
    function check(node, text, offset) {
      for (const { index, match } of findHardcodedColors(text)) {
        const start = offset + index;
        context.report({
          node,
          loc: {
            start: sourceCode.getLocFromIndex(start),
            end: sourceCode.getLocFromIndex(start + match.length),
          },
          messageId: "hardcoded",
          data: { match },
        });
      }
    }

    return {
      Literal(node) {
        if (typeof node.value !== "string") return;
        // 원문(raw, 따옴표 포함)으로 검사해 보고 위치를 소스와 정확히 맞춘다.
        const raw = sourceCode.getText(node);
        const [start] = /** @type {[number, number]} */ (node.range);
        check(node, raw, start);
      },
      TemplateElement(node) {
        const [start] = /** @type {[number, number]} */ (node.range);
        check(node, sourceCode.getText(node), start);
      },
    };
  },
};

export default rule;

export const plugin = {
  meta: { name: "lunchmate" },
  rules: { "no-hardcoded-color": rule },
};
