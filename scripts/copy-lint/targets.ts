/**
 * 검사 대상 판정 (순수 함수). 경로는 프로젝트 루트 기준, 구분자는 `/`.
 *
 * 대상: 화면에 보이는 문구가 들어갈 수 있는 파일
 * - src 아래 .ts/.tsx (테스트 `*.test.*`, `*.spec.*`, 선언 `*.d.ts` 제외). src/copy 포함.
 *   JSX 텍스트와 속성, OG 이미지 라우트(opengraph-image.tsx, app/api 아래 og 라우트), metadata export,
 *   manifest.ts가 모두 여기에 들어간다. 문자열 리터럴 전체를 보므로 aria-label, title,
 *   placeholder, alt 외 속성도 검사한다(더 엄격한 쪽).
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

/**
 * 문체 비율 리포트 대상: src/copy 아래 문구 파일(.ts, .json).
 * isTarget을 통과한 파일 중에서 고른다(테스트, 선언 파일 제외는 동일).
 * design-lab* 파일은 사용자에게 나가지 않는 내부 시안 설명문이라 비율 대상에서 뺀다
 * (금지 문자 검사는 그대로 받는다).
 */
export function isToneTarget(relPath: string): boolean {
  const p = relPath.replace(/\\/g, "/");
  return (
    isTarget(p) &&
    p.startsWith("src/copy/") &&
    !p.startsWith("src/copy/design-lab") &&
    /\.(?:ts|json)$/i.test(p)
  );
}
