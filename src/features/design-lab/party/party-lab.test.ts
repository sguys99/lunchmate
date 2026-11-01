// 회식 모드 시안 근거 모델과 쿼리 (T7.3)
import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONDITIONS,
  candidatesFor,
  evidenceFor,
  rankCandidates,
} from "./mock";
import { parsePartyParams } from "./params";

const base = parsePartyParams({});

describe("회식 시안 근거", () => {
  it("기본 조건이면 5곳, 예산 넘는 제보 가격과 주류 제외 카테고리는 빠진다", () => {
    const list = candidatesFor(base, DEFAULT_CONDITIONS);
    expect(list).toHaveLength(5);
    expect(list.map((c) => c.id)).not.toContain("party-yangsik");
    expect(list.map((c) => c.id)).not.toContain("party-cafe");
  });

  it("제보로 확인된 조건이 많은 곳이 앞에 온다", () => {
    const [first] = rankCandidates(
      candidatesFor(base, DEFAULT_CONDITIONS),
      DEFAULT_CONDITIONS,
    );
    expect(
      evidenceFor(first!, DEFAULT_CONDITIONS).every((e) => e.status === "met"),
    ).toBe(true);
  });

  it("끈 조건은 근거 줄을 만들지 않고, 근거 없는 자리는 정보 없음", () => {
    const off = { ...DEFAULT_CONDITIONS, room: false, alcohol: false };
    const [c] = candidatesFor(base, off);
    expect(evidenceFor(c!, off).map((e) => e.key)).toEqual(["budget"]);
    const sushi = candidatesFor(base, DEFAULT_CONDITIONS).find(
      (x) => x.id === "party-ilsik",
    )!;
    expect(
      evidenceFor(sushi, DEFAULT_CONDITIONS).find((e) => e.key === "room")
        ?.status,
    ).toBe("unknown");
  });

  it("10명 이상이면 단체석 근거를 앞세운다", () => {
    const big = { ...DEFAULT_CONDITIONS, headcount: 12 };
    const gogi = candidatesFor(base, big).find((x) => x.id === "party-gogi")!;
    expect(evidenceFor(gogi, big).find((e) => e.key === "room")?.text).toBe(
      "단체석 제보 2건",
    );
  });

  it("쿼리: few, empty, edit, active", () => {
    expect(
      candidatesFor(parsePartyParams({ few: "on" }), DEFAULT_CONDITIONS),
    ).toHaveLength(2);
    expect(
      candidatesFor(parsePartyParams({ state: "empty" }), DEFAULT_CONDITIONS),
    ).toHaveLength(0);
    expect(parsePartyParams({ edit: "budget", active: "3" })).toMatchObject({
      edit: "budget",
      active: 2,
    });
    expect(parsePartyParams({ edit: "x", q: "9" })).toMatchObject({
      edit: null,
      q: 1,
    });
  });
});
