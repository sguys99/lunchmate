import { describe, expect, it } from "vitest";
import {
  kakaoCategorySlug,
  kakaoCategoryText,
} from "@/features/rec/kakao-category";
import { isChicken, isGrill, mealKind } from "./meal-kind";

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

  it("고기 위주(세부 없는 육류,고기, 삼겹살, 갈비, 곱창, 양꼬치)는 grill (D-46)", () => {
    expect(kind("음식점 > 한식 > 육류,고기")).toBe("grill");
    expect(kind("음식점 > 한식 > 육류,고기", "바베큐 하우스")).toBe("grill");
    expect(kind("음식점 > 한식 > 육류,고기 > 삼겹살")).toBe("grill");
    expect(kind("음식점 > 한식 > 육류,고기 > 갈비")).toBe("grill");
    expect(kind("음식점 > 한식 > 육류,고기 > 곱창,막창")).toBe("grill");
    expect(kind("음식점 > 중식 > 양꼬치")).toBe("grill");
  });

  it("고기 업종이어도 닭요리, 탕, 이름에 식사 메뉴가 있으면 meal (D-46)", () => {
    expect(kind("음식점 > 한식 > 육류,고기 > 닭요리 > 삼계탕")).toBe("meal");
    expect(kind("음식점 > 한식 > 육류,고기 > 갈비 > 갈비탕")).toBe("meal");
    expect(kind("음식점 > 한식 > 육류,고기", "OO 불고기 백반")).toBe("meal");
    expect(kind("음식점 > 한식 > 육류,고기", "제육 두루치기 집")).toBe("meal");
    expect(kind("음식점 > 한식 > 족발,보쌈")).toBe("meal");
    expect(kind("음식점 > 한식 > 국밥", "갈비 국밥")).toBe("meal");
  });

  it("업종 원문 없이 카테고리 gogi만으로는 grill로 보지 않는다", () => {
    expect(isGrill("", "삼겹살집")).toBe(false);
    expect(mealKind({ category: "gogi", categoryText: "", name: "a" })).toBe(
      "meal",
    );
  });

  it("고기 술집은 drink가 먼저다", () => {
    expect(kind("음식점 > 한식 > 육류,고기", "고기 포차")).toBe("drink");
  });
});
