/**
 * 디자인 토큰 생성 CLI (T1.9). 규칙: docs/design/candidates/FORMAT.md 3절, 변환: src/lib/design/to-css.ts.
 *
 *   node scripts/build-tokens.ts             시안 + 확정본 생성
 *   node scripts/build-tokens.ts --check     디스크와 다르면 exit 1 (파일을 쓰지 않음, CI/훅용)
 *   node scripts/build-tokens.ts --only a    시안 a만 검증하고 변환해 본다 (파일은 쓰지 않음)
 *   node scripts/build-tokens.ts --root <폴더>  다른 폴더를 저장소 루트처럼 사용 (테스트용)
 *
 * 모드 1(시안): docs/design/candidates/*.DESIGN.md (언더스코어로 시작하는 템플릿 제외)
 *              → src/styles/design-candidates.css, 시안마다 [data-design="<id>"] 세트
 * 모드 2(확정): 루트 DESIGN.md가 있으면 → src/styles/tokens.css (:root, .dark, 시스템 다크)
 *              없으면 tokens.css는 건드리지 않는다.
 *
 * 생성 전에 대비 검사(T1.15, src/lib/design/contrast.ts)를 돌린다. contrastPairs 중 하나라도 기준 미만이면
 * 파일, 테마, 쌍, 실측값, 기준값을 출력하고 exit 1(아무 파일도 쓰지 않음). 통과하면 문서별 최저 대비를 한 줄씩 출력.
 *
 * Node 내장 type stripping으로 실행한다(scripts/check-copy.ts와 같은 방식).
 * 상대 모듈은 타입만 정적 import하고, 값은 `.ts` URL로 동적 import한다.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";
import type * as SchemaModule from "../src/lib/design/schema";
import type * as ToCssModule from "../src/lib/design/to-css";
import type * as ContrastModule from "../src/lib/design/contrast";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");

const schema: typeof SchemaModule = await import(
  new URL("../src/lib/design/schema.ts", import.meta.url).href
);
const toCss: typeof ToCssModule = await import(
  new URL("../src/lib/design/to-css.ts", import.meta.url).href
);
const contrast: typeof ContrastModule = await import(
  new URL("../src/lib/design/contrast.ts", import.meta.url).href
);

const CANDIDATE_DIR = "docs/design/candidates";
const CANDIDATE_OUT = "src/styles/design-candidates.css";
const FINAL_SRC = "DESIGN.md";
const FINAL_OUT = "src/styles/tokens.css";

/* 인자 ---------------------------------------------------------------- */

const args = process.argv.slice(2);
let check = false;
let only: string | undefined;
let rootArg: string | undefined;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--check") check = true;
  else if (a === "--root") {
    // 테스트용: 다른 폴더를 저장소 루트처럼 읽고 쓴다(Prettier 설정은 이 저장소 것을 씀).
    const dir = args[++i];
    if (!dir) fail("--root 뒤에 폴더 경로를 적어 주세요", 2);
    rootArg = path.resolve(dir);
  } else if (a === "--only") {
    only = args[++i];
    if (!only) fail("--only 뒤에 시안 id를 적어 주세요 (예: --only a)", 2);
  } else if (a?.startsWith("--only=")) only = a.slice("--only=".length);
  else
    fail(
      `알 수 없는 인자: ${a} (사용 가능: --check, --only <id>, --root <폴더>)`,
      2,
    );
}

function fail(msg: string, code = 1): never {
  console.error(msg);
  process.exit(code);
}

const root = rootArg ?? repo;

/* 읽기, 검증 ------------------------------------------------------------ */

type Loaded = { file: string; tokens: SchemaModule.DesignFrontmatter };

const errors: string[] = [];

