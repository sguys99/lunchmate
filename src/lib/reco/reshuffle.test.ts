import { describe, expect, it } from "vitest";
import { RESHUFFLE_STREAK } from "./constants";
import {
  EMPTY_REROLL_SIGNAL,
  noteReroll,
  resetRerollStreaks,
} from "./reshuffle";

describe("다시 뽑기 3연속 (T6.11)", () => {
  it("같은 카테고리가 화면에 있는 채로 3번 연속 다시 뽑으면 약한 부정이 된다", () => {
    expect(RESHUFFLE_STREAK).toBe(3);
    let s = EMPTY_REROLL_SIGNAL;
    s = noteReroll(s, ["hansik", "ilsik", "jungsik"]);
    s = noteReroll(s, ["hansik", "bunsik", "bunsik"]);
    expect(s.disliked.has("hansik")).toBe(false);
    expect(s.streaks.hansik).toBe(2);
    s = noteReroll(s, ["gukbap", "hansik", "salad"]);
    expect([...s.disliked]).toEqual(["hansik"]);
    expect(s.streaks.hansik).toBeUndefined();
  });

  it("중간에 화면에서 빠지면 연속이 끊긴다", () => {
    let s = EMPTY_REROLL_SIGNAL;
    s = noteReroll(s, ["hansik"]);
    s = noteReroll(s, ["ilsik"]);
    s = noteReroll(s, ["hansik"]);
    s = noteReroll(s, ["hansik"]);
    expect(s.disliked.size).toBe(0);
    expect(s.streaks.hansik).toBe(2);
  });

  it("한 화면에 같은 카테고리가 두 장이어도 한 번으로 센다", () => {
    const s = noteReroll(EMPTY_REROLL_SIGNAL, ["hansik", "hansik"]);
    expect(s.streaks.hansik).toBe(1);
  });

  it("다시 뽑기가 아닌 새 묶음은 연속만 끊고 이미 정한 약한 부정은 남긴다", () => {
    let s = EMPTY_REROLL_SIGNAL;
    for (let i = 0; i < 3; i++) s = noteReroll(s, ["hansik"]);
    s = noteReroll(s, ["ilsik"]);
    const r = resetRerollStreaks(s);
    expect(r.streaks).toEqual({});
    expect(r.disliked.has("hansik")).toBe(true);
  });

  it("입력을 바꾸지 않는다(순수)", () => {
    const before = noteReroll(EMPTY_REROLL_SIGNAL, ["hansik"]);
    const snapshot = { ...before.streaks };
    noteReroll(before, ["hansik"]);
    expect(before.streaks).toEqual(snapshot);
    expect(EMPTY_REROLL_SIGNAL.disliked.size).toBe(0);
  });
});
