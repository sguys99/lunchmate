/**
 * 하드코딩 색 찾기 (T1.19, CLAUDE.md 6.3). ESLint 규칙(no-hardcoded-color.mjs)과 CSS 검사(check-css-colors.mjs)가 같이 쓴다.
 *
 * 잡는 것
 * - `#hex` 색: 3, 4, 6, 8자리. 앞이 글자, `&`(HTML 엔티티 `&#123;`), `/`(URL 조각 `/#top`)이면 제외
 * - 색 함수: rgb( rgba( hsl( hsla( hwb( lab( lch( oklab( oklch( color(
 * - Tailwind 임의값 색(`bg-[#abc]`, `text-[rgb(0_0_0)]`, `fill-[oklch(...)]`)은 위 두 패턴에 함께 걸린다
 *
 * 잡지 않는 것: `color-mix(in oklch, var(--a), var(--b))`처럼 토큰 변수를 섞는 표현, CSS 변수, transparent/currentColor.
 * 색은 DESIGN.md → `pnpm tokens` → src/styles/tokens.css 변수와 Tailwind 테마 이름만 쓴다.
 */

const HEX_RE =
  /(?<![\w&#/-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
const FN_RE = /(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/g;

/**
 * @param {string} text
 * @returns {{ index: number, match: string }[]} 등장 순서대로
 */
export function findHardcodedColors(text) {
  /** @type {{ index: number, match: string }[]} */
  const out = [];
  for (const re of [HEX_RE, FN_RE]) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      out.push({ index: m.index ?? 0, match: m[0] });
    }
  }
  return out.sort((a, b) => a.index - b.index);
}

/**
 * CSS 주석을 같은 길이의 공백으로 바꾼다(줄 번호와 위치 유지). 주석 속 예시는 검사하지 않는다.
 * @param {string} css
 */
export function blankCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));
}
