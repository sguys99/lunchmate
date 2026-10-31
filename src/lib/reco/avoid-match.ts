// 기피 음식 판정 규칙 (T5.6, ONB-03, SET-03, D-07 안건 4. T4.18에서 미룬 직접 입력 판정 규칙).
//
// 카카오가 주는 단서는 식당 이름과 업종 문자열("한식 > 해물,생선 > 회")뿐이고 메뉴, 재료는 없다.
// 그래서 판정은 두 가지 글자 맞추기다.
//   1. 업종: 업종 문자열을 ">"와 ","로 나눈 조각 중 하나에 키워드가 들어 있으면 해당.
//      exact 키워드는 조각 전체가 같을 때만 해당(한 글자 "게"가 엉뚱한 업종에 걸리지 않게).
//   2. 이름: 식당 이름에 키워드가 들어 있으면 해당.
// 모든 비교 전에 공백을 지우고 소문자로 바꾼다(NFC).
//
// - 칩(food, allergy): 칩마다 정한 키워드 표(아래)로 판정한다. 기피 필터는 "어떤 경우에도 나오지 않는다"(AC-REC-1)가
//   목표라 덜 거르기보다 더 거르는 쪽으로 키워드를 잡았다(예: 회 칩은 초밥집도 뺀다).
// - 직접 입력(custom): 온보딩에서 이미 약속한 문구 "입력한 말이 식당 이름이나 업종에 들어가면 뺍니다."를 그대로 따른다.
//   입력한 말이 (a) 식당 이름, (b) 업종 문자열, (c) 우리 카테고리 라벨("국밥/탕" 등) 중 하나에 들어 있으면 뺀다.
//   입력한 말이 칩 이름과 같으면(예: "회") 칩 키워드 표를 함께 쓴다.
// - 표에 없는 food, allergy 값(칩 목록이 바뀐 뒤 남은 옛 값)은 직접 입력처럼 판정한다.
// - 한계: 메뉴 재료는 알 수 없어 알레르기는 완전히 거를 수 없다. 화면 안내는 src/copy/rec.ts avoidLimit.
import { categoryLabel } from "@/features/place/categories";
import type { AllergyChip, FoodChip } from "@/features/onboarding/constants";
import type { AvoidRule, Candidate } from "./types";

export type AvoidMatcher = {
  /** 업종 조각에 들어 있으면 해당 */
  category: readonly string[];
  /** 업종 조각 전체가 같을 때만 해당 */
  categoryExact?: readonly string[];
  /** 식당 이름에 들어 있으면 해당 */
  name: readonly string[];
};

const RAW_NAMES = [
  "횟집",
  "회센터",
  "회집",
  "사시미",
  "물회",
  "생선회",
  "활어",
  "스시",
  "초밥",
  "육회",
  "게장",
  "포케",
] as const;

export const FOOD_RULES = {
  회: {
    category: ["회", "초밥"],
    name: [
      "횟집",
      "회센터",
      "회집",
      "사시미",
      "물회",
      "생선회",
      "활어",
      "스시",
      "초밥",
    ],
  },
  해산물: {
    category: [
      "해물",
      "해산물",
      "생선",
      "회",
      "초밥",
      "조개",
      "대게",
      "꽃게",
      "게요리",
      "낙지",
      "오징어",
      "주꾸미",
      "쭈꾸미",
      "장어",
      "새우",
      "랍스터",
      "복어",
      "아구",
      "아귀",
      "전복",
      "굴",
    ],
    categoryExact: ["게"],
    name: [
      "해물",
      "해산물",
      "수산",
      "횟집",
      "조개",
      "대게",
      "꽃게",
      "킹크랩",
      "크랩",
      "게장",
      "낙지",
      "오징어",
      "주꾸미",
      "쭈꾸미",
      "새우",
      "장어",
      "아구",
      "아귀",
      "복어",
      "전복",
      "생선",
      "초밥",
      "스시",
    ],
  },
  "매운 음식": {
    category: [
      "마라",
      "떡볶이",
      "짬뽕",
      "닭발",
      "낙지",
      "주꾸미",
      "쭈꾸미",
      "훠궈",
      "매운",
    ],
    name: [
      "매운",
      "마라",
      "떡볶이",
      "라볶이",
      "짬뽕",
      "닭발",
      "불닭",
      "엽기",
      "낙지",
      "주꾸미",
      "쭈꾸미",
      "훠궈",
      "불족발",
      "실비김치",
    ],
  },
  양고기: {
    category: ["양꼬치", "양고기"],
    name: ["양꼬치", "양고기", "양갈비", "양다리", "징기스칸"],
  },
  내장: {
    category: ["곱창", "막창", "대창", "순대", "내장"],
    name: ["곱창", "막창", "대창", "순대", "내장", "선지", "곱도리"],
  },
  돼지고기: {
    category: [
      "돼지",
      "삼겹살",
      "족발",
      "보쌈",
      "감자탕",
      "순대",
      "돈까스",
      "돈가스",
    ],
    name: [
      "돼지",
      "삼겹",
      "오겹",
      "족발",
      "보쌈",
      "감자탕",
      "순대",
      "돈까스",
      "돈가스",
      "돈카츠",
      "제육",
      "목살",
      "항정",
    ],
  },
  닭고기: {
    category: ["닭", "치킨", "삼계탕"],
    name: ["닭", "치킨", "삼계탕", "통닭", "백숙"],
  },
  날음식: {
    category: ["회", "초밥", "육회", "참치"],
    name: [...RAW_NAMES, "생고기", "세비체"],
  },
} as const satisfies Record<FoodChip, AvoidMatcher>;

