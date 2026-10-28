import { describe, expect, it } from "vitest";
import { APP_TABS, matchTab } from "./tabs";

describe("APP_TABS", () => {
  it("오늘, 지도, 투표, 나 4개를 이 순서로 둔다 (APP-03)", () => {
    expect(APP_TABS.map((t) => t.label)).toEqual([
      "오늘",
      "지도",
      "투표",
      "나",
    ]);
    expect(APP_TABS.map((t) => t.href)).toEqual([
      "/today",
      "/map",
      "/poll",
      "/me",
    ]);
  });
});

describe("matchTab", () => {
  it("탭 경로와 같으면 그 탭", () => {
    expect(matchTab("/today")).toBe("today");
    expect(matchTab("/map")).toBe("map");
    expect(matchTab("/poll")).toBe("poll");
    expect(matchTab("/me")).toBe("me");
  });
  it("탭 아래 경로도 그 탭 (투표방 /poll/[code], 나 하위 설정)", () => {
    expect(matchTab("/poll/AbCdEf1234")).toBe("poll");
    expect(matchTab("/me/settings")).toBe("me");
  });
  it("끝 슬래시, 쿼리, 해시는 무시한다", () => {
    expect(matchTab("/today/")).toBe("today");
    expect(matchTab("/map?lat=1")).toBe("map");
    expect(matchTab("/me#favorites")).toBe("me");
  });
  it("접두만 같은 경로는 탭이 아니다", () => {
    expect(matchTab("/mention")).toBeNull();
    expect(matchTab("/maps")).toBeNull();
    expect(matchTab("/polls")).toBeNull();
  });
  it("랜딩, 약관, 빈 값은 활성 탭이 없다", () => {
    expect(matchTab("/")).toBeNull();
    expect(matchTab("/terms")).toBeNull();
    expect(matchTab("")).toBeNull();
    expect(matchTab(null)).toBeNull();
  });
});
