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
    getBounds: () => ({
      getSW: () => ({ lat: () => 37.49, lng: () => 126.99 }),
      getNE: () => ({ lat: () => 37.51, lng: () => 127.01 }),
    }),
    setZoom: vi.fn(),
    panTo: vi.fn(),
    panBy: vi.fn(),
    setSize: vi.fn(),
    fitBounds: vi.fn(),
    destroy: vi.fn(() => calls.push("map.destroy")),
  };
  const markerObj = {
    setPosition: vi.fn(),
    setMap: vi.fn(),
    getPosition: () => ({ lat: () => 37.51, lng: () => 127.01 }),
    setZIndex: vi.fn(),
  };
  const circleObj = { setCenter: vi.fn(), setRadius: vi.fn(), setMap: vi.fn() };
  const handlers = new Map<string, (e?: unknown) => void>();
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
    Circle: vi.fn(function () {
      return circleObj;
    }),
    Event: {
      addListener: vi.fn(
        (_t: object, name: string, handler: (e?: unknown) => void) => {
          handlers.set(name, handler);
          return { name };
        },
      ),
      removeListener: vi.fn(),
    },
  };
  window.naver = { maps: api as unknown as NaverMapsApi };
  return { api, mapObj, markerObj, circleObj, handlers, calls };
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
    marker.setZIndex(10);
    expect(markerObj.setZIndex).toHaveBeenCalledWith(10);
    marker.remove();
    expect(markerObj.setMap).toHaveBeenCalledWith(null);

    map.fitBounds({ sw: { lat: 0, lng: 0 }, ne: { lat: 1, lng: 1 } }, 8);
    expect(mapObj.fitBounds).toHaveBeenCalledWith(expect.anything(), {
      top: 8,
      right: 8,
      bottom: 8,
      left: 8,
    });

    expect(map.getBounds()).toEqual({
      sw: { lat: 37.49, lng: 126.99 },
      ne: { lat: 37.51, lng: 127.01 },
    });

    const off = map.onIdle(() => {});
    off();
    expect(api.Event.removeListener).toHaveBeenCalled();

    map.destroy();
    expect(mapObj.destroy).toHaveBeenCalledTimes(1);
  });

  it("지도 누르기, 핀 끌기 끝, 원, 부드러운 이동을 위임한다 (T4.16)", () => {
    const { api, mapObj, circleObj, handlers } = installFakeMaps();
    const map = createNaverMapProvider().createMap(
      document.createElement("div"),
      { center: { lat: 37.5665, lng: 126.978 }, zoom: 16 },
    );

    const onTap = vi.fn();
    const off = map.onClick(onTap);
    handlers.get("click")?.({ coord: { lat: () => 37.4, lng: () => 127.2 } });
    expect(onTap).toHaveBeenCalledWith({ lat: 37.4, lng: 127.2 });
    // 좌표가 없는 이벤트는 무시한다
    handlers.get("click")?.({});
    expect(onTap).toHaveBeenCalledTimes(1);
    off();

    const onDragEnd = vi.fn();
    map.addMarker({
      position: { lat: 1, lng: 2 },
      content: "<b>m</b>",
      draggable: true,
      onDragEnd,
    });
    expect(api.Marker).toHaveBeenCalledWith(
      expect.objectContaining({ draggable: true }),
    );
    handlers.get("dragend")?.();
    expect(onDragEnd).toHaveBeenCalledWith({ lat: 37.51, lng: 127.01 });

    const circle = map.addCircle({
      center: { lat: 1, lng: 2 },
      radius: 515,
      strokeColor: "currentColor",
      fillColor: "currentColor",
    });
    circle.setRadius(1030);
    expect(circleObj.setRadius).toHaveBeenCalledWith(1030);
    circle.remove();
    expect(circleObj.setMap).toHaveBeenCalledWith(null);

    map.panTo({ lat: 1, lng: 2 });
    map.panBy({ x: 10, y: -10 });
    map.setSize({ width: 390, height: 200 });
    expect(mapObj.setSize).toHaveBeenCalledWith({ width: 390, height: 200 });
    expect(mapObj.panTo).toHaveBeenCalled();
    expect(mapObj.panBy).toHaveBeenCalledWith({ x: 10, y: -10 });
    map.destroy();
  });
});
