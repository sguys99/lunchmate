import { describe, expect, it } from "vitest";
import {
  kakaoCategoryParts,
  kakaoCategorySlug,
  kakaoCategoryText,
} from "./kakao-category";

describe("카카오 업종 문자열 → 카테고리", () => {
  it.each([
    ["음식점 > 한식", "hansik"],
    ["음식점 > 한식 > 국밥", "gukbap"],
    ["음식점 > 한식 > 해장국", "gukbap"],
    ["음식점 > 한식 > 감자탕", "gukbap"],
    ["음식점 > 한식 > 찌개,전골", "gukbap"],
    ["음식점 > 한식 > 육류,고기 > 삼겹살", "gogi"],
    ["음식점 > 한식 > 족발,보쌈", "gogi"],
    ["음식점 > 한식 > 해물,생선 > 회", "hansik"],
    ["음식점 > 한식 > 냉면", "hansik"],
    ["음식점 > 중식 > 중국요리", "jungsik"],
    ["음식점 > 중식 > 마라탕", "jungsik"],
    ["음식점 > 일식 > 초밥,롤", "ilsik"],
    ["음식점 > 일식 > 돈까스,우동", "ilsik"],
    ["음식점 > 양식 > 이탈리안", "yangsik"],
    ["음식점 > 분식 > 떡볶이", "bunsik"],
    ["음식점 > 아시아음식 > 베트남음식 > 쌀국수", "asian"],
    ["음식점 > 패스트푸드 > 햄버거", "fastfood"],
    ["음식점 > 치킨", "fastfood"],
    ["음식점 > 술집 > 호프,요리주점", "pub"],
    ["음식점 > 간식 > 제과,베이커리", "cafe"],
    ["음식점 > 샐러드", "salad"],
    ["음식점 > 퓨전요리", "yangsik"],
    ["음식점 > 샤브샤브", "gukbap"],
    ["음식점 > 뷔페", "hansik"],
    ["", "hansik"],
    ["음식점", "hansik"],
  ])("%s → %s", (name, slug) => {
    expect(kakaoCategorySlug(name)).toBe(slug);
  });

  it("업종 조각과 기피 판정용 문자열은 맨 앞 '음식점'을 뺀다", () => {
    expect(kakaoCategoryParts(" 음식점 >  한식 > 국밥 ")).toEqual([
      "한식",
      "국밥",
    ]);
    expect(kakaoCategoryText("음식점 > 한식 > 해물,생선 > 회")).toBe(
      "한식 > 해물,생선 > 회",
    );
  });
});
