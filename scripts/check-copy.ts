/**
 * UI 문구 검사 CLI (T0.31 뼈대, T2.3 완성).
 *
 *   node scripts/check-copy.ts            금지 문자 검사 + 문체 비율 리포트. 금지 문자가 있으면 exit 1
 *   node scripts/check-copy.ts --json     결과를 JSON으로 출력
 *   node scripts/check-copy.ts --report   문체 비율 리포트만 (항상 exit 0)
 *   node scripts/check-copy.ts <경로...>  지정한 파일/폴더만 검사 (대상 판정은 동일)
 *
 * 금지 문자 대상(targets.ts): src 아래 .ts/.tsx 전체(src/copy, JSX 텍스트와 속성, OG 이미지,
 * metadata, manifest.ts 포함), 정적 매니페스트와 OG alt 텍스트. 주석, 테스트, docs는 제외.
 * 문체 비율 대상: src/copy 아래 문구 파일. 범위 밖이어도 경고만 하고 exit code는 바꾸지 않는다.
 *
 * Node 24 내장 type stripping으로 의존성 없이 실행한다(erasable syntax만 사용).
 * 상대 모듈은 타입만 정적 import하고(실행 시 지워짐), 값은 `.ts` 경로로 동적 import한다.
 * tsconfig에 allowImportingTsExtensions가 없어도 typecheck가 통과하게 하려는 우회다.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type * as ScanModule from "./copy-lint/scan";
import type * as TargetsModule from "./copy-lint/targets";
import type * as ToneModule from "./copy-lint/tone";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const scan: typeof ScanModule = await import(
  new URL("./copy-lint/scan.ts", import.meta.url).href
);
const targets: typeof TargetsModule = await import(
  new URL("./copy-lint/targets.ts", import.meta.url).href
);
const tone: typeof ToneModule = await import(
  new URL("./copy-lint/tone.ts", import.meta.url).href
);

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const paths = args.filter((a) => !a.startsWith("--"));

for (const f of flags) {
  if (f !== "--json" && f !== "--report") {
    console.error(`알 수 없는 옵션: ${f} (사용 가능: --json, --report)`);
    process.exit(2);
  }
}

function toRel(abs: string): string {
  return path.relative(root, abs).split(path.sep).join("/");
}

function collect(entry: string): string[] {
  const abs = path.resolve(root, entry);
  if (!existsSync(abs)) return [];
  if (statSync(abs).isFile()) return [toRel(abs)];
  return readdirSync(abs, { recursive: true, encoding: "utf8" })
    .map((p) => toRel(path.join(abs, p)))
    .filter((rel) => statSync(path.join(root, rel)).isFile());
}

const files = [
  ...new Set((paths.length ? paths : targets.SCAN_ROOTS).flatMap(collect)),
]
  .filter(targets.isTarget)
  .sort();

const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");

const toneReports = files
  .filter(targets.isToneTarget)
  .map((rel) =>
    tone.buildToneReport(rel, tone.extractCopyTexts(rel, read(rel))),
  );
const toneWarnings = toneReports.filter(
  (r) => r.status === "out-of-range" || r.status === "terms-haeyo",
);

function printToneReport(): void {
  const { min, max } = tone.HAEYO_RATIO_RANGE;
  console.log(
    `\n문체 비율 (src/copy 파일별 해요체 비율, 허용 ${min * 100}~${max * 100}%)`,
  );
  if (toneReports.length === 0) console.log("  대상 파일 없음");
  for (const r of toneReports) console.log(tone.formatToneReport(r));
  if (toneWarnings.length > 0) {
    console.log(
      `문체 경고 ${toneWarnings.length}건 (경고만, 검사 실패로 치지 않습니다)`,
    );
  }
}

if (flags.has("--report")) {
  printToneReport();
  process.exit(0);
}

const violations = files.flatMap((rel) => scan.scanFile(rel, read(rel)));

if (flags.has("--json")) {
  console.log(
    JSON.stringify(
      { files: files.length, violations, tone: toneReports },
      null,
      2,
    ),
  );
} else {
  if (violations.length === 0) {
    console.log(`lint:copy 금지 문자 없음 (파일 ${files.length}개 검사)`);
  } else {
    for (const v of violations) console.log(scan.formatViolation(v));
    console.log(
      `\n금지 문자 ${violations.length}건 (파일 ${files.length}개 검사)`,
    );
  }
  printToneReport();
}

process.exit(violations.length > 0 ? 1 : 0);
