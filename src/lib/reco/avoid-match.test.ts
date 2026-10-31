import { describe, expect, it } from "vitest";
import { matchesAvoid } from "./avoid-match";
import { makeCandidate } from "./test-fixtures";
import type { AvoidRule } from "./types";

const food = (value: string): AvoidRule => ({ kind: "food", value });
const allergy = (value: string): AvoidRule => ({ kind: "allergy", value });
const custom = (value: string): AvoidRule => ({ kind: "custom", value });

describe("기피 칩 판정 (T5.6)", () => {
  it("회 칩: 업종 조각의 회, 초밥과 이름의 횟집을 뺀다", () => {
    expect(
      matchesAvoid(
        makeCandidate("a", { categoryText: "한식 > 해물,생선 > 회" }),
        [food("회")],
      ),
    ).toBe(true);
    expect(
      matchesAvoid(
        makeCandidate("b", {
          category: "ilsik",
          categoryText: "일식 > 초밥,롤",
        }),
        [food("회")],
      ),
    ).toBe(true);
    expect(
      matchesAvoid(makeCandidate("c", { name: "바다횟집" }), [food("회")]),
    ).toBe(true);
  });

  it("회 칩은 이름의 '회'라는 글자 하나만으로는 빼지 않는다(회관)", () => {
    expect(
      matchesAvoid(
        makeCandidate("a", {
          name: "한우회관",
          categoryText: "한식 > 육류,고기",
        }),
        [food("회")],
      ),
    ).toBe(false);
  });

  it("해산물 칩: 한 글자 '게'는 업종 조각이 정확히 같을 때만", () => {
    expect(
      matchesAvoid(
        makeCandidate("a", { categoryText: "한식 > 해물,생선 > 게,대게" }),
        [food("해산물")],
      ),
    ).toBe(true);
    expect(
      matchesAvoid(
        makeCandidate("b", { name: "게스트 키친", categoryText: "양식" }),
        [food("해산물")],
      ),
    ).toBe(false);
  });

  it("돼지고기, 닭고기, 내장, 매운 음식, 양고기, 날음식", () => {
    expect(
      matchesAvoid(
        makeCandidate("a", { categoryText: "한식 > 육류,고기 > 족발,보쌈" }),
        [food("돼지고기")],
      ),
    ).toBe(true);
    expect(
      matchesAvoid(
        makeCandidate("b", { category: "fastfood", categoryText: "치킨" }),
        [food("닭고기")],
      ),
    ).toBe(true);
    expect(
      matchesAvoid(makeCandidate("c", { name: "황소곱창" }), [food("내장")]),
    ).toBe(true);
    expect(
      matchesAvoid(
        makeCandidate("d", {
          category: "bunsik",
          categoryText: "분식 > 떡볶이",
        }),
        [food("매운 음식")],
      ),
    ).toBe(true);
    expect(
      matchesAvoid(
        makeCandidate("e", {
          name: "경성양꼬치",
          category: "jungsik",
          categoryText: "중식 > 양꼬치",
        }),
        [food("양고기")],
      ),
    ).toBe(true);
    expect(
      matchesAvoid(makeCandidate("f", { name: "을지로 육회집" }), [
        food("날음식"),
      ]),
    ).toBe(true);
    expect(
      matchesAvoid(makeCandidate("g", { categoryText: "한식 > 국수" }), [
        food("돼지고기"),
      ]),
    ).toBe(false);
  });

  it("알레르기 칩: 갑각류, 메밀, 밀", () => {
    expect(
      matchesAvoid(makeCandidate("a", { name: "새우명가" }), [
        allergy("갑각류"),
      ]),
    ).toBe(true);
    expect(
      matchesAvoid(makeCandidate("b", { categoryText: "한식 > 냉면" }), [
        allergy("메밀"),
      ]),
    ).toBe(true);
    expect(
      matchesAvoid(
        makeCandidate("c", {
          category: "yangsik",
          categoryText: "양식 > 피자",
        }),
        [allergy("밀")],
      ),
    ).toBe(true);
    expect(
      matchesAvoid(makeCandidate("d", { categoryText: "한식 > 백반" }), [
        allergy("땅콩"),
      ]),
    ).toBe(false);
  });
});

describe("직접 입력 판정 (T5.6, T4.18에서 미룬 규칙)", () => {
  it("입력한 말이 식당 이름에 들어 있으면 뺀다(공백, 대소문자 무시)", () => {
    expect(
      matchesAvoid(makeCandidate("a", { name: "Pho 하노이 쌀국수" }), [
        custom("쌀 국수"),
      ]),
    ).toBe(true);
    expect(
      matchesAvoid(makeCandidate("b", { name: "PHO 24" }), [custom("pho")]),
    ).toBe(true);
  });

  it("입력한 말이 업종 문자열에 들어 있으면 뺀다", () => {
    expect(
      matchesAvoid(
        makeCandidate("a", {
          category: "asian",
          categoryText: "아시아음식 > 베트남음식",
        }),
        [custom("베트남")],
      ),
    ).toBe(true);
  });

  it("입력한 말이 우리 카테고리 라벨에 들어 있으면 뺀다", () => {
    expect(
      matchesAvoid(
        makeCandidate("a", { category: "salad", categoryText: "" }),
        [custom("샐러드")],
      ),
    ).toBe(true);
  });

  it("칩 이름과 같은 직접 입력은 칩 키워드 표도 쓴다", () => {
    expect(
      matchesAvoid(
        makeCandidate("a", {
          category: "ilsik",
          categoryText: "일식 > 초밥,롤",
          name: "스시 오마카세",
        }),
        [custom("날음식")],
      ),
    ).toBe(true);
  });

  it("어디에도 없으면 통과", () => {
    expect(
      matchesAvoid(
        makeCandidate("a", { name: "마포 백반", categoryText: "한식 > 백반" }),
        [custom("고수")],
      ),
    ).toBe(false);
    expect(matchesAvoid(makeCandidate("a"), [custom("  ")])).toBe(false);
  });

  it("표에 없는 옛 칩 값은 직접 입력처럼 판정한다", () => {
    expect(
      matchesAvoid(makeCandidate("a", { name: "오이 냉국" }), [food("오이")]),
    ).toBe(true);
  });
});
