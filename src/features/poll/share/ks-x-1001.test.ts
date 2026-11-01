import { describe, expect, it } from "vitest";
import { isOgDrawable } from "./ks-x-1001";

describe("isOgDrawable (D-17 안건 4)", () => {
  it("KS X 1001 한글과 ASCII는 그릴 수 있다", () => {
    expect(isOgDrawable("목요일 점심")).toBe(true);
    expect(isOgDrawable("3층 회식, 12:30?")).toBe(true);
    expect(isOgDrawable("Team A 점심")).toBe(true);
  });

  it("KS X 1001 밖 완성형, 이모지, 한자는 막는다", () => {
    expect(isOgDrawable("똠양꿍 점심")).toBe(false);
    expect(isOgDrawable("햏 점심")).toBe(false);
    expect(isOgDrawable("점심 🍚")).toBe(false);
    expect(isOgDrawable("金요일 점심")).toBe(false);
  });

  it("빈 문자열은 그릴 수 있다", () => {
    expect(isOgDrawable("")).toBe(true);
  });
});
