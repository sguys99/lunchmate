// 식당 메모 시안 (T10.15) 쿼리 해석과 메모 규칙 테스트
import { describe, expect, it } from "vitest";
import { MEMO_MAX } from "@/copy/design-lab-memo";
import { parseMemoParams } from "./params";
import { FAVORITES, memoCheck, memoLength, normalizeMemo } from "./shared";

describe("parseMemoParams", () => {
  it("기본은 ready, detail, 편집 닫힘, 저장 실패", () => {
    expect(parseMemoParams({})).toEqual({ state: "ready", view: "detail", edit: false, fail: "save" });
  });
  it("모르는 view는 detail, fail은 banned|limit만 받는다", () => {
    const p = parseMemoParams({ view: "map", fail: "boom" });
    expect(p.view).toBe("detail");
    expect(p.fail).toBe("save");
    expect(parseMemoParams({ view: "OUTAGE", fail: "limit" })).toMatchObject({ view: "outage", fail: "limit" });
  });
  it("오류 상태는 쓰는 중이므로 편집을 연 채로 시작한다", () => {
    expect(parseMemoParams({ state: "error" }).edit).toBe(true);
    expect(parseMemoParams({ edit: "1" }).edit).toBe(true);
  });
});

describe("메모 규칙", () => {
  it("공백과 줄바꿈을 한 칸으로 줄이고 앞뒤를 자른다", () => {
    expect(normalizeMemo("  깍두기\n맛집   12시 전 ")).toBe("깍두기 맛집 12시 전");
  });
  it("빈 글은 저장이 아니라 지우기, 상한을 넘으면 저장할 수 없다", () => {
    expect(memoCheck("   ")).toBe("empty");
    expect(memoCheck("가".repeat(MEMO_MAX))).toBe("ok");
    expect(memoCheck("가".repeat(MEMO_MAX + 1))).toBe("tooLong");
  });
  it("글자 수는 코드 포인트로 센다", () => {
    expect(memoLength("국밥🍚")).toBe(3);
  });
  it("목업 메모는 모두 상한 안이고 장소명을 담지 않는다", () => {
    for (const f of FAVORITES) {
      if (!f.memo) continue;
      expect(memoLength(f.memo)).toBeLessThanOrEqual(MEMO_MAX);
      if (f.name) expect(f.memo).not.toContain(f.name);
    }
  });
});
