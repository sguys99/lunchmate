/**
 * 해요체/습니다체 비율 리포트 (T2.3). 규칙 정본: docs/tasks.md 2.2절.
 *
 * 도메인 문구 파일(src/copy/<도메인>.ts) 단위로 해요체 25~40%를 허용 범위로 본다.
 * 명사형(버튼, 탭, 칩, 라벨)은 비율에서 제외하고, 약관 파일은 습니다체 100%를 기대한다.
 * 리포트는 경고만 낸다(exit code에 영향 없음).
 *
 * 순수 함수만 둔다(파일 시스템, process 의존 금지). 런타임 상대 import 금지(scan.ts 머리말 참고).
 *
 * 판정은 문장 끝 어미 기반 휴리스틱이다.
 * - 습니다체: ~니다, ~니까, ~시오 (예: "없습니다.", "삭제하시겠습니까?")
 * - 해요체: ~요, ~죠 (예: "넓혀볼까요?", "정했어요!", "괜찮죠?")
 * - 명사형: 그 밖의 모든 문구 (예: "길찾기", "도보 약 4분", "다시 시도")
 * 마침표 유무와 관계없이 어미로 판정한다. 화면 제목처럼 마침표 없이 끝나는 문장도 세기 위해서다.
 * "필요", "중요"처럼 "요"로 끝나는 명사는 명사형으로 본다.
 */
import ts from "typescript";

export type Tone = "haeyo" | "hamnida" | "noun";

export type ToneStatus = "ok" | "out-of-range" | "insufficient" | "terms-haeyo";

export type ToneReport = {
  file: string;
  haeyo: number;
  hamnida: number;
  /** 비율에서 제외된 명사형 문구 수 */
  excluded: number;
  /** haeyo / (haeyo + hamnida), 대상 문장이 없으면 null */
  haeyoRatio: number | null;
  /** 25~40% 범위 안이면 true, 표본 부족이면 null. 약관 파일은 해요체 0건이면 true */
  withinRange: boolean | null;
  /** 약관 파일(습니다체 100% 기대) 여부 */
  terms: boolean;
  status: ToneStatus;
};

export const HAEYO_RATIO_RANGE = { min: 0.25, max: 0.4 } as const;

/** 해요체+습니다체 문장이 이보다 적으면 "표본 부족"으로 보고 경고하지 않는다. */
export const MIN_SENTENCES = 5;

/** 템플릿 치환식 자리 표시. 문장 끝 판정에 영향이 없도록 기호를 쓴다. */
export const PLACEHOLDER = "○";

/** "요"로 끝나지만 어미가 아닌 명사 */
const YO_NOUNS = /(?:필요|중요|주요|개요|수요|강요|요요)$/;

/** 문장 끝의 문장부호, 따옴표, 괄호, 이모지, 공백, 자리 표시를 걷어낸다. */
const TRAILING = /[^\p{L}\p{N}]+$/u;

/** 문장 하나의 문체를 판정한다. */
export function classifyTone(sentence: string): Tone {
  const core = sentence.trim().replace(TRAILING, "");
  if (/(?:니다|니까|시오)$/.test(core)) return "hamnida";
  if (/[요죠]$/.test(core) && !YO_NOUNS.test(core)) return "haeyo";
  return "noun";
}

/** 문구 하나를 문장으로 나눈다. 문장부호(. ! ? …) 뒤 공백이나 줄바꿈에서 자른다. */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** 약관 문구 파일 여부. 약관은 습니다체 100%를 기대한다. */
export function isTermsFile(file: string): boolean {
  const base = file.slice(file.lastIndexOf("/") + 1);
  return /^(?:terms|privacy|policy|legal)(?:[-.]|$)/i.test(base);
}

