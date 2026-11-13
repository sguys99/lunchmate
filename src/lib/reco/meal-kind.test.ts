import { describe, expect, it } from "vitest";
import {
  kakaoCategorySlug,
  kakaoCategoryText,
} from "@/features/rec/kakao-category";
import { isChicken, mealKind } from "./meal-kind";

/** 카카오 원문 업종과 이름으로 판정 */
const kind = (categoryName: string, name = "식당") =>
  mealKind({
    category: kakaoCategorySlug(categoryName),
    categoryText: kakaoCategoryText(categoryName),
    name,
  });

describe("끼니 성격 (T9.19, D-44)", () => {
  it("술집 업종, 치킨 업종, 술집 이름은 drink", () => {
    expect(kind("음식점 > 술집 > 호프,요리주점")).toBe("drink");
    expect(kind("음식점 > 술집 > 일본식주점")).toBe("drink");
    expect(kind("음식점 > 술집 > 와인바")).toBe("drink");
    expect(kind("음식점 > 치킨")).toBe("drink");
    expect(kind("음식점 > 치킨 > 교촌치킨")).toBe("drink");
    expect(kind("음식점 > 한식", "을지로 포차")).toBe("drink");
    expect(kind("음식점 > 양식", "크래프트 비어 하우스")).toBe("drink");
    expect(kind("음식점 > 패스트푸드", "OO치킨호프")).toBe("drink");
  });

  it("카페, 간식, 베이커리, 디저트, 떡은 snack", () => {
    expect(kind("음식점 > 카페")).toBe("snack");
    expect(kind("음식점 > 간식 > 제과,베이커리")).toBe("snack");
    expect(kind("음식점 > 간식 > 아이스크림")).toBe("snack");
    expect(kind("음식점 > 간식 > 떡,한과")).toBe("snack");
    expect(kind("음식점 > 간식 > 도넛")).toBe("snack");
  });

  it("식사 업종은 meal, 비슷한 글자에 걸리지 않는다", () => {
    expect(kind("음식점 > 분식 > 떡볶이")).toBe("meal");
    expect(kind("음식점 > 한식 > 육류,고기", "바베큐 하우스")).toBe("meal");
    expect(kind("음식점 > 한식 > 해물,생선", "바지락 칼국수")).toBe("meal");
    expect(kind("음식점 > 패스트푸드 > 샌드위치")).toBe("meal");
    expect(kind("음식점 > 샐러드")).toBe("meal");
    expect(kind("음식점 > 패스트푸드 > 햄버거")).toBe("meal");
  });

  it("업종 원문이 비어도 카테고리로 판정한다", () => {
    expect(mealKind({ category: "pub", categoryText: "", name: "a" })).toBe(
      "drink",
    );
    expect(mealKind({ category: "cafe", categoryText: "", name: "a" })).toBe(
      "snack",
    );
    expect(mealKind({ category: "hansik", categoryText: "", name: "a" })).toBe(
      "meal",
    );
  });

  it("치킨 대분류만 치킨으로 본다", () => {
    expect(isChicken("치킨 > 치킨,닭강정")).toBe(true);
    expect(isChicken("한식 > 닭요리")).toBe(false);
  });
});
