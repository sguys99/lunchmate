/**
 * 저장소의 실제 DESIGN 문서 검사 (T1.15). pre-push의 `pnpm test`에 포함되어 아래가 깨지면 푸시를 막는다.
 * - docs/design/candidates/*.DESIGN.md(템플릿 포함)와 루트 DESIGN.md(있으면)가 스키마를 통과하는지
 * - 모든 contrastPairs가 라이트, 다크에서 기준 대비 이상인지
 * - 생성물(src/styles/design-candidates.css, 확정 후 tokens.css)이 문서와 같은지 (`pnpm tokens --check`와 같은 판정)
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import * as prettier from "prettier";
import { describe, expect, it } from "vitest";
import { checkContrast, describeFailure } from "./contrast";
import { parseDesignDoc, type DesignFrontmatter } from "./schema";
import { candidatesFile, finalTokensFile } from "./to-css";

const REPO = path.resolve(__dirname, "../../..");
const CANDIDATE_DIR = "docs/design/candidates";
const FINAL_SRC = "DESIGN.md";

const candidateFiles = readdirSync(path.join(REPO, CANDIDATE_DIR))
  .filter((f) => f.endsWith(".DESIGN.md"))
  .sort()
  .map((f) => `${CANDIDATE_DIR}/${f}`);

const docFiles = [
  ...candidateFiles,
  ...(existsSync(path.join(REPO, FINAL_SRC)) ? [FINAL_SRC] : []),
];

function load(rel: string): DesignFrontmatter {
  return parseDesignDoc(readFileSync(path.join(REPO, rel), "utf8")).tokens;
}

describe("저장소 DESIGN 문서", () => {
  it("템플릿과 시안 파일이 있다", () => {
    expect(candidateFiles).toContain(`${CANDIDATE_DIR}/_template.DESIGN.md`);
  });

  describe.each(docFiles)("%s", (rel) => {
    it("스키마를 통과한다", () => {
      expect(() => load(rel)).not.toThrow();
    });

    it("모든 contrastPairs가 기준 대비 이상이다", () => {
      const failures = checkContrast(load(rel))
        .filter((r) => !r.pass)
        .map(describeFailure);
      expect(failures).toEqual([]);
    });
  });
});

async function formatCss(rel: string, css: string): Promise<string> {
  const abs = path.join(REPO, rel);
  const config = (await prettier.resolveConfig(abs)) ?? {};
  return prettier.format(css, { ...config, filepath: abs });
}

describe("토큰 생성물이 최신이다 (pnpm tokens로 다시 생성)", () => {
  const candidates = candidateFiles.filter(
    (f) => !path.basename(f).startsWith("_"),
  );

  it.runIf(candidates.length > 0)(
    "src/styles/design-candidates.css",
    async () => {
      const out = "src/styles/design-candidates.css";
      const expected = await formatCss(
        out,
        candidatesFile(candidates.map(load)),
      );
      expect(readFileSync(path.join(REPO, out), "utf8")).toBe(expected);
    },
  );

  it.runIf(existsSync(path.join(REPO, FINAL_SRC)))(
    "src/styles/tokens.css",
    async () => {
      const out = "src/styles/tokens.css";
      const expected = await formatCss(out, finalTokensFile(load(FINAL_SRC)));
      expect(readFileSync(path.join(REPO, out), "utf8")).toBe(expected);
    },
  );
});