function load(rel: string): Loaded | null {
  try {
    const { tokens } = schema.parseDesignDoc(
      readFileSync(path.join(root, rel), "utf8"),
    );
    return { file: rel, tokens };
  } catch (e) {
    errors.push(`${rel}\n${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

const candidateFiles = readdirSync(path.join(root, CANDIDATE_DIR))
  .filter((f) => f.endsWith(".DESIGN.md") && !f.startsWith("_"))
  .filter((f) => only === undefined || f === `${only}.DESIGN.md`)
  .sort()
  .map((f) => `${CANDIDATE_DIR}/${f}`);

const candidates = candidateFiles
  .map(load)
  .filter((x): x is Loaded => x !== null);

for (const c of candidates) {
  const expected = path.basename(c.file, ".DESIGN.md");
  if (c.tokens.meta.id !== expected) {
    errors.push(
      `${c.file}\n- meta.id: 파일 이름과 같아야 합니다 (파일 ${expected}, meta.id ${c.tokens.meta.id})`,
    );
  }
  if (c.tokens.meta.status !== "candidate") {
    errors.push(
      `${c.file}\n- meta.status: 시안 파일은 candidate여야 합니다 (현재 ${c.tokens.meta.status})`,
    );
  }
}

const finalExists = existsSync(path.join(root, FINAL_SRC));
const final = finalExists && only === undefined ? load(FINAL_SRC) : null;
if (final && final.tokens.meta.status !== "final") {
  errors.push(
    `${FINAL_SRC}\n- meta.status: 확정본은 final이어야 합니다 (현재 ${final.tokens.meta.status})`,
  );
}

if (
  only !== undefined &&
  !candidateFiles.includes(`${CANDIDATE_DIR}/${only}.DESIGN.md`)
) {
  errors.push(
    `${CANDIDATE_DIR}/${only}.DESIGN.md 파일이 없습니다 (--only ${only})`,
  );
}

if (errors.length > 0) {
  fail(
    `토큰 생성 실패: 아래 문제를 고친 뒤 다시 실행하세요.\n\n${errors.join("\n\n")}`,
  );
}

/* 대비 검사 (T1.15) ----------------------------------------------------- */

const checked = [...candidates, ...(final ? [final] : [])].map((d) => ({
  ...d,
  results: contrast.checkContrast(d.tokens),
}));

const contrastErrors = checked
  .map((d) => ({ file: d.file, bad: d.results.filter((r) => !r.pass) }))
  .filter((d) => d.bad.length > 0);

if (contrastErrors.length > 0) {
  const body = contrastErrors
    .map(
      (d) =>
        `${d.file}\n${d.bad.map((r) => `- ${contrast.describeFailure(r)}`).join("\n")}`,
    )
    .join("\n\n");
  fail(
    `토큰 생성 실패: 대비 기준 미달 (WCAG 2.x, docs/design/candidates/FORMAT.md 2.4절). 색을 고친 뒤 다시 실행하세요.\n\n${body}`,
  );
}

for (const d of checked) {
  for (const r of d.results.filter((x) => x.clamped.length > 0)) {
    console.warn(`경고: ${d.file} ${contrast.describeClamp(r)}`);
  }
  console.log(contrast.summarize(d.tokens.meta.id, d.results));
}

/* 생성, 쓰기 ------------------------------------------------------------ */

const outputs: { file: string; css: string }[] = [];

try {
  if (only !== undefined) {
    // 한 시안만 검증하고 변환 가능 여부를 확인한다. 부분 파일로 덮어쓰지 않는다.
    const one = candidates.find((c) => c.tokens.meta.id === only);
    if (one) toCss.candidatesFile([one.tokens]);
    console.log(
      `시안 ${only}: 검증과 변환 통과 (파일은 쓰지 않음, 전체 생성은 pnpm tokens)`,
    );
    process.exit(0);
  }

  if (candidates.length === 0) {
    console.log(
      `시안 없음: ${CANDIDATE_DIR}/<id>.DESIGN.md가 없어 ${CANDIDATE_OUT}를 만들지 않았습니다.`,
    );
  } else {
    outputs.push({
      file: CANDIDATE_OUT,
      css: toCss.candidatesFile(candidates.map((c) => c.tokens)),
    });
  }

  if (final) {
    outputs.push({ file: FINAL_OUT, css: toCss.finalTokensFile(final.tokens) });
  } else {
    console.log(
      `확정본 없음: 루트 ${FINAL_SRC}가 없어 ${FINAL_OUT}는 그대로 둡니다 (G1 확정 후 생성).`,
    );
  }
} catch (e) {
  fail(`토큰 변환 실패: ${e instanceof Error ? e.message : String(e)}`);
}

let stale = 0;
for (const { file, css: raw } of outputs) {
  const abs = path.join(root, file);
  // 저장소 Prettier 설정으로 한 번 정리한다(긴 font 스택 줄바꿈 등). 같은 입력이면 같은 출력.
  const config = (await prettier.resolveConfig(path.join(repo, file))) ?? {};
  const css = await prettier.format(raw, { ...config, filepath: abs });
  const current = existsSync(abs) ? readFileSync(abs, "utf8") : null;
  if (current === css) {
    console.log(`최신: ${file}`);
    continue;
  }
  if (check) {
    stale++;
    console.error(`다름: ${file} (pnpm tokens로 다시 생성하세요)`);
    continue;
  }
  writeFileSync(abs, css);
  console.log(`생성: ${file}`);
}

if (check && stale > 0) process.exit(1);
