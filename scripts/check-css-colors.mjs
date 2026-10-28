/**
 * CSS 하드코딩 색 검사 CLI (T1.19). `pnpm lint`가 ESLint 다음에 실행한다.
 *
 *   node scripts/check-css-colors.mjs           src/**\/*.css 검사, 위반 있으면 exit 1
 *   node scripts/check-css-colors.mjs <파일...>  지정한 파일만 검사
 *
 * 제외: DESIGN.md 생성물(src/styles/tokens.css, src/styles/design-candidates.css). 색 값은 그 두 파일에만 있다.
 * 패턴은 ESLint 규칙과 같다(scripts/color-lint/match.mjs). CSS 주석 안은 보지 않는다.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { blankCssComments, findHardcodedColors } from "./color-lint/match.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const GENERATED = new Set([
  "src/styles/tokens.css",
  "src/styles/design-candidates.css",
]);

/** @param {string} dir */
function walk(dir) {
  /** @type {string[]} */
  const out = [];
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    if (statSync(abs).isDirectory()) out.push(...walk(abs));
    else if (name.endsWith(".css")) out.push(abs);
  }
  return out;
}

const args = process.argv.slice(2);
const files = (
  args.length > 0
    ? args.map((a) => path.resolve(a))
    : walk(path.join(root, "src"))
)
  .map((abs) => path.relative(root, abs).split(path.sep).join("/"))
  .filter((rel) => !GENERATED.has(rel))
  .sort();

let count = 0;
for (const rel of files) {
  const css = blankCssComments(readFileSync(path.join(root, rel), "utf8"));
  for (const { index, match } of findHardcodedColors(css)) {
    const before = css.slice(0, index);
    const line = before.split("\n").length;
    const col = index - before.lastIndexOf("\n");
    console.error(
      `${rel}:${line}:${col}  하드코딩 색 \`${match}\` (DESIGN.md 토큰 변수를 쓰세요, CLAUDE.md 6.3)`,
    );
    count++;
  }
}

if (count > 0) {
  console.error(`\nCSS 하드코딩 색 ${count}건 (${files.length}개 파일 검사)`);
  process.exit(1);
}
console.log(`CSS 하드코딩 색 없음 (${files.length}개 파일 검사)`);
