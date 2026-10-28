/**
 * 대비 표 출력 (T1.15, T1.16 비교 자료용). 계산: src/lib/design/contrast.ts.
 *
 *   node scripts/contrast-report.ts     시안(템플릿 제외) + 확정본의 contrastPairs 전체를 마크다운 표로 출력
 *
 * 행은 쌍, 열은 문서 × 테마. 기준 미달 칸은 굵게 표시하고 끝에 미달 목록을 붙인다(exit 코드는 항상 0, 판정은 pnpm tokens 몫).
 * Node 내장 type stripping으로 실행한다(scripts/build-tokens.ts와 같은 방식).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type * as SchemaModule from "../src/lib/design/schema";
import type * as ContrastModule from "../src/lib/design/contrast";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");

const schema: typeof SchemaModule = await import(
  new URL("../src/lib/design/schema.ts", import.meta.url).href
);
const contrast: typeof ContrastModule = await import(
  new URL("../src/lib/design/contrast.ts", import.meta.url).href
);

const CANDIDATE_DIR = "docs/design/candidates";

const files = [
  ...readdirSync(path.join(repo, CANDIDATE_DIR))
    .filter((f) => f.endsWith(".DESIGN.md") && !f.startsWith("_"))
    .sort()
    .map((f) => `${CANDIDATE_DIR}/${f}`),
  ...(existsSync(path.join(repo, "DESIGN.md")) ? ["DESIGN.md"] : []),
];

type Doc = {
  id: string;
  results: ContrastModule.ContrastResult[];
};

const docs: Doc[] = [];
for (const file of files) {
  try {
    const { tokens } = schema.parseDesignDoc(
      readFileSync(path.join(repo, file), "utf8"),
    );
    docs.push({ id: tokens.meta.id, results: contrast.checkContrast(tokens) });
  } catch (e) {
    console.error(
      `${file}: 스키마 검증 실패로 표에서 뺍니다\n${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

const THEMES = ["light", "dark"] as const;

// 쌍 목록: 문서 순서대로 처음 나온 순서를 유지하며 합친다.
const pairKeys: string[] = [];
const pairMins = new Map<string, Set<number>>();
for (const d of docs) {
  for (const r of d.results) {
    const k = `${r.pair.fg} on ${r.pair.bg}`;
    if (!pairMins.has(k)) {
      pairKeys.push(k);
      pairMins.set(k, new Set());
    }
    pairMins.get(k)?.add(r.min);
  }
}

function cell(d: Doc, key: string, theme: "light" | "dark"): string {
  const r = d.results.find(
    (x) => `${x.pair.fg} on ${x.pair.bg}` === key && x.theme === theme,
  );
  if (!r) return "";
  if (r.error !== null) return "**오류**";
  const v = contrast.formatRatio(r.ratio);
  const mark = r.clamped.length > 0 ? "†" : "";
  // 문서마다 기준이 다른 쌍이면 칸에 그 문서의 기준을 붙인다
  const own = (pairMins.get(key)?.size ?? 0) > 1 ? ` (${r.min})` : "";
  return `${r.pass ? v : `**${v}**`}${mark}${own}`;
}

const header = [
  "쌍",
  "기준",
  ...docs.flatMap((d) =>
    THEMES.map((t) => `${d.id} ${contrast.themeLabel(t)}`),
  ),
];
const lines = [
  `| ${header.join(" | ")} |`,
  `| ${header.map((_, i) => (i < 1 ? "---" : "---:")).join(" | ")} |`,
  ...pairKeys.map(
    (k) =>
      `| ${[
        `\`${k}\``,
        [...(pairMins.get(k) ?? [])].sort((a, b) => a - b).join(", "),
        ...docs.flatMap((d) => THEMES.map((t) => cell(d, k, t))),
      ].join(" | ")} |`,
  ),
];

console.log(`## 토큰 대비 (WCAG 2.x, 소수 둘째 자리 내림)\n`);
console.log(lines.join("\n"));
console.log("");
console.log(
  "빈 칸은 그 문서에 없는 쌍, 굵은 값은 기준 미달, †는 sRGB 밖 색을 클램프해서 계산한 값, 괄호는 문서마다 기준이 다른 쌍에서 그 문서의 기준입니다.",
);
console.log("");
for (const d of docs) console.log(`- ${contrast.summarize(d.id, d.results)}`);

const failed = docs.flatMap((d) =>
  d.results
    .filter((r) => !r.pass)
    .map((r) => `- ${d.id} ${contrast.describeFailure(r)}`),
);
if (failed.length > 0) {
  console.log(`\n### 기준 미달 ${failed.length}건\n`);
  console.log(failed.join("\n"));
}
