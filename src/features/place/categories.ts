// 식당 카테고리 12종 (tasks.md T2.8, PRD 8.3).
// slug는 카테고리 색 토큰, 일러스트 파일 이름과 공유하므로 바꾸지 않는다.
// 카카오 카테고리 문자열과의 매핑은 추천 단계(5단계)에서 별도로 정의한다.

export const CATEGORY_SLUGS = [
  "hansik",
  "jungsik",
  "ilsik",
  "yangsik",
  "bunsik",
  "gukbap",
  "gogi",
  "asian",
  "fastfood",
  "salad",
  "cafe",
  "pub",
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export type CategoryDefinition = {
  slug: CategorySlug;
  /** 화면 표시용 라벨 (명사형) */
  label: string;
};

export const CATEGORIES = {
  hansik: { slug: "hansik", label: "한식" },
  jungsik: { slug: "jungsik", label: "중식" },
  ilsik: { slug: "ilsik", label: "일식" },
  yangsik: { slug: "yangsik", label: "양식" },
  bunsik: { slug: "bunsik", label: "분식" },
  gukbap: { slug: "gukbap", label: "국밥/탕" },
  gogi: { slug: "gogi", label: "고기" },
  asian: { slug: "asian", label: "아시안" },
  fastfood: { slug: "fastfood", label: "패스트푸드" },
  salad: { slug: "salad", label: "샐러드/건강식" },
  cafe: { slug: "cafe", label: "카페/베이커리" },
  pub: { slug: "pub", label: "술집" },
} as const satisfies { [K in CategorySlug]: CategoryDefinition & { slug: K } };

export function isCategorySlug(value: string): value is CategorySlug {
  return (CATEGORY_SLUGS as readonly string[]).includes(value);
}

export function categoryLabel(slug: CategorySlug): string {
  return CATEGORIES[slug].label;
}
