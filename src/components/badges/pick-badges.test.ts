import { describe, expect, it } from "vitest";
import {
  BADGE_PRIORITY,
  INLINE_BADGE_KINDS,
  type PlaceBadge,
  hasInlineBadge,
  pickBadges,
} from "./pick-badges";

const kinds = (list: PlaceBadge[]) =>
  list.map((b) => (b.kind === "waiting" ? `waiting:${b.level}` : b.kind));

describe("pickBadges (T3.2 규칙: 기피 > 웨이팅 > 할인 > 제보, 추정은 가격 옆)", () => {
  it("기본 최대 2개, 우선순위 순서로 남긴다", () => {
    const picked = pickBadges([
      { kind: "report" },
      { kind: "deal" },
      { kind: "estimate" },
      { kind: "avoidWarning" },
    ]);
    expect(kinds(picked)).toEqual(["avoidWarning", "deal"]);
  });

  it("후보 4종이 모두 있으면 기피와 웨이팅이 남고 할인은 빠진다", () => {
    const picked = pickBadges([
      { kind: "deal" },
      { kind: "estimate" },
      { kind: "waiting", level: "short", minutesAgo: 3 },
      { kind: "avoidWarning" },
    ]);
    expect(kinds(picked)).toEqual(["avoidWarning", "waiting:short"]);
  });

  it("추정은 배지 줄에 오르지 않는다(가격 숫자 옆에 붙는다)", () => {
    expect(pickBadges([{ kind: "estimate" }])).toEqual([]);
    expect(kinds(pickBadges([{ kind: "estimate" }, { kind: "deal" }]))).toEqual(
      ["deal"],
    );
    // 추정이 슬롯을 차지하지 않아 웨이팅과 할인이 함께 보인다
    expect(
      kinds(
        pickBadges([
          { kind: "estimate" },
          { kind: "deal" },
          { kind: "waiting", level: "long" },
        ]),
      ),
    ).toEqual(["waiting:long", "deal"]);
  });

  it("웨이팅은 단계와 무관하게 할인보다 앞이다(바로 입장 포함)", () => {
    expect(
      kinds(
        pickBadges([{ kind: "deal" }, { kind: "waiting", level: "walkIn" }], 1),
      ),
    ).toEqual(["waiting:walkIn"]);
    expect(
      kinds(
        pickBadges([{ kind: "deal" }, { kind: "waiting", level: "short" }], 1),
      ),
    ).toEqual(["waiting:short"]);
    expect(
      kinds(
        pickBadges(
          [{ kind: "waiting", level: "long" }, { kind: "avoidWarning" }],
          1,
        ),
      ),
    ).toEqual(["avoidWarning"]);
  });

  it("같은 kind는 하나만, 더 높은 단계를 남긴다", () => {
    const picked = pickBadges([
      { kind: "waiting", level: "walkIn", minutesAgo: 3 },
      { kind: "waiting", level: "long", minutesAgo: 12 },
      { kind: "report" },
    ]);
    expect(picked).toEqual([
      { kind: "waiting", level: "long", minutesAgo: 12 },
      { kind: "report" },
    ]);
  });

  it("max 인자를 따르고, 0 이하이면 빈 배열", () => {
    const all: PlaceBadge[] = [
      { kind: "report" },
      { kind: "deal" },
      { kind: "avoidWarning" },
      { kind: "estimate" },
    ];
    expect(kinds(pickBadges(all, 3))).toEqual([
      "avoidWarning",
      "deal",
      "report",
    ]);
    expect(pickBadges(all, 0)).toEqual([]);
    expect(pickBadges([], 2)).toEqual([]);
  });

  it("입력 배열을 바꾸지 않는다", () => {
    const input: PlaceBadge[] = [
      { kind: "report" },
      { kind: "estimate" },
      { kind: "avoidWarning" },
    ];
    const copy = structuredClone(input);
    pickBadges(input);
    expect(input).toEqual(copy);
  });

  it("우선순위 표와 숫자 옆 표시가 모든 배지 종류를 겹치지 않게 한 번씩 덮는다", () => {
    expect(new Set(BADGE_PRIORITY).size).toBe(BADGE_PRIORITY.length);
    expect([...BADGE_PRIORITY, ...INLINE_BADGE_KINDS].sort()).toEqual(
      [
        "avoidWarning",
        "deal",
        "estimate",
        "report",
        "waiting:long",
        "waiting:short",
        "waiting:walkIn",
      ].sort(),
    );
  });
});

describe("hasInlineBadge", () => {
  it("숫자 옆 표시 종류가 후보에 있을 때만 true", () => {
    expect(hasInlineBadge([{ kind: "estimate" }], "estimate")).toBe(true);
    expect(hasInlineBadge([{ kind: "deal" }], "estimate")).toBe(false);
    // 배지 줄 종류는 숫자 옆 표시가 아니다
    expect(hasInlineBadge([{ kind: "deal" }], "deal")).toBe(false);
  });
});
