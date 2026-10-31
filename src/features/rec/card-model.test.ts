import { describe, expect, it } from "vitest";
import { recommend } from "@/lib/reco/recommend";
import { seededRng } from "@/lib/reco/pick-one";
import { makeCandidate, makeInput, NOW } from "@/lib/reco/test-fixtures";
import { cardBadges, priceNumber, toCard, toCards } from "./card-model";

const place = {
  placeUrl: "https://place.map.kakao.com/a",
  position: { lat: 37.5, lng: 127 },
};

function pickOf(over: Parameters<typeof makeCandidate>[1] = {}) {
  const p = recommend(
    makeInput({ candidates: [makeCandidate("a", over)] }),
    seededRng(1),
  ).picks[0];
  if (!p) throw new Error("no pick");
  return p;
}

describe("카드 표시 값 (REC-06)", () => {
  it("가격: 제보가 없으면 카테고리 추정가 + 추정 표시, 천과 만은 숫자에 붙인다", () => {
    const card = toCard(pickOf({ category: "gukbap" }), place, "lunch", NOW);
    expect(card.price).toMatchObject({
      value: "1만",
      unit: "원대",
      estimate: true,
    });
    expect(priceNumber(9_500)).toEqual({ value: "9천", unit: "원대" });
  });

  it("도보 분은 올림, 👍는 후기 3건 미만이면 null(후기 모으는 중)", () => {
    const card = toCard(pickOf({ distanceM: 300 }), place, "lunch", NOW);
    expect(card.walk.value).toBe("6");
    expect(card.thumbs.value).toBeNull();
  });

  it("이유에서 도보 조각을 뺀다(G3 안건 6)", () => {
    const card = toCard(pickOf(), place, "lunch", NOW);
    expect(card.reason).not.toMatch(/도보 약/);
  });

  it("웨이팅은 30분 안 제보만, 할인은 표시만", () => {
    const fresh = pickOf({
      waiting: {
        level: "long",
        reportedAt: new Date(NOW.getTime() - 5 * 60_000),
      },
      deal: { active: true },
    });
    expect(cardBadges(fresh, NOW)).toEqual([
      { kind: "waiting", level: "long", minutesAgo: 5 },
      { kind: "deal" },
    ]);
    const stale = pickOf({
      waiting: {
        level: "long",
        reportedAt: new Date(NOW.getTime() - 31 * 60_000),
      },
    });
    expect(cardBadges(stale, NOW)).toEqual([]);
  });

  it("카카오 값이 없는 곳은 묶음에서 뺀다", () => {
    expect(toCards([pickOf()], new Map(), "lunch", NOW)).toEqual([]);
  });
});