/** 한 파일의 문구 목록으로 비율 리포트를 만든다. */
export function buildToneReport(
  file: string,
  texts: readonly string[],
): ToneReport {
  let haeyo = 0;
  let hamnida = 0;
  let excluded = 0;
  for (const text of texts) {
    for (const s of splitSentences(text)) {
      const tone = classifyTone(s);
      if (tone === "haeyo") haeyo++;
      else if (tone === "hamnida") hamnida++;
      else excluded++;
    }
  }
  const counted = haeyo + hamnida;
  const haeyoRatio = counted > 0 ? haeyo / counted : null;
  const terms = isTermsFile(file);

  let status: ToneStatus;
  let withinRange: boolean | null;
  if (terms) {
    withinRange = haeyo === 0;
    status = withinRange ? "ok" : "terms-haeyo";
  } else if (counted < MIN_SENTENCES || haeyoRatio === null) {
    withinRange = null;
    status = "insufficient";
  } else {
    withinRange =
      haeyoRatio >= HAEYO_RATIO_RANGE.min &&
      haeyoRatio <= HAEYO_RATIO_RANGE.max;
    status = withinRange ? "ok" : "out-of-range";
  }
  return {
    file,
    haeyo,
    hamnida,
    excluded,
    haeyoRatio,
    withinRange,
    terms,
    status,
  };
}

function isModuleSpecifier(node: ts.Node): boolean {
  const p = node.parent;
  return (
    (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) &&
    p.moduleSpecifier === node
  );
}

/**
 * 문구 파일 소스에서 화면 문구 후보를 뽑는다.
 * - 문자열 리터럴, 치환 없는 템플릿
 * - 치환 있는 템플릿은 치환식을 PLACEHOLDER로 바꿔 한 문장으로 복원
 * - 제외: 주석, import/export 경로, 문자열 키(`{ "a": ... }`의 "a"), 타입 위치의 리터럴
 * JSON 문구 파일은 모든 문자열 값을 뽑는다(키 제외).
 */
export function extractCopyTexts(file: string, text: string): string[] {
  if (/\.json$/i.test(file)) {
    const out: string[] = [];
    const walk = (v: unknown): void => {
      if (typeof v === "string") out.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") Object.values(v).forEach(walk);
    };
    walk(JSON.parse(text));
    return out;
  }

  const sf = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    /\.tsx$/i.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const out: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isTypeNode(node)) return;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const p = node.parent;
      const isKey =
        (ts.isPropertyAssignment(p) || ts.isPropertySignature(p)) &&
        p.name === node;
      if (!isKey && !isModuleSpecifier(node)) out.push(node.text);
      return;
    }
    if (ts.isTemplateExpression(node)) {
      out.push(
        node.head.text +
          node.templateSpans.map((s) => PLACEHOLDER + s.literal.text).join(""),
      );
      // 치환식 안의 문자열(삼항 분기 등)도 따로 센다
      for (const s of node.templateSpans) visit(s.expression);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

function pct(r: number | null): string {
  return r === null ? "-" : `${Math.round(r * 100)}%`;
}

/** 리포트 한 줄. 경고 대상이면 앞에 "경고"를 붙인다. */
export function formatToneReport(r: ToneReport): string {
  const counts = `해요체 ${r.haeyo}, 습니다체 ${r.hamnida}, 명사형 제외 ${r.excluded}`;
  const ratio = `해요체 ${pct(r.haeyoRatio)}`;
  switch (r.status) {
    case "ok":
      return r.terms
        ? `  ${r.file}  약관, 해요체 0건  (${counts})`
        : `  ${r.file}  ${ratio}  (${counts})`;
    case "insufficient":
      return `  ${r.file}  표본 부족 ${ratio}  (${counts}, ${MIN_SENTENCES}문장 미만은 경고 제외)`;
    case "out-of-range": {
      const { min, max } = HAEYO_RATIO_RANGE;
      return `경고 ${r.file}  ${ratio}, 허용 범위 ${min * 100}~${max * 100}% 밖  (${counts})`;
    }
    case "terms-haeyo":
      return `경고 ${r.file}  약관인데 해요체 ${r.haeyo}건, 약관은 습니다체만 씁니다  (${counts})`;
  }
}
