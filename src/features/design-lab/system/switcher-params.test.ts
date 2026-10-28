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
    // design은 기본값(b)이라 직렬화에서 빠진다. G1 확정 후 시안은 b 하나(T1.20).
    const qs = "screen=sheet&state=offline&theme=dark&view=full";
    const sel = parseSelection(new URLSearchParams(`design=b&${qs}`));
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
      parseSelection({ design: ["b", "a"], theme: "LIGHT" }),
    ).toMatchObject({ design: "b", theme: "light" });
  });

  it("지운 시안(a, c)은 기본값으로", () => {
    expect(parseSelection(new URLSearchParams("design=a")).design).toBe("b");
    expect(parseSelection(new URLSearchParams("design=c")).design).toBe("b");
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
    expect(standaloneHref(DEFAULT_SELECTION)).toBe("/design-lab/system/b/home");
    expect(
      standaloneHref({ ...DEFAULT_SELECTION, screen: "sheet", state: "error" }),
    ).toBe("/design-lab/system/b/sheet?state=error");
  });
});
