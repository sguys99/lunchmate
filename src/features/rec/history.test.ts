import { describe, expect, it } from "vitest";
import { NEUTRAL } from "@/lib/reco/constants";
import { makeScoreContext, scoreCandidate } from "@/lib/reco/score";
import { BASE_SETTINGS, NOW, makeCandidate } from "@/lib/reco/test-fixtures";
import { fromKstWallTime } from "@/lib/time";
import { ratingOf, toVisits, visitStatusOf, type HistoryRow } from "./history";

const row = (over: Partial<HistoryRow> = {}): HistoryRow => ({
  placeId: "1",
  visitedOn: "2026-10-29",
  status: "visited",
  rating: null,
  ...over,
});

describe("toVisits (T6.11)", () => {
  it("방문일은 KST 정오, 카테고리는 이번 후보에서만 찾는다", () => {
    const v = toVisits([row(), row({ placeId: "2" })], (id) =>
      id === "1" ? "ilsik" : null,
    );
    expect(v[0]!.at).toEqual(fromKstWallTime(2026, 10, 29, 12));
    expect(v[0]!.category).toBe("ilsik");
    expect(v[1]!.category).toBeNull();
  });

  it("날짜가 깨진 줄은 버린다", () => {
    expect(toVisits([row({ visitedOn: "어제" })], () => null)).toEqual([]);
  });

  it("DB 상태와 평가 변환: not_visited는 skipped, 모르는 값은 버린다", () => {
    expect(visitStatusOf("not_visited")).toBe("skipped");
    expect(visitStatusOf("candidate")).toBe("candidate");
    expect(visitStatusOf("??")).toBeNull();
    expect(ratingOf("down")).toBe("down");
    expect(ratingOf(undefined)).toBeNull();
  });

  it("어제 👎한 식당은 엔진에서 P가 내려간다(AC-REC-5), 안 갔어요는 신호가 아니다(FB-05)", () => {
    const ctx = (rows: HistoryRow[]) =>
      makeScoreContext(
        BASE_SETTINGS,
        { visits: toVisits(rows, () => "hansik"), blocked: new Set() },
        NOW,
      );
    const c = makeCandidate("1");
    expect(
      scoreCandidate(c, ctx([row({ rating: "down" })])).factors.P,
    ).toBeLessThan(NEUTRAL);
    const skipped = scoreCandidate(c, ctx([row({ status: "skipped" })]));
    expect(skipped.factors.P).toBe(NEUTRAL);
    expect(skipped.factors.R).toBe(0);
  });
});