const SHELLFISH = [
  "조개",
  "굴",
  "전복",
  "홍합",
  "바지락",
  "꼬막",
  "가리비",
  "해물",
  "해산물",
] as const;

export const ALLERGY_RULES = {
  갑각류: {
    category: [
      "대게",
      "꽃게",
      "게요리",
      "새우",
      "랍스터",
      "가재",
      "크랩",
      "게장",
      "해물",
      "해산물",
    ],
    categoryExact: ["게"],
    name: [
      "대게",
      "꽃게",
      "킹크랩",
      "크랩",
      "게장",
      "새우",
      "랍스터",
      "가재",
      "해물",
      "해산물",
    ],
  },
  조개류: {
    category: SHELLFISH,
    name: [...SHELLFISH, "조개구이"],
  },
  땅콩: { category: ["땅콩"], name: ["땅콩"] },
  견과류: {
    category: ["땅콩", "견과"],
    name: ["땅콩", "견과", "호두", "아몬드", "피스타치오"],
  },
  우유: {
    category: ["치즈", "아이스크림"],
    name: ["우유", "밀크", "치즈", "크림", "라떼"],
  },
  달걀: {
    category: ["계란", "달걀"],
    name: ["계란", "달걀", "에그", "오므라이스"],
  },
  밀: {
    category: [
      "빵",
      "베이커리",
      "제과",
      "피자",
      "파스타",
      "국수",
      "칼국수",
      "라면",
      "우동",
      "만두",
      "수제비",
      "돈까스",
      "돈가스",
      "햄버거",
    ],
    name: [
      "빵",
      "베이커리",
      "피자",
      "파스타",
      "국수",
      "칼국수",
      "라면",
      "우동",
      "만두",
      "수제비",
      "버거",
      "돈까스",
      "돈가스",
    ],
  },
  메밀: {
    category: ["메밀", "냉면", "막국수", "소바"],
    name: ["메밀", "냉면", "막국수", "소바"],
  },
} as const satisfies Record<AllergyChip, AvoidMatcher>;

export function normalizeText(s: string): string {
  return s.normalize("NFC").toLowerCase().replace(/\s+/g, "");
}

function categoryParts(categoryText: string): string[] {
  return categoryText
    .split(/[>,]/)
    .map(normalizeText)
    .filter((p) => p.length > 0);
}

/** 판정에 쓰는 후보 글자를 한 번만 정규화한다 */
type Haystack = { name: string; parts: string[]; label: string };

function haystackOf(
  c: Pick<Candidate, "name" | "categoryText" | "category">,
): Haystack {
  return {
    name: normalizeText(c.name),
    parts: categoryParts(c.categoryText),
    label: normalizeText(categoryLabel(c.category)),
  };
}

function matchesMatcher(h: Haystack, m: AvoidMatcher): boolean {
  const cat = m.category.map(normalizeText);
  const exact = (m.categoryExact ?? []).map(normalizeText);
  if (h.parts.some((p) => cat.some((k) => p.includes(k)) || exact.includes(p)))
    return true;
  return m.name.map(normalizeText).some((k) => h.name.includes(k));
}

function matchesFreeText(h: Haystack, value: string): boolean {
  const v = normalizeText(value);
  if (v.length === 0) return false;
  return (
    h.name.includes(v) ||
    h.parts.some((p) => p.includes(v)) ||
    h.label.includes(v)
  );
}

function hasKey<T extends object>(
  table: T,
  key: string,
): key is Extract<keyof T, string> {
  return Object.prototype.hasOwnProperty.call(table, key);
}

function ruleMatches(h: Haystack, rule: AvoidRule): boolean {
  const value = rule.value.trim();
  if (rule.kind === "food" && hasKey(FOOD_RULES, value)) {
    return matchesMatcher(h, FOOD_RULES[value]);
  }
  if (rule.kind === "allergy" && hasKey(ALLERGY_RULES, value)) {
    return matchesMatcher(h, ALLERGY_RULES[value]);
  }
  // custom, 또는 표에 없는 옛 칩 값
  if (matchesFreeText(h, value)) return true;
  if (hasKey(FOOD_RULES, value)) return matchesMatcher(h, FOOD_RULES[value]);
  if (hasKey(ALLERGY_RULES, value))
    return matchesMatcher(h, ALLERGY_RULES[value]);
  return false;
}

/** 후보가 기피 규칙 중 하나에라도 걸리는가 */
export function matchesAvoid(
  candidate: Pick<Candidate, "name" | "categoryText" | "category">,
  rules: readonly AvoidRule[],
): boolean {
  if (rules.length === 0) return false;
  const h = haystackOf(candidate);
  return rules.some((r) => ruleMatches(h, r));
}
