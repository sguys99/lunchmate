// @vitest-environment jsdom
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import type { MapInstance, MapProvider } from "@/lib/map/types";
import { createNaverMapProvider } from "./naver-map-provider";
import { resetNaverMapLoaderForTest } from "./map-loader";
import type { NaverMapsApi } from "./naver-maps-types";

afterEach(() => resetNaverMapLoaderForTest());

// 네이버 SDK 를 흉내 낸 가짜. 호출 기록만 남긴다.
function installFakeMaps() {
  const calls: string[] = [];
  const mapObj = {
    setCenter: vi.fn(),
    getCenter: () => ({ lat: () => 37.5, lng: () => 127 }),
    setZoom: vi.fn(),
    fitBounds: vi.fn(),
    destroy: vi.fn(() => calls.push("map.destroy")),
  };
  const markerObj = { setPosition: vi.fn(), setMap: vi.fn() };
  const api = {
    Map: vi.fn(function () {
      return mapObj;
    }),
    LatLng: vi.fn(function (lat: number, lng: number) {
      return { lat: () => lat, lng: () => lng };
    }),
    LatLngBounds: vi.fn(function () {
      return {};
    }),
    Point: vi.fn(function (x: number, y: number) {
      return { x, y };
    }),
    Marker: vi.fn(function () {
      return markerObj;
    }),
    Event: { addListener: vi.fn(() => ({})), removeListener: vi.fn() },
  };
  window.naver = { maps: api as unknown as NaverMapsApi };
  return { api, mapObj, markerObj, calls };
}

describe("네이버 MapProvider", () => {
  it("MapProvider, MapInstance 인터페이스에 적합하다(타입)", () => {
    const provider = createNaverMapProvider();
    expectTypeOf(provider).toExtend<MapProvider>();
    expectTypeOf<
      ReturnType<MapProvider["createMap"]>
    >().toEqualTypeOf<MapInstance>();
    expect(provider.name).toBe("naver");
  });

  it("지도 생성, 이동, 마커, 영역 맞춤, 정리를 네이버 API 로 위임한다", () => {
    const { api, mapObj, markerObj } = installFakeMaps();
    const map = createNaverMapProvider().createMap(
      document.createElement("div"),
      { center: { lat: 37.5665, lng: 126.978 }, zoom: 16 },
    );
    expect(api.Map).toHaveBeenCalledTimes(1);

    expect(map.getCenter()).toEqual({ lat: 37.5, lng: 127 });
    map.setCenter({ lat: 1, lng: 2 });
    map.setZoom(10);
    expect(mapObj.setCenter).toHaveBeenCalled();
    expect(mapObj.setZoom).toHaveBeenCalledWith(10);

    const onClick = vi.fn();
    const marker = map.addMarker({
      position: { lat: 1, lng: 2 },
      content: "<b>m</b>",
      anchor: { x: 1, y: 2 },
      onClick,
    });
    expect(api.Marker).toHaveBeenCalledTimes(1);
    marker.remove();
    expect(markerObj.setMap).toHaveBeenCalledWith(null);

    map.fitBounds({ sw: { lat: 0, lng: 0 }, ne: { lat: 1, lng: 1 } }, 8);
    expect(mapObj.fitBounds).toHaveBeenCalledWith(expect.anything(), {
      top: 8,
      right: 8,
      bottom: 8,
      left: 8,
    });

    const off = map.onIdle(() => {});
    off();
    expect(api.Event.removeListener).toHaveBeenCalled();

    map.destroy();
    expect(mapObj.destroy).toHaveBeenCalledTimes(1);
  });
});
