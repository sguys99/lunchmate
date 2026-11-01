import { describe, expect, it } from "vitest";
import { wrapText } from "./result-image";

// 글자 하나 폭 1로 재는 가짜 측정
const measure = (s: string) => [...s].length;

describe("wrapText (결과 공유 이미지 식당명 줄바꿈)", () => {
  it("띄어쓰기 단위로 나눈다(keep-all)", () => {
    expect(wrapText(measure, "들풀 한우 정육식당", 6)).toEqual([
      "들풀 한우",
      "정육식당",
    ]);
  });
  it("한 낱말이 폭을 넘으면 글자 단위로 자른다", () => {
    expect(wrapText(measure, "아주긴식당이름입니다", 4)).toEqual([
      "아주긴식",
      "당이름입",
      "니다",
    ]);
  });
});
