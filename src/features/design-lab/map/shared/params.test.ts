import { describe, expect, it } from "vitest";
import { nearestSnap } from "./use-map-lab";
import { parseMapLabParams } from "./params";

describe("parseMapLabParams", () => {
  it("기본값", () => {
    expect(parseMapLabParams({})).toEqual({
      state: "ready",
      selectId: null,
      snap: null,
      filterOpen: false,
      moved: false,
      provider: "lab",
    });
  });

  it("쿼리를 읽는다", () => {
    const p = parseMapLabParams(
      new URLSearchParams(
        "state=error&select=mock-gukbap&snap=FULL&filter=open&moved=1&map=naver",
      ),
    );
    expect(p).toEqual({
      state: "error",
      selectId: "mock-gukbap",
      snap: "full",
      filterOpen: true,
      moved: true,
      provider: "naver",
    });
  });

  it("모르는 식당 id와 높이는 버린다", () => {
    const p = parseMapLabParams({ select: "nope", snap: "huge" });
    expect(p.selectId).toBeNull();
    expect(p.snap).toBeNull();
  });
});

describe("nearestSnap", () => {
  it("안이 쓰지 않는 높이는 가까운 단계로 맞춘다", () => {
    expect(nearestSnap("peek", ["half", "full"])).toBe("half");
    expect(nearestSnap("full", ["peek", "half", "full"])).toBe("full");
    expect(nearestSnap("half", ["peek", "full"])).toBe("full");
  });
});
