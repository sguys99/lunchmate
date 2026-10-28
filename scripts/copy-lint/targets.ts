/**
 * 검사 대상 판정 (순수 함수). 경로는 프로젝트 루트 기준, 구분자는 `/`.
 *
 * 대상: 화면에 보이는 문구가 들어갈 수 있는 파일
 * - src 아래 .ts/.tsx (테스트 `*.test.*`, `*.spec.*`, 선언 `*.d.ts` 제외). src/copy 포함.
 * - src/copy 아래 .json
 * - public 아래 .json, .webmanifest (정적 매니페스트, 메타)
 * - src/app 아래 manifest.json|webmanifest, opengraph-image|twitter-image의 .alt.txt
 * 제외: docs/, *.md, 주석(scan.ts에서 AST로 제외), 바이너리 자산.
 */
export const SCAN_ROOTS = ["src", "public"] as const;

const TEST_RE = /\.(?:test|spec)\.[cm]?[jt]sx?$/i;

export function isTarget(relPath: string): boolean {
  const p = relPath.replace(/\\/g, "/");
  if (p.split("/").includes("node_modules")) return false;
  if (p.endsWith(".md")) return false;

  if (p.startsWith("src/")) {
    if (/\.(?:ts|tsx)$/i.test(p)) {
      return !TEST_RE.test(p) && !p.endsWith(".d.ts");
    }
    if (p.startsWith("src/copy/") && p.endsWith(".json")) return true;
    if (p.startsWith("src/app/")) {
      const base = p.slice(p.lastIndexOf("/") + 1);
      if (/^manifest\.(?:json|webmanifest)$/i.test(base)) return true;
      if (/^(?:opengraph|twitter)-image(?:\d*)?\.alt\.txt$/i.test(base))
        return true;
    }
    return false;
  }

  if (p.startsWith("public/")) {
    return /\.(?:json|webmanifest)$/i.test(p);
  }
  return false;
}
