/**
 * UI 문구 금지 문자 검사 (T0.31). 규칙 정본: docs/tasks.md 2.2절, CLAUDE.md 9장.
 *
 * 순수 함수만 둔다(파일 시스템, process 의존 금지). CLI는 scripts/check-copy.ts.
 * 이 파일은 런타임 값 import를 하지 않는다. Node 내장 type stripping은
 * 상대 경로에 `.ts` 확장자가 필요하고, tsconfig에는 allowImportingTsExtensions가
 * 없기 때문이다(외부 패키지 `typescript` import는 문제없음).
 */
import ts from "typescript";

export type ForbiddenKind = "dash" | "middot";

export type ForbiddenChar = {
  char: string;
  code: string;
  name: string;
  kind: ForbiddenKind;
};

/**
 * 금지 문자 목록.
 * - tasks.md 2.2절 명시: U+2014, U+2013, U+2015, U+00B7, U+30FB, U+2027
 * - 추가 판단(모양이 같아 규칙 우회가 되는 문자):
 *   U+2012 figure dash: en dash와 폭만 다른 대시. 범위 표기 대용으로 쓰이기 쉽다.
 *   U+FF65 반각 가타카나 중간점: U+30FB의 반각형. 화면에서 가운뎃점과 구분되지 않는다.
 *   U+2219 bullet operator, U+22C5 dot operator: 수식 기호지만 한글 폰트에서
 *   가운뎃점과 같은 모양으로 렌더링되어 키워드 나열 구분자로 오용된다.
 * - 허용: 하이픈 U+002D, U+2010, U+2011, 마이너스 U+2212, 물결 ~ (범위 표기용).
 */
export const FORBIDDEN_CHARS: readonly ForbiddenChar[] = [
  { char: "—", code: "U+2014", name: "Em dash", kind: "dash" },
  { char: "–", code: "U+2013", name: "en dash", kind: "dash" },
  { char: "―", code: "U+2015", name: "가로줄", kind: "dash" },
  { char: "‒", code: "U+2012", name: "figure dash", kind: "dash" },
  { char: "·", code: "U+00B7", name: "중간점", kind: "middot" },
  { char: "・", code: "U+30FB", name: "가타카나 중간점", kind: "middot" },
  { char: "‧", code: "U+2027", name: "하이픈 점", kind: "middot" },
  { char: "･", code: "U+FF65", name: "반각 중간점", kind: "middot" },
  { char: "∙", code: "U+2219", name: "bullet operator", kind: "middot" },
  { char: "⋅", code: "U+22C5", name: "dot operator", kind: "middot" },
];

export const HINTS: Record<ForbiddenKind, string> = {
  dash: "쉼표, 마침표, 괄호로 바꾸고 범위는 ~ (예: 11:30~13:00)",
  middot: "쉼표, 와/과, 슬래시로 바꾸세요 (예: 한식과 국밥, 룸 있음/단체석)",
};

const BY_CHAR = new Map(FORBIDDEN_CHARS.map((c) => [c.char, c]));

export const IGNORE_DIRECTIVE = "copy-lint-ignore-next-line";

/** 바로 윗줄이 `// copy-lint-ignore-next-line 이유` 또는 JSX `{/* ... *\/}` 형태면 무시. 이유는 필수. */
const IGNORE_RE = new RegExp(
  String.raw`^\s*(?:\/\/|\{?\s*\/\*)\s*${IGNORE_DIRECTIVE}\s+\S`,
);

export type Violation = {
  file: string;
  /** 1부터 시작 */
  line: number;
  /** 1부터 시작, UTF-16 코드 단위 기준 */
  column: number;
  char: string;
  code: string;
  name: string;
  hint: string;
  /** 소스에 이스케이프나 HTML 엔티티로 쓰여 있었으면 그 원문 */
  raw?: string;
};

type Hit = { offset: number; char: string; raw?: string };

const HTML_ENTITIES: Record<string, string> = {
  mdash: "—",
  ndash: "–",
  horbar: "―",
  middot: "·",
  centerdot: "·",
};

function fromCodePoint(hex: string, radix: number): string | undefined {
  const n = Number.parseInt(hex, radix);
  if (!Number.isFinite(n) || n < 0 || n > 0x10ffff) return undefined;
  return String.fromCodePoint(n);
}

/**
 * 원문 조각에서 금지 문자를 찾는다. 문자 그대로뿐 아니라
 * JS 이스케이프(—, \u{2014}, \xB7)와 JSX의 HTML 엔티티(&mdash; &#8212; &#x2014;)도 잡는다.
 */
