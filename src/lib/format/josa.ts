// 사용자 값(제목, 식당 이름) 뒤 조사 (copy-guide 7.3). 받침을 보고 고른다. 끝이 숫자면 읽는 소리(일, 삼, 육...)로,
// 그 밖의 글자(영문 등)는 받침 없음으로 본다.

/** 숫자를 읽었을 때 받침: 0 영(ㅇ), 1 일(ㄹ), 3 삼(ㅁ), 6 육(ㄱ), 7 칠(ㄹ), 8 팔(ㄹ). 나머지는 없음 */
const DIGIT_BATCHIM: Readonly<Record<string, number>> = {
  "0": 21,
  "1": 8,
  "3": 16,
  "6": 1,
  "7": 8,
  "8": 8,
};

/** 마지막 글자의 받침 번호(0이면 없음). 한글 음절이 아니면 0 */
function batchimOf(word: string): number {
  const last = Array.from(word.trim()).at(-1);
  if (!last) return 0;
  if (/[0-9]/.test(last)) return DIGIT_BATCHIM[last] ?? 0;
  const code = last.charCodeAt(0) - 0xac00;
  return code >= 0 && code < 11172 ? code % 28 : 0;
}

/** "정담국밥으로", "하루미 식당으로", "소담밥상으로", "카페로". ㄹ 받침은 "로" */
export function withRo(word: string): string {
  const b = batchimOf(word);
  return `${word}${b === 0 || b === 8 ? "로" : "으로"}`;
}
