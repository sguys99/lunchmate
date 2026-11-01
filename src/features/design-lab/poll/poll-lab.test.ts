// 투표방 시안 목업 규칙 (T7.1): 쿼리 해석, 득표 집계, 동점, 룰렛 리듬, 조사
import { describe, expect, it } from "vitest";
import { leaders, rouletteSteps, tally, withRo } from "./mock";
import { isNameFail, isNoticeFlow, parsePollParams } from "./params";

describe("parsePollParams", () => {
  it("기본값은 진행 중, 참여자, 한 곳 투표", () => {
    expect(parsePollParams({})).toMatchObject({
      state: "ready",
      flow: "vote",
      role: "member",
      multi: false,
    });
  });
  it("이름 실패와 못 들어가는 방을 가린다", () => {
    expect(isNameFail(parsePollParams({ state: "error", fail: "name" }))).toBe(
      true,
    );
    expect(isNoticeFlow("expired")).toBe(true);
    expect(isNoticeFlow("result")).toBe(false);
  });
});

describe("tally, leaders", () => {
  it("내 표를 더하고 최다 득표를 찾는다", () => {
    const votes = tally(3, { a: [0], b: [1] }, [1]);
    expect(votes).toEqual([1, 2, 0]);
    expect(leaders(votes)).toEqual([1]);
  });
  it("동점이면 둘 다, 0표뿐이면 없음", () => {
    expect(leaders([3, 3, 1])).toEqual([0, 1]);
    expect(leaders([0, 0])).toEqual([]);
  });
});

describe("rouletteSteps", () => {
  it("60ms에서 260ms까지 늘고 2초 안에 끝난다", () => {
    const steps = rouletteSteps();
    expect(steps[0]).toBe(60);
    expect(Math.max(...steps)).toBeLessThanOrEqual(260);
    expect(steps.reduce((s, x) => s + x, 0)).toBeLessThanOrEqual(2000);
  });
});

describe("withRo", () => {
  it("받침과 ㄹ 받침을 가린다", () => {
    expect(withRo("정담국밥")).toBe("정담국밥으로");
    expect(withRo("골목분식 두리")).toBe("골목분식 두리로");
    expect(withRo("서울")).toBe("서울로");
  });
});
