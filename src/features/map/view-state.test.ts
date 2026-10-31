import { describe, expect, it } from "vitest";
import {
  HALF_RATIO,
  INITIAL_MAP_LOAD,
  LOW_SHEET_PX,
  SHEET_ORDER,
  expandedWalk,
  mapLoadReducer,
  mapScreenMode,
  nextSnap,
  researchVisible,
  sheetCover,
  sheetLayout,
  snapAfterDrag,
  tabsHidden,
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

describe("시트 3단과 지도 만지면 접힘 (2026-10-31)", () => {
  it("지도를 만지면 어느 단계에서든 낮게, 데스크톱은 그대로", () => {
    for (const s of SHEET_ORDER)
      expect(nextSnap(s, "mapGesture", false)).toBe("low");
    expect(nextSnap("half", "mapGesture", true)).toBe("half");
  });

  it("시트를 누르거나 숨은 탭에 초점이 오면 낮게에서 반쯤으로, 다른 단계는 그대로", () => {
    expect(nextSnap("low", "sheetTap", false)).toBe("half");
    expect(nextSnap("low", "tabFocus", false)).toBe("half");
    expect(nextSnap("full", "tabFocus", false)).toBe("full");
    expect(nextSnap("half", "sheetTap", false)).toBe("half");
  });

  it("마커를 고르면 반쯤, 손잡이는 낮게 → 반쯤 → 끝까지 → 반쯤", () => {
    expect(nextSnap("low", "select", false)).toBe("half");
    expect(nextSnap("full", "select", false)).toBe("half");
    expect(nextSnap("low", "handle", false)).toBe("half");
    expect(nextSnap("half", "handle", false)).toBe("full");
    expect(nextSnap("full", "handle", false)).toBe("half");
  });

  it("하단 탭은 모바일 낮게에서만 숨는다", () => {
    expect(tabsHidden("low", false)).toBe(true);
    expect(tabsHidden("half", false)).toBe(false);
    expect(tabsHidden("full", false)).toBe(false);
    expect(tabsHidden("low", true)).toBe(false);
  });

  // 390x664 아이폰(브라우저 바 제외), 하단 탭 64 + 홈 인디케이터 34. 칸은 탭 아래까지 664
  const layout = sheetLayout({ stage: 664, tabLift: 98, safeBottom: 34 });

  it("반쯤은 탭 위 지도 칸의 48%, 탭 위에 앉는다", () => {
    expect(layout.top.half).toBe(664 - 98 - Math.round(566 * HALF_RATIO));
    expect(layout.floor.half).toBe(98);
    expect(sheetCover(layout, "half", 664)).toBe(
      98 + Math.round(566 * HALF_RATIO),
    );
  });

  it("낮게는 88px + 홈 인디케이터, 탭이 숨어 화면 바닥에 앉는다", () => {
    expect(layout.top.low).toBe(664 - (LOW_SHEET_PX + 34));
    expect(layout.floor.low).toBe(0);
    expect(sheetCover(layout, "low", 664)).toBe(122);
  });

  it("끝까지는 위 8px 틈", () => {
    expect(layout.top.full).toBe(8);
  });

  it("단계 순서가 뒤집히지 않는다(낮은 칸에서도 낮게 ≥ 반쯤 윗변)", () => {
    const small = sheetLayout({ stage: 200, tabLift: 98, safeBottom: 34 });
    expect(small.top.low).toBeGreaterThanOrEqual(small.top.half);
    expect(small.top.half).toBeGreaterThanOrEqual(small.top.full);
  });

  it("끌기를 놓으면 가까운 단계, 빠르게 튕기면 시작 단계에서 한 단계", () => {
    expect(
      snapAfterDrag({ layout, start: "half", top: layout.top.low - 10, v: 0 }),
    ).toBe("low");
    expect(snapAfterDrag({ layout, start: "half", top: 20, v: 0 })).toBe(
      "full",
    );
    expect(
      snapAfterDrag({ layout, start: "low", top: layout.top.low - 30, v: -1 }),
    ).toBe("half");
    expect(
      snapAfterDrag({ layout, start: "half", top: layout.top.half + 30, v: 1 }),
    ).toBe("low");
    expect(snapAfterDrag({ layout, start: "full", top: 30, v: -1 })).toBe(
      "full",
    );
  });
});
