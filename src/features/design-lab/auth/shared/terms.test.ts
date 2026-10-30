import { describe, expect, it } from "vitest";
import {
  allState,
  canSubmit,
  EMPTY_CONSENT,
  FULL_CONSENT,
  missingRequired,
  setItem,
  TERM_ITEMS,
  toggleAll,
} from "./terms";

describe("약관 동의 모델", () => {
  it("필수는 만 14세, 이용약관, 개인정보이고 마케팅만 선택이다 (AUTH-06)", () => {
    expect(TERM_ITEMS.filter((t) => t.required).map((t) => t.id)).toEqual([
      "age",
      "service",
      "privacy",
    ]);
    expect(TERM_ITEMS.find((t) => t.id === "marketing")?.required).toBe(false);
    expect(TERM_ITEMS.find((t) => t.id === "age")?.hasDocument).toBe(false);
  });

  it("처음에는 아무것도 켜져 있지 않고 시작할 수 없다", () => {
    expect(allState(EMPTY_CONSENT)).toBe("none");
    expect(canSubmit(EMPTY_CONSENT)).toBe(false);
    expect(missingRequired(EMPTY_CONSENT)).toEqual(["age", "service", "privacy"]);
  });

  it("모두 동의는 전부 켜고, 다시 누르면 전부 끈다", () => {
    expect(toggleAll(EMPTY_CONSENT)).toEqual(FULL_CONSENT);
    expect(toggleAll(FULL_CONSENT)).toEqual(EMPTY_CONSENT);
    const some = setItem(EMPTY_CONSENT, "age", true);
    expect(allState(some)).toBe("some");
    expect(toggleAll(some)).toEqual(FULL_CONSENT);
  });

  it("필수만 켜면 시작할 수 있고, 모두 동의는 some으로 남는다", () => {
    let c = EMPTY_CONSENT;
    c = setItem(c, "age", true);
    c = setItem(c, "service", true);
    expect(missingRequired(c)).toEqual(["privacy"]);
    c = setItem(c, "privacy", true);
    expect(canSubmit(c)).toBe(true);
    expect(allState(c)).toBe("some");
  });

  it("만 14세 확인을 끄면 다시 시작할 수 없다", () => {
    expect(canSubmit(setItem(FULL_CONSENT, "age", false))).toBe(false);
  });
});
