import { describe, expect, it } from "vitest";
import { BADGE_PRIORITY, type PlaceBadge, pickBadges } from "./pick-badges";

const kinds = (list: PlaceBadge[]) =>
  list.map((b) => (b.kind === "waiting" ? `waiting:${b.level}` : b.kind));

describe("pickBadges", () => {
  it("기본 최대 2개, 우선순위 순서로 남긴다", () => {
    const picked = pickBadges([
      { kind: "report" },
      { kind: "deal" },
      { kind: "estimate" },
      { kind: "avoidWarning" },
    ]);
    expect(kinds(picked)).toEqual(["avoidWarning", "estimate"]);
  });

  it("웨이팅은 단계마다 무게가 다르다: 줄 길어요 > 추정 > 조금 기다려요 > 할인 > 바로 입장", () => {
    expect(
      kinds(
        pickBadges([{ kind: "estimate" }, { kind: "waiting", level: "long" }]),
      ),
    ).toEqual(["waiting:long", "estimate"]);
    expect(
      kinds(
        pickBadges([{ kind: "deal" }, { kind: "waiting", level: "short" }], 1),
      ),
    ).toEqual(["waiting:short"]);
    expect(
      kinds(
        pickBadges([{ kind: "waiting", level: "walkIn" }, { kind: "deal" }], 1),
      ),
    ).toEqual(["deal"]);
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
      { kind: "estimate" },
    ];
    expect(pickBadges(all, 3)).toHaveLength(3);
    expect(pickBadges(all, 0)).toEqual([]);
    expect(pickBadges([], 2)).toEqual([]);
  });

  it("입력 배열을 바꾸지 않는다", () => {
    const input: PlaceBadge[] = [{ kind: "report" }, { kind: "avoidWarning" }];
    const copy = structuredClone(input);
    pickBadges(input);
    expect(input).toEqual(copy);
  });

  it("우선순위 표가 모든 배지 종류와 웨이팅 3단계를 빠짐없이 한 번씩 담는다", () => {
    expect(new Set(BADGE_PRIORITY).size).toBe(BADGE_PRIORITY.length);
    expect([...BADGE_PRIORITY].sort()).toEqual(
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