export function findForbidden(
  raw: string,
  opts: { escapes?: boolean; entities?: boolean } = {},
): Hit[] {
  const hits: Hit[] = [];
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i] as string;
    if (BY_CHAR.has(ch)) {
      hits.push({ offset: i, char: ch });
      continue;
    }
    if (opts.escapes && ch === "\\") {
      const m =
        /^\\(?:u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2}))/.exec(
          raw.slice(i, i + 12),
        );
      if (m) {
        const decoded = fromCodePoint(m[1] ?? m[2] ?? m[3] ?? "", 16);
        if (decoded && BY_CHAR.has(decoded)) {
          hits.push({ offset: i, char: decoded, raw: m[0] });
        }
        i += m[0].length - 1;
      } else {
        i += 1; // \\ 같은 다른 이스케이프는 다음 문자까지 건너뜀
      }
      continue;
    }
    if (opts.entities && ch === "&") {
      const m = /^&(?:#x([0-9a-fA-F]+)|#([0-9]+)|([a-zA-Z]+));/.exec(
        raw.slice(i, i + 16),
      );
      if (m) {
        const decoded = m[1]
          ? fromCodePoint(m[1], 16)
          : m[2]
            ? fromCodePoint(m[2], 10)
            : HTML_ENTITIES[m[3] ?? ""];
        if (decoded && BY_CHAR.has(decoded)) {
          hits.push({ offset: i, char: decoded, raw: m[0] });
        }
      }
    }
  }
  return hits;
}

function isIgnored(lines: readonly string[], line0: number): boolean {
  const prev = line0 > 0 ? lines[line0 - 1] : undefined;
  return prev !== undefined && IGNORE_RE.test(prev);
}

function toViolation(
  file: string,
  sf: { getLineAndCharacterOfPosition(pos: number): ts.LineAndCharacter },
  pos: number,
  hit: Hit,
): Violation {
  const info = BY_CHAR.get(hit.char) as ForbiddenChar;
  const lc = sf.getLineAndCharacterOfPosition(pos);
  return {
    file,
    line: lc.line + 1,
    column: lc.character + 1,
    char: info.char,
    code: info.code,
    name: info.name,
    hint: HINTS[info.kind],
    ...(hit.raw ? { raw: hit.raw } : {}),
  };
}

function scriptKindFor(file: string): ts.ScriptKind {
  if (/\.tsx$/i.test(file)) return ts.ScriptKind.TSX;
  if (/\.jsx$/i.test(file)) return ts.ScriptKind.JSX;
  if (/\.[cm]?js$/i.test(file)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

/**
 * TS/TSX 소스에서 화면 문구가 될 수 있는 노드만 검사한다:
 * StringLiteral(JSX 속성 문자열 포함), NoSubstitutionTemplateLiteral,
 * TemplateHead/Middle/Tail, JsxText. 주석은 AST 노드가 아니므로 자동으로 빠진다.
 * import/export 경로 문자열은 문구가 아니므로 제외한다.
 */
export function scanSource(file: string, text: string): Violation[] {
  const sf = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFor(file),
  );
  const lines = text.split(/\r?\n/);
  const out: Violation[] = [];

  const check = (
    node: ts.Node,
    opts: { escapes: boolean; entities: boolean },
  ) => {
    const start = node.getStart(sf);
    const raw = text.slice(start, node.getEnd());
    for (const hit of findForbidden(raw, opts)) {
      const v = toViolation(file, sf, start + hit.offset, hit);
      if (!isIgnored(lines, v.line - 1)) out.push(v);
    }
  };

  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier
    ) {
      // 경로 문자열은 건너뛰되 나머지(import attributes 등)는 문구가 아니므로 통째로 생략
      return;
    }
    if (ts.isJsxText(node)) {
      check(node, { escapes: false, entities: true });
    } else if (ts.isStringLiteral(node)) {
      // JSX 속성 문자열은 HTML 엔티티가 해석되고 JS 이스케이프는 해석되지 않는다
      const inJsxAttr = ts.isJsxAttribute(node.parent);
      check(node, { escapes: !inJsxAttr, entities: inJsxAttr });
    } else if (
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      check(node, { escapes: true, entities: false });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/**
 * 주석이 없는 텍스트 파일(JSON 매니페스트, opengraph-image.alt.txt 등)은 전체를 검사한다.
 * JSON의 — 이스케이프도 잡는다.
 */
export function scanPlainText(file: string, text: string): Violation[] {
  const sf = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.JSON,
  );
  const lines = text.split(/\r?\n/);
  const isJson = /\.(json|webmanifest)$/i.test(file);
  return findForbidden(text, { escapes: isJson })
    .map((hit) => toViolation(file, sf, hit.offset, hit))
    .filter((v) => !isIgnored(lines, v.line - 1));
}

const SOURCE_RE = /\.(?:[cm]?[jt]sx?)$/i;

/** 확장자에 따라 AST 검사 또는 전체 텍스트 검사를 고른다. */
export function scanFile(file: string, text: string): Violation[] {
  return SOURCE_RE.test(file)
    ? scanSource(file, text)
    : scanPlainText(file, text);
}

/** `파일:줄:열  금지 문자 '—'(U+2014)  →  안내` */
export function formatViolation(v: Violation): string {
  const shown = v.raw
    ? `'${v.char}'(${v.code}, 소스 표기 ${v.raw})`
    : `'${v.char}'(${v.code})`;
  return `${v.file}:${v.line}:${v.column}  금지 문자 ${shown}  →  ${v.hint}`;
}
