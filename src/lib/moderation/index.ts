// 금칙어 서버 필터 (T6.17, MOD-04, DEAL-04, D-13 안건 13). 서버 액션의 zod 검사에서만 쓴다.
// - 대상: 한 줄 후기, 할인 내용, 신고 "기타" 글, 닉네임(/me/account, 네이버 프로필 동기화).
// - 결과는 참/거짓만 돌려준다. 걸린 낱말이나 종류를 화면에 보내지 않는다(일반 문구 moderationCopy.banned).
// - 목록과 정규화 규칙은 banned-words.ts, normalize.ts. 화면 번들에 들어가지 않게 "server-only".
import "server-only";
import * as z from "zod";
import {
  BANNED_HANGUL,
  BANNED_JAMO,
  BANNED_LATIN,
  BANNED_MIXED,
  SAFE_SUBSTRINGS,
} from "./banned-words";
import {
  collapseRepeats,
  normalizeForPatterns,
  normalizeTokens,
} from "./normalize";

// 목록도 비교 문자열과 같은 반복 합치기를 거친다("토토사이트" → "토사이트", "성매매" → "성매")
const prep = (list: readonly string[]) => [...new Set(list.map(collapseRepeats))];
const HANGUL = prep(BANNED_HANGUL);
const JAMO = prep(BANNED_JAMO);
const MIXED = prep(BANNED_MIXED);
const LATIN = prep(BANNED_LATIN);
const SAFE = prep(SAFE_SUBSTRINGS);

function stripSafe(token: string): string {
  let t = token;
  for (const safe of SAFE) {
    if (t.includes(safe)) t = t.split(safe).join(" ");
  }
  return t;
}

/**
 * 낱말 목록에서 금칙어 찾기.
 * - 낱말 하나 안: 어디에 있어도 걸린다.
 * - 이웃한 두 낱말을 붙인 것: 앞 낱말이 두 글자 이상이고, 금칙어가 앞 낱말 처음에서 시작해 뒤 낱말까지 걸칠 때만
 *   ("미친 놈" O, "역시 발" X, 숫자를 지워 한 글자가 된 "2병, 신라면" X).
 */
function matchTokens(tokens: readonly string[], words: readonly string[]) {
  const clean = tokens.map(stripSafe);
  for (let i = 0; i < clean.length; i += 1) {
    const t = clean[i] ?? "";
    if (words.some((w) => t.includes(w))) return true;
    const next = clean[i + 1];
    if (next === undefined) continue;
    const pair = stripSafe(t + next);
    if (
      words.some(
        (w) => pair.startsWith(w) && w.length > t.length && t.length > 1,
      )
    )
      return true;
  }
  return false;
}

const URL_PATTERNS: readonly RegExp[] = [
  /https?:\/\//,
  /(^|[^a-z0-9])www\./,
  /open\.kakao\.com/,
  /(^|[^a-z0-9])t\.me\//,
  /[a-z0-9-]{2,}\.(com|net|org|kr|me|io|ly|gl|gg|shop|xyz|link|site|app|biz|info|tv|store|club|top)(?![a-z])/,
  /[a-z0-9._%+-]+@[a-z0-9-]+\.[a-z]{2,}/,
];

const HANGUL_DIGITS: Record<string, string> = {
  공: "0",
  영: "0",
  일: "1",
  이: "2",
  삼: "3",
  사: "4",
  오: "5",
  육: "6",
  륙: "6",
  칠: "7",
  팔: "8",
  구: "9",
};

/** "공일공 일이삼사 오육칠팔"처럼 숫자를 한글로 쓴 9자 이상 덩어리만 숫자로 바꾼다 */
function hangulDigitsToNumbers(text: string): string {
  return text.replace(
    /[공영일이삼사오육륙칠팔구](?:[\s\-.]*[공영일이삼사오육륙칠팔구]){8,}/g,
    (run) =>
      Array.from(run)
        .map((c) => HANGUL_DIGITS[c] ?? "")
        .join(""),
  );
}

/** 전화번호: 0으로 시작하는 9~11자리(구분자, 띄어쓰기 허용), 대표번호 15xx-xxxx */
function hasPhoneNumber(text: string): boolean {
  const t = hangulDigitsToNumbers(text);
  if (/(^|\D)1[568]\d{2}-\d{4}(\D|$)/.test(t)) return true;
  // 숫자 사이의 구분자를 지운다(가격 "12,000"은 0으로 시작하지 않아 걸리지 않는다)
  const joined = t.replace(/(\d)[\s\-.()/_~]+(?=\d)/g, "$1");
  return /(^|\D)0\d{8,10}(\D|$)/.test(joined);
}

/** 링크, 연락처, 오픈채팅 같은 광고 패턴 */
export function hasContactOrLink(text: string): boolean {
  const t = normalizeForPatterns(text);
  return URL_PATTERNS.some((re) => re.test(t)) || hasPhoneNumber(t);
}

/** 욕설, 비하, 성적 표현, 광고 낱말 */
export function hasBannedWord(text: string): boolean {
  const { hangul, mixed, latin } = normalizeTokens(text);
  return (
    matchTokens(hangul, HANGUL) ||
    matchTokens(hangul, JAMO) ||
    matchTokens(mixed, MIXED) ||
    matchTokens(latin, LATIN)
  );
}

/** 금칙어 또는 연락처, 링크가 있으면 true. 걸린 내용은 알리지 않는다(D-13 안건 13) */
export function containsBannedContent(text: string): boolean {
  if (!text) return false;
  return hasBannedWord(text) || hasContactOrLink(text);
}

/**
 * zod 문자열 스키마에 금칙어 검사를 붙인다. 걸리면 issue code "custom", params.reason "banned".
 * 서버 흐름은 bannedIssue()로 일반 invalid와 구분한다.
 */
export function withoutBannedContent<S extends z.ZodType<string>>(schema: S) {
  return schema.refine((v) => !containsBannedContent(v), {
    params: { reason: "banned" },
  });
}

/** zod 오류에 금칙어 issue가 있는가 */
export function hasBannedIssue(error: z.ZodError): boolean {
  return error.issues.some(
    (i) =>
      i.code === "custom" &&
      (i as { params?: { reason?: string } }).params?.reason === "banned",
  );
}
