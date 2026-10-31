import { describe, expect, it } from "vitest";
import { addKstDays } from "@/lib/time";
import { explain, shortCategoryLabel } from "./explain";
import { makeScoreContext, scoreCandidate } from "./score";
import {
  BASE_SETTINGS,
  EMPTY_HISTORY,
  NOW,
  makeCandidate,
} from "./test-fixtures";
import type { Candidate, RecoHistory, RecoSettings, Visit } from "./types";

const daysAgo = (n: number) =>
  new Date(addKstDays(NOW, -n).getTime() + 12 * 3600_000);
const visit = (over: Partial<Visit> & Pick<Visit, "placeId">): Visit => ({
  category: "hansik",
  at: daysAgo(1),
  status: "visited",
  rating: null,
  ...over,
});

const reasonOf = (
  c: Candidate,
  settings: RecoSettings = BASE_SETTINGS,
  history: RecoHistory = EMPTY_HISTORY,
) => explain(scoreCandidate(c, makeScoreContext(settings, history, NOW)), NOW);

describe("추천 이유 (T5.10)", () => {
  it("항상 조각 2개를 쉼표로 잇고 중간점을 쓰지 않는다", () => {
    const r = reasonOf(makeCandidate("a", { distanceM: 200 }));
    expect(r.kinds).toHaveLength(2);
    expect(r.text.split(", ")).toHaveLength(2);
    expect(r.text).not.toMatch(/[·—–]/);
  });

  it("콜드 스타트: 도보 분과 새로 찾은 곳", () => {
    const r = reasonOf(makeCandidate("a", { distanceM: 200 }));
    expect(r.text).toBe("도보 약 4분, 새로 찾은 곳");
  });

  it("지난주 👍한 식당은 그 사실이 이유에 들어간다", () => {
    const history: RecoHistory = {
      visits: [
        visit({
          placeId: "a",
          rating: "up",
          at: daysAgo(8),
          category: "gukbap",
        }),
      ],
      blocked: new Set(),
    };
    const r = reasonOf(
      makeCandidate("a", { category: "gukbap", distanceM: 200 }),
      BASE_SETTINGS,
      history,
    );
    expect(r.text).toContain("지난주 👍한 국밥");
    expect(r.kinds).toContain("likedPlace");
  });

  it("요즘 땡기는 카테고리와 평판이 기여도 상위면 둘을 쓴다", () => {
    const settings: RecoSettings = {
      ...BASE_SETTINGS,
      craving: { categories: ["ilsik"], until: addKstDays(NOW, 3) },
    };
    const r = reasonOf(
      makeCandidate("a", {
        category: "ilsik",
        distanceM: 480,
        thumbs: { up: 40, down: 2 },
      }),
      settings,
    );
    // 기여도 순: 평판 0.25 × (0.92 − 0.5) > 땡겨요 0.3 × 0.25
    expect(r.text).toBe("👍 95%, 요즘 땡기는 일식");
  });

  it("최근 3일 기록이 있고 이 종류는 안 먹었으면 새로움을 말할 수 있다", () => {
    const history: RecoHistory = {
      visits: [visit({ placeId: "z", category: "hansik", at: daysAgo(1) })],
      blocked: new Set(),
    };
    const r = reasonOf(
      makeCandidate("a", { category: "jungsik", distanceM: 450 }),
      BASE_SETTINGS,
      history,
    );
    expect(r.text).toContain("최근 3일 안 먹은 중식");
  });

  it("제보 가격이 예산 안이면 가격대를 말하고, 추정가로는 말하지 않는다", () => {
    const reported = reasonOf(
      makeCandidate("a", {
        distanceM: 480,
        priceReport: { medianKRW: 9_000, count: 3 },
      }),
    );
    expect(reported.text).toContain("예산 안 1인 9천 원대");
    expect(reasonOf(makeCandidate("b", { distanceM: 480 })).text).not.toContain(
      "예산",
    );
  });

  it("할인 정보는 이유에 나오지 않는다(제품 원칙 6)", () => {
    const r = reasonOf(makeCandidate("a", { deal: { active: true } }));
    expect(r.text).not.toMatch(/할인|제휴|특선/);
  });

  it("카테고리 짧은 라벨", () => {
    expect(shortCategoryLabel("gukbap")).toBe("국밥");
    expect(shortCategoryLabel("cafe")).toBe("카페");
    expect(shortCategoryLabel("hansik")).toBe("한식");
  });
});
