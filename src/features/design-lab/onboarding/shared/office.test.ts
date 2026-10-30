import { describe, expect, it } from "vitest";
import {
  countNearby,
  initialOfficeDraft,
  MOCK_CURRENT_LOCATION,
  MOCK_SEARCH_RESULTS,
  NEARBY_MAX,
  officeReducer,
  officeSavePayload,
  searchMockPlaces,
  START_CENTER,
} from "./office";

const searchHit = MOCK_SEARCH_RESULTS[0]!.at;

describe("온보딩 사무실 위치 (AC-ONB-3 시안 규칙)", () => {
  for (const mode of ["tap", "center"] as const) {
    it(`${mode}: 검색과 현위치는 지도 중심만 옮기고 저장 값을 만들지 않는다`, () => {
      let d = initialOfficeDraft(false);
      d = officeReducer(d, { type: "search-move", to: searchHit }, mode);
      expect(d.center).toEqual(searchHit);
      expect(officeSavePayload(d)).toBeNull();
      d = officeReducer(
        d,
        { type: "locate-move", to: MOCK_CURRENT_LOCATION },
        mode,
      );
      expect(officeSavePayload(d)).toBeNull();
    });
  }

  it("tap: 누른 점이 핀이 되고, 지도를 움직여도 핀은 그대로다", () => {
    let d = officeReducer(
      initialOfficeDraft(false),
      { type: "place", at: { x: 10, y: 20 } },
      "tap",
    );
    d = officeReducer(d, { type: "pan", to: { x: 400, y: 400 } }, "tap");
    d = officeReducer(d, { type: "search-move", to: searchHit }, "tap");
    expect(officeSavePayload(d)).toEqual({ x: 10, y: 20 });
  });

  it("center: 검색으로 옮기면 핀을 비우고, 사용자가 움직인 중심만 핀이 된다", () => {
    let d = officeReducer(
      initialOfficeDraft(false),
      { type: "pan", to: { x: 300, y: 300 } },
      "center",
    );
    d = officeReducer(d, { type: "search-move", to: searchHit }, "center");
    expect(d.pin).toBeNull();
    d = officeReducer(d, { type: "pan", to: { x: 615, y: 492 } }, "center");
    expect(officeSavePayload(d)).toEqual({ x: 615, y: 492 });
  });

  it("저장 값에는 좌표 두 개만 있다", () => {
    const d = officeReducer(
      initialOfficeDraft(false),
      { type: "place", at: START_CENTER },
      "tap",
    );
    expect(Object.keys(officeSavePayload(d) ?? {})).toEqual(["x", "y"]);
  });
});

describe("목업 검색과 근처 식당 수", () => {
  it("검색 결과는 최대 3개, 빈 검색어는 0개", () => {
    expect(searchMockPlaces("")).toEqual([]);
    expect(searchMockPlaces("로").length).toBeLessThanOrEqual(3);
    expect(searchMockPlaces("소담 빌딩")[0]?.id).toBe("sodam");
  });

  it("반경이 넓을수록 많고 45곳을 넘지 않는다", () => {
    const a = countNearby(START_CENTER, 50);
    const b = countNearby(START_CENTER, 150);
    expect(b).toBeGreaterThan(a);
    expect(countNearby(START_CENTER, 5000)).toBe(NEARBY_MAX);
  });
});
