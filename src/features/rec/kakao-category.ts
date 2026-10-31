// 카카오 업종 문자열 → 앱 카테고리 12종 (T5.17, PRD 8.3, categories.ts 주석 "매핑은 추천 단계에서").
// 순수 함수. 카카오 category_name은 "음식점 > 한식 > 국밥"처럼 ">"로 나뉜 단계 문자열이다.
// 결과는 화면 메모리에서만 쓰고 저장하지 않는다(CLAUDE.md 7장).
//
// 판정 순서
// 1. 둘째 단계(대분류: 한식, 중식, 일식 ...)로 정한다. 한식은 셋째 단계 이하를 보고 국밥/탕, 고기를 나눈다.
// 2. 대분류가 표에 없으면(퓨전요리, 샤브샤브 같은 단독 분류) 모든 조각에서 키워드를 찾는다.
// 3. 그래도 없으면 한식(가장 흔한 분류, 그림은 밥공기).
// 회, 해물은 한식에 둔다(횟집 그림을 초밥으로 그리면 다른 음식처럼 보인다). 마라탕은 중식에서 끝나 국밥/탕으로 가지 않는다.
import type { CategorySlug } from "@/features/place/categories";

const ROOT = "음식점";

/** "음식점 > 한식 > 국밥" → ["한식", "국밥"]. 공백을 다듬고 맨 앞 "음식점"을 뺀다 */
export function kakaoCategoryParts(categoryName: string): string[] {
  const parts = categoryName
    .split(">")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts[0] === ROOT ? parts.slice(1) : parts;
}

/** 기피 음식 판정에 넘길 업종 문자열(엔진 Candidate.categoryText). "한식 > 해물,생선 > 회" 꼴 */
export function kakaoCategoryText(categoryName: string): string {
  return kakaoCategoryParts(categoryName).join(" > ");
}

/** 대분류 → 카테고리. 한식은 아래 HANSIK_SUB로 한 번 더 나눈다 */
const TOP: Readonly<Record<string, CategorySlug>> = {
  한식: "hansik",
  중식: "jungsik",
  일식: "ilsik",
  양식: "yangsik",
  분식: "bunsik",
  아시아음식: "asian",
  패스트푸드: "fastfood",
  치킨: "fastfood",
  술집: "pub",
  간식: "cafe",
  카페: "cafe",
  샐러드: "salad",
  뷔페: "hansik",
  도시락: "hansik",
  기사식당: "hansik",
  퓨전요리: "yangsik",
  패밀리레스토랑: "yangsik",
};

const GUKBAP_WORDS = [
  "국밥",
  "해장국",
  "감자탕",
  "설렁탕",
  "곰탕",
  "순대",
  "찌개",
  "전골",
  "추어탕",
  "삼계탕",
  "매운탕",
  "탕",
] as const;
const GOGI_WORDS = [
  "육류",
  "고기",
  "삼겹살",
  "갈비",
  "곱창",
  "막창",
  "족발",
  "보쌈",
  "닭갈비",
  "오리",
  "양꼬치",
] as const;

/** 키워드 → 카테고리(대분류가 표에 없을 때). 위에서부터 먼저 걸린 것 */
const KEYWORDS: readonly (readonly [string, CategorySlug])[] = [
  ["샐러드", "salad"],
  ["포케", "salad"],
  ["베이커리", "cafe"],
  ["제과", "cafe"],
  ["디저트", "cafe"],
  ["카페", "cafe"],
  ["호프", "pub"],
  ["주점", "pub"],
  ["이자카야", "pub"],
  ["포장마차", "pub"],
  ["햄버거", "fastfood"],
  ["피자", "fastfood"],
  ["치킨", "fastfood"],
  ["샌드위치", "fastfood"],
  ["떡볶이", "bunsik"],
  ["김밥", "bunsik"],
  ["쌀국수", "asian"],
  ["베트남", "asian"],
  ["태국", "asian"],
  ["인도", "asian"],
  ["초밥", "ilsik"],
  ["돈까스", "ilsik"],
  ["라멘", "ilsik"],
  ["우동", "ilsik"],
  ["중국", "jungsik"],
  ["마라", "jungsik"],
  ["샤브샤브", "gukbap"],
  ["스테이크", "yangsik"],
  ["파스타", "yangsik"],
  ["이탈리", "yangsik"],
];

function hasWord(parts: readonly string[], words: readonly string[]): boolean {
  return parts.some((p) =>
    p
      .split(",")
      .map((w) => w.trim())
      .some((w) =>
        words.some((k) => (k === "탕" ? w.endsWith("탕") : w.includes(k))),
      ),
  );
}

/** 카카오 업종 문자열 → 카테고리 slug */
export function kakaoCategorySlug(categoryName: string): CategorySlug {
  const parts = kakaoCategoryParts(categoryName);
  const top = parts[0];
  const sub = parts.slice(1);
  const mapped = top ? TOP[top] : undefined;
  if (mapped === "hansik" && top === "한식") {
    if (hasWord(sub, GOGI_WORDS)) return "gogi";
    if (hasWord(sub, GUKBAP_WORDS)) return "gukbap";
    return "hansik";
  }
  if (mapped) return mapped;
  for (const [word, slug] of KEYWORDS) {
    if (parts.some((p) => p.includes(word))) return slug;
  }
  if (hasWord(parts, GOGI_WORDS)) return "gogi";
  if (hasWord(parts, GUKBAP_WORDS)) return "gukbap";
  return "hansik";
}
