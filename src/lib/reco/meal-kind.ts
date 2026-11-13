// 끼니 성격 판정 (T9.19, D-44). 순수 함수.
// 카테고리 12종은 일러스트용이라 거칠다: 카카오 "치킨"은 fastfood, 이름이 "OO치킨호프"인 곳도 업종만으로는 술집이 아니다.
// 그래서 업종 원문(categoryText)과 이름을 함께 본다. 둘 다 세션 메모리 값이고 판정 결과도 저장하지 않는다.
import type { Candidate } from "./types";

export type MealKind = "meal" | "drink" | "snack";

/** 업종 원문에 있으면 술 위주 */
const DRINK_TEXT = ["술집", "호프", "주점", "포장마차", "이자카야"] as const;
/** 이름에 있으면 술 위주. "바"는 바베큐, 바지락 오탐이 많아 넣지 않는다(와인바는 업종 "술집"으로 걸린다) */
const DRINK_NAME = ["호프", "포차", "주점", "펍", "비어", "이자카야"] as const;
/** 업종 원문에 있으면 간식. "떡"만 쓰면 떡볶이가 걸려 "떡,한과"로 쓴다 */
const SNACK_TEXT = [
  "카페",
  "간식",
  "제과",
  "베이커리",
  "디저트",
  "아이스크림",
  "떡,한과",
  "도넛",
] as const;

const has = (s: string, words: readonly string[]) =>
  words.some((w) => s.includes(w));

/** 카카오 대분류가 "치킨"인가. "치킨 > 치킨,닭강정" 꼴 */
export function isChicken(categoryText: string): boolean {
  return categoryText.split(">")[0]?.trim() === "치킨";
}

export function mealKind(
  c: Pick<Candidate, "category" | "categoryText" | "name">,
): MealKind {
  if (
    c.category === "pub" ||
    isChicken(c.categoryText) ||
    has(c.categoryText, DRINK_TEXT) ||
    has(c.name, DRINK_NAME)
  )
    return "drink";
  if (c.category === "cafe" || has(c.categoryText, SNACK_TEXT)) return "snack";
  return "meal";
}
