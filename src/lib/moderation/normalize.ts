// 금칙어 비교용 정규화 (T6.17, MOD-04, D-13 기타 결정). 순수 함수, 서버 전용 목록과 함께 쓴다.
//
// 원칙
// - 사용자가 낱말 사이에 띄어쓰기, 특수문자, 숫자, 영문자를 끼워 넣거나(시.발, 시1발, 시 발),
//   글자를 늘이거나(씨이이발, 시바알), 자모로 풀어 쓰거나(ㅅㅣㅂㅏㄹ) 초성만 쓴(ㅅㅂ) 경우를 같은 모양으로 맞춘다.
// - 대신 띄어쓰기를 무조건 지우면 "역시 발이 빠르다"가 "역시발"이 되어 걸린다. 그래서
//   (1) 한 글자 낱말이 이어진 덩어리("시 발 놈")만 붙이고,
//   (2) 이웃한 두 낱말을 붙인 문자열은 금칙어가 앞 낱말의 처음에서 시작할 때만 인정한다("미친 놈이" O, "역시 발" X).
// - 결과 문자열은 비교에만 쓰고 저장하거나 돌려주지 않는다.

const ZERO_WIDTH = /[​-‍⁠﻿­]/g;

const S_BASE = 0xac00;
const S_END = 0xd7a3;
const V_COUNT = 21;
const T_COUNT = 28;

/** 호환 자모(ㄱ~ㅎ) 초성 순서 */
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
/** 호환 자모 중성 순서 */
const JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
/** 호환 자모 종성 순서 (0은 받침 없음) */
const JONG = [
  "",
  "ㄱ",
  "ㄲ",
  "ㄳ",
  "ㄴ",
  "ㄵ",
  "ㄶ",
  "ㄷ",
  "ㄹ",
  "ㄺ",
  "ㄻ",
  "ㄼ",
  "ㄽ",
  "ㄾ",
  "ㄿ",
  "ㅀ",
  "ㅁ",
  "ㅂ",
  "ㅄ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];

/** 빈 문자열이면 -1 (indexOf("")는 0이라 끝 글자에서 잘못 조합된다) */
const at = (table: string | readonly string[], c: string) =>
  c === "" ? -1 : table.indexOf(c);

const isSyllable = (c: string) => {
  const code = c.codePointAt(0) ?? 0;
  return code >= S_BASE && code <= S_END;
};

type Parts = { l: number; v: number; t: number };

function split(c: string): Parts | null {
  if (!isSyllable(c)) return null;
  const s = (c.codePointAt(0) ?? 0) - S_BASE;
  return {
    l: Math.floor(s / (V_COUNT * T_COUNT)),
    v: Math.floor((s % (V_COUNT * T_COUNT)) / T_COUNT),
    t: s % T_COUNT,
  };
}

function join({ l, v, t }: Parts): string {
  return String.fromCodePoint(S_BASE + (l * V_COUNT + v) * T_COUNT + t);
}

/** 풀어 쓴 자모(ㅅㅣㅂㅏㄹ)를 음절로 모은다. 모음이 없는 자모(ㅅㅂ)는 그대로 둔다 */
export function composeJamo(text: string): string {
  const chars = Array.from(text);
  let out = "";
  for (let i = 0; i < chars.length; i += 1) {
    const c = chars[i] ?? "";
    const l = at(CHO, c);
    const v = at(JUNG, chars[i + 1] ?? "");
    if (l >= 0 && v >= 0) {
      const next = chars[i + 2] ?? "";
      const afterNext = chars[i + 3] ?? "";
      const t = at(JONG, next);
      // 받침 후보 뒤에 모음이 오면 그 자모는 다음 음절의 초성이다
      const takeFinal = t > 0 && at(JUNG, afterNext) < 0;
      out += join({ l, v, t: takeFinal ? t : 0 });
      i += takeFinal ? 2 : 1;
      continue;
    }
    out += c;
  }
  return out;
}

/** 소리 늘이기 합치기: "씨이" → "씨", "바알" → "발" (앞 음절 모음과 같은 모음의 ㅇ 음절) */
export function mergeStretch(text: string): string {
  const chars = Array.from(text);
  const out: string[] = [];
  for (const c of chars) {
    const prev = out[out.length - 1];
    const p = prev ? split(prev) : null;
    const cur = split(c);
    // ㅇ 초성(11)이고 앞 음절과 모음이 같으며 앞 음절에 받침이 없을 때만
    if (p && cur && cur.l === 11 && cur.v === p.v && p.t === 0) {
      out[out.length - 1] = join({ ...p, t: cur.t });
      continue;
    }
    out.push(c);
  }
  return out.join("");
}

/** 같은 글자가 이어지면 하나로 ("ㅋㅋㅋ" → "ㅋ", "fuuuck" → "fuck") */
export function collapseRepeats(text: string): string {
  return text.replace(/(.)\1+/gu, "$1");
}

/** 영문 숫자, 기호 치환 (sh1t, f@ck, $hit) */
const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
  "!": "i",
  "|": "i",
};

