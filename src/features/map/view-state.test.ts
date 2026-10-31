import { describe, expect, it } from "vitest";
import {
  INITIAL_MAP_LOAD,
  expandedWalk,
  mapLoadReducer,
  mapScreenMode,
  researchVisible,
} from "./view-state";

const ok = {
  loadFailed: false,
  base: "ready" as const,
  online: true,
  hasPlaces: true,
  kakaoError: false,
  mapStatus: "ready" as const,
};

describe("지도 로딩 실패 → 목록 보기 (T5.32)", () => {
  it("지도 SDK가 실패하면 목록 보기로 바뀐다", () => {
    const failed = mapLoadReducer(INITIAL_MAP_LOAD, "failed");
    expect(mapScreenMode({ ...ok, mapStatus: failed.status })).toBe("list");
  });

  it("다시 불러오기는 회차를 올리고 로딩으로 돌아간다", () => {
    const failed = mapLoadReducer(INITIAL_MAP_LOAD, "failed");
    const retry = mapLoadReducer(failed, "retry");
    expect(retry).toEqual({ status: "loading", attempt: 1 });
    expect(mapScreenMode({ ...ok, mapStatus: retry.status })).toBe("map");
    expect(mapLoadReducer(retry, "loaded").status).toBe("ready");
  });

  it("준비된 뒤 인증 실패도 목록 보기다", () => {
    const ready = mapLoadReducer(INITIAL_MAP_LOAD, "loaded");
    expect(mapLoadReducer(ready, "failed").status).toBe("failed");
  });

  it("실패 뒤 늦게 온 loaded는 무시한다", () => {
    const failed = mapLoadReducer(INITIAL_MAP_LOAD, "failed");
    expect(mapLoadReducer(failed, "loaded").status).toBe("failed");
  });

  it("카카오까지 실패하면 목록 대신 오류 화면", () => {
    expect(
      mapScreenMode({
        ...ok,
        hasPlaces: false,
        kakaoError: true,
        mapStatus: "failed",
      }),
    ).toBe("kakaoError");
  });

  it("오프라인이고 받은 목록이 없으면 오프라인, 있으면 그대로 보인다", () => {
    expect(mapScreenMode({ ...ok, online: false, hasPlaces: false })).toBe(
      "offline",
    );
    expect(mapScreenMode({ ...ok, online: false })).toBe("map");
  });

  it("기준점이 없으면 위치 안내가 먼저다", () => {
    expect(mapScreenMode({ ...ok, base: "none" })).toBe("needLocation");
    expect(mapScreenMode({ ...ok, base: "locating" })).toBe("locating");
    expect(mapScreenMode({ ...ok, loadFailed: true })).toBe("loadFailed");
  });
});

describe("이 지역에서 다시 찾기 (MAP-05)", () => {
  const searchCenter = { lat: 37.5665, lng: 126.978 };
  // 위도 0.001도 ≈ 111m
  const moved = { lat: 37.5675, lng: 126.978 };

  it("사용자가 옮기지 않았으면(코드가 옮김) 보이지 않는다", () => {
    expect(
      researchVisible({
        userMoved: false,
        mapCenter: moved,
        searchCenter,
        radiusM: 515,
      }),
    ).toBe(false);
  });

  it("사용자가 반경의 20% 이상 옮기면 보인다", () => {
    expect(
      researchVisible({
        userMoved: true,
        mapCenter: moved,
        searchCenter,
        radiusM: 515,
      }),
    ).toBe(true);
  });

  it("조금(손 떨림) 옮긴 것은 보이지 않는다", () => {
    expect(
      researchVisible({
        userMoved: true,
        mapCenter: { lat: 37.5667, lng: 126.978 },
        searchCenter,
        radiusM: 515,
      }),
    ).toBe(false);
  });

  it("지도 가운데를 모르면 보이지 않는다", () => {
    expect(
      researchVisible({
        userMoved: true,
        mapCenter: null,
        searchCenter,
        radiusM: 515,
      }),
    ).toBe(false);
  });
});

describe("넓히기", () => {
  it("5분 더, 20분이 상한", () => {
    expect(expandedWalk(10)).toBe(15);
    expect(expandedWalk(18)).toBe(20);
    expect(expandedWalk(20)).toBeNull();
  });
});
