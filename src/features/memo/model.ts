// 식당 메모 순수 규칙 (T10.15, D-32, D-33). 화면, 서버 zod, 테스트가 같은 함수를 쓴다.
// - 메모는 사용자가 빈 입력란에 직접 쓴 글만(장소명 미리 채우기 없음). 40자(코드 포인트), 한 줄.
// - DB 제약(place_memos_body_length, place_memos_body_shape)과 같은 모양으로 맞춘다: 앞뒤 공백 없음, 제어 문자 없음.
// - 추천 점수에 쓰지 않는다. 이 파일과 메모 값은 src/lib/reco로 가지 않는다.
// React, 네트워크 의존 없음.

/** 메모 길이 상한(코드 포인트, D-33 안건 2). DB place_memos_body_length와 같다 */
export const MEMO_MAX = 40;
/** 저장과 고침 하루 횟수(D-33). DB private.daily_quota_max('place_memos')와 같다(limits.test.ts) */
export const MEMO_DAILY = 30;
/** 1인 메모 곳 수 상한. DB place_memos_before_write와 같다 */
export const MEMO_PLACES_MAX = 300;

/** 공백(줄바꿈, 탭 포함)과 제어 문자 덩어리를 한 칸으로 바꾸고 앞뒤를 지운다 */
export function normalizeMemo(text: string): string {
  return text.replace(/[\s\p{Cc}]+/gu, " ").trim();
}

/** 글자 수(코드 포인트). DB char_length와 같게 센다 */
export function memoLength(text: string): number {
  return [...normalizeMemo(text)].length;
}

/** 빈 메모는 저장이 아니라 지우기다. 상한을 넘으면 저장할 수 없다 */
export function memoCheck(text: string): "empty" | "tooLong" | "ok" {
  const n = memoLength(text);
  if (n === 0) return "empty";
  if (n > MEMO_MAX) return "tooLong";
  return "ok";
}

// 홈 카드 배지 자리 규칙은 홈 첫 로드에 들어가므로 따로 둔다(이 파일 전체가 홈 청크에 실리지 않게)
export { showMemoBadge } from "./badge-slot";