export type NormalizedTokens = {
  /** 한글만 남긴 낱말(숫자, 영문, 기호 제거 후 자모 조합, 늘이기 합치기, 반복 합치기) */
  readonly hangul: readonly string[];
  /** 한글, 영문, 숫자를 남긴 낱말(기호만 제거, "18놈" 같은 숫자 섞인 말) */
  readonly mixed: readonly string[];
  /** 영문만 남긴 낱말(leet 치환 뒤) */
  readonly latin: readonly string[];
};

/**
 * NFKC로 전각 문자(ｆｕｃｋ)를 맞춘다. 단 호환 자모(ㅅㅂ)는 NFKC가 조합용 자모(U+1100대)로 바꾸므로 그대로 둔다.
 */
function baseText(text: string): string {
  return text
    .replace(/[^\u3131-\u318E]+/gu, (part) => part.normalize("NFKC"))
    .toLowerCase()
    .replace(ZERO_WIDTH, "");
}

/**
 * 띄어쓰기 단위로 나눈 뒤 한 글자 낱말 덩어리를 붙인다("시 발 놈" → "시발놈", "f u c k" → "fuck").
 * 빈 낱말(기호만 있던 낱말)은 버린다.
 */
function glueSingles(tokens: readonly string[]): string[] {
  const out: string[] = [];
  let run = "";
  for (const t of tokens) {
    if (t.length === 0) continue;
    if (Array.from(t).length === 1) {
      run += t;
      continue;
    }
    if (run) {
      out.push(run);
      run = "";
    }
    out.push(t);
  }
  if (run) out.push(run);
  return out;
}

function hangulOf(token: string): string {
  const onlyHangul = token.replace(/[^ㄱ-ㆎ가-힣]/gu, "");
  return collapseRepeats(mergeStretch(composeJamo(onlyHangul)));
}

export function normalizeTokens(text: string): NormalizedTokens {
  const raw = baseText(text).split(/\s+/u);
  const mixedRaw = raw.map((t) =>
    t.replace(/[^\p{Script=Hangul}a-z0-9]/gu, ""),
  );
  const latinRaw = raw.map((t) =>
    Array.from(t)
      .map((c) => LEET[c] ?? c)
      .join("")
      .replace(/[^a-z]/g, ""),
  );
  return {
    hangul: glueSingles(raw.map(hangulOf)).map(collapseRepeats),
    mixed: glueSingles(mixedRaw).map((t) => collapseRepeats(composeJamo(t))),
    latin: glueSingles(latinRaw).map(collapseRepeats),
  };
}

/** 링크, 연락처 검사용: NFKC, 소문자, 보이지 않는 문자 제거, 점 주변 공백 제거("naver . com") */
export function normalizeForPatterns(text: string): string {
  return baseText(text).replace(/\s*([.:/])\s*/g, "$1");
}
