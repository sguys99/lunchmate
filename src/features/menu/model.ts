// 메뉴 제보 순수 규칙 (T10.16, PRD MENU-01~05, D-34, D-35). 화면, 서버 zod, 테스트가 같은 함수를 쓴다.
// - 메뉴 이름은 사용자가 빈 입력란에 직접 쓰거나 이미 제보된 메뉴(우리 DB 집계)에서 고른 것만. 카카오 장소명, 카테고리 이름 미리 채우기 없음.
// - DB 제약(menu_reports_name_length, menu_reports_name_shape, menu_reports_price_range)과 같은 모양으로 맞춘다.
// - 추천 점수에 쓰지 않는다. 이 파일과 메뉴 값은 src/lib/reco로 가지 않는다(AC-MENU-2).
// React, 네트워크 의존 없음. 홈 첫 로드에 실리는 것은 cardMenu와 CARD_MIN_REPORTS뿐이다(card-menu-pick.ts).

/** 메뉴 이름 상한(코드 포인트, D-35 안건 5). DB menu_reports_name_length와 같다 */
export const MENU_NAME_MAX = 20;
/** 하루 제보 건수(MOD-05, D-35 안건 8). DB private.daily_quota_max('menu_reports')와 같다(limits.test.ts) */
export const MENU_DAILY = 20;
/** 가격 범위와 단위. DB menu_reports_price_range와 같다(FB-02 스테퍼) */
export const MENU_PRICE_MIN = 1000;
export const MENU_PRICE_MAX = 100000;
export const MENU_PRICE_STEP = 500;

/** NFC, 공백(줄바꿈, 탭 포함)과 제어 문자 덩어리를 한 칸으로, 앞뒤 공백 제거 */
export function normalizeMenuName(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[\s\p{Cc}]+/gu, " ")
    .trim();
}

/** 같은 메뉴 판정 키: 공백을 모두 지우고 소문자. DB 트리거 menu_reports_before_insert와 같다 */
export function menuKey(text: string): string {
  return normalizeMenuName(text).replace(/\s/g, "").toLowerCase();
}

/** 글자 수(코드 포인트). DB char_length와 같게 센다 */
export function menuNameLength(text: string): number {
  return [...normalizeMenuName(text)].length;
}

export function menuNameCheck(text: string): "empty" | "tooLong" | "ok" {
  const n = menuNameLength(text);
  if (n === 0) return "empty";
  if (n > MENU_NAME_MAX) return "tooLong";
  return "ok";
}

/** 가격을 범위 안 500원 단위로 */
export function clampMenuPrice(v: number): number {
  const stepped = Math.round(v / MENU_PRICE_STEP) * MENU_PRICE_STEP;
  return Math.min(MENU_PRICE_MAX, Math.max(MENU_PRICE_MIN, stepped));
}

/** 집계 한 줄(place_menus). 제보한 사람은 없다 */
export type MenuStat = {
  readonly key: string;
  readonly name: string;
  readonly medianKrw: number;
  readonly count: number;
  /** 최근 제보 달의 첫날(YYYY-MM-DD, KST) */
  readonly lastMonth: string;
};

/** 쓰는 동안 기존 메뉴 제안(D-35 안건 4): 비교 키가 겹치는 메뉴. 빈 칸이면 없음 */
export function suggestMenus(
  text: string,
  menus: readonly MenuStat[],
): MenuStat[] {
  const q = menuKey(text);
  if (q === "") return [];
  return menus.filter((m) => m.key !== q && (m.key.includes(q) || q.includes(m.key)));
}

/** "2026-10-01" → 10 (메뉴판 "최근 10월") */
export function monthOf(lastMonth: string): number | null {
  const m = /^\d{4}-(\d{2})-\d{2}$/.exec(lastMonth);
  return m?.[1] ? Number(m[1]) : null;
}

export { CARD_MIN_REPORTS, cardMenu, type CardMenu } from "./card-menu-pick";
