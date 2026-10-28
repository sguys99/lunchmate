import { describe, expect, it } from "vitest";
import {
  DEFAULT_SELECTION,
  cycleState,
  parseSelection,
  serializeSelection,
  standaloneHref,
} from "./switcher-params";

describe("switcher-params", () => {
  it("빈 쿼리와 모르는 값은 기본값", () => {
    expect(parseSelection(new URLSearchParams())).toEqual(DEFAULT_SELECTION);
    expect(
      parseSelection(
        new URLSearchParams("design=z&screen=x&state=zz&theme=neon&view=wide"),
      ),
    ).toEqual(DEFAULT_SELECTION);
  });

  it("쿼리를 해석하고 다시 같은 쿼리로 만든다", () => {
    const qs = "design=b&screen=sheet&state=offline&theme=dark&view=full";
    const sel = parseSelection(new URLSearchParams(qs));
    expect(sel).toEqual({
      design: "b",
      screen: "sheet",
      state: "offline",
      theme: "dark",
      view: "full",
    });
    expect(serializeSelection(sel)).toBe(qs);
  });

  it("Next searchParams 객체도 받는다", () => {
    expect(
      parseSelection({ design: ["c", "a"], theme: "LIGHT" }),
    ).toMatchObject({ design: "c", theme: "light" });
  });

  it("기본값 키는 쿼리에서 뺀다", () => {
    expect(serializeSelection(DEFAULT_SELECTION)).toBe("");
  });

  it("상태 순환", () => {
    expect(cycleState("ready", 1)).toBe("loading");
    expect(cycleState("ready", -1)).toBe("offline");
    expect(cycleState("offline", 1)).toBe("ready");
  });

  it("단독 화면 경로", () => {
    expect(standaloneHref(DEFAULT_SELECTION)).toBe("/design-lab/system/a/home");
    expect(
      standaloneHref({ ...DEFAULT_SELECTION, screen: "sheet", state: "error" }),
    ).toBe("/design-lab/system/a/sheet?state=error");
  });
});
