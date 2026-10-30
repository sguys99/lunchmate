// "요즘 이게 땡겨요" 상태 (T4.26, SET-05). 순수 함수.
// - 만료 시각(craving_until)은 DB 트리거가 정한다: 카테고리를 바꾼 시각 + 7일(서버 시각).
// - 남은 날은 KST 달력 날짜 차이로 센다(src/lib/time). 고른 날은 7일, 마지막 날은 "오늘까지".
// - 만료 시각이 지나면 추천에서 무시한다(행은 남음). 화면은 지난 선택을 그대로 보여 주고 다시 저장하면 7일을 새로 센다.
import { CATEGORY_SLUGS, type CategorySlug } from "@/features/place/categories";
import { isPast, kstDayDiff } from "@/lib/time";

export const MAX_CRAVINGS = 3;
export const CRAVING_DAYS = 7;

export type CravingStatus =
  | { kind: "none" }
  /** daysLeft 0이면 오늘이 마지막 날 */
  | { kind: "active"; daysLeft: number }
  | { kind: "expired" };

export function cravingStatus(
  categories: readonly string[],
  until: string | null,
  now: Date,
): CravingStatus {
  if (categories.length === 0 || !until) return { kind: "none" };
  const end = new Date(until);
  if (Number.isNaN(end.getTime())) return { kind: "none" };
  if (isPast(end, now)) return { kind: "expired" };
  return { kind: "active", daysLeft: Math.max(0, kstDayDiff(now, end)) };
}

/** DB 값 중 알려진 slug만, 12종 순서대로 */
export function knownCravings(values: readonly string[]): CategorySlug[] {
  return CATEGORY_SLUGS.filter((s) => values.includes(s));
}

/** 같은 집합인가(순서 무시) */
export function sameCravings(
  a: readonly string[],
  b: readonly string[],
): boolean {
  const sa = new Set(a);
  return sa.size === new Set(b).size && b.every((x) => sa.has(x));
}
