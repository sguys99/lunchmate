// 카테고리 글자색 클래스 (DESIGN.md 3장 카테고리 색, -ink는 글자용 대비 4.5:1 값). 토큰 유틸리티만 쓴다.
import type { CategorySlug } from "./categories";

export const CATEGORY_INK: Record<CategorySlug, string> = {
  hansik: "text-cat-hansik-ink",
  jungsik: "text-cat-jungsik-ink",
  ilsik: "text-cat-ilsik-ink",
  yangsik: "text-cat-yangsik-ink",
  bunsik: "text-cat-bunsik-ink",
  gukbap: "text-cat-gukbap-ink",
  gogi: "text-cat-gogi-ink",
  asian: "text-cat-asian-ink",
  fastfood: "text-cat-fastfood-ink",
  salad: "text-cat-salad-ink",
  cafe: "text-cat-cafe-ink",
  pub: "text-cat-pub-ink",
};
