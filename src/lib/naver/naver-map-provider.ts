// MapProvider 의 네이버 구현체 (T0.34). 네이버 고유 타입은 이 파일 안에서만 쓴다.
import type {
  Bounds,
  LatLng,
  MapInstance,
  MapOptions,
  MapProvider,
  MarkerHandle,
  MarkerOptions,
} from "@/lib/map/types";
import {
  getNaverMapsApi,
  loadNaverMaps,
  onNaverAuthFailure,
  type LoadNaverMapsOptions,
} from "./map-loader";
import type { NaverListener, NaverMap } from "./naver-maps-types";

function createNaverMap(
  element: HTMLElement,
  options: MapOptions,
): MapInstance {
  const maps = getNaverMapsApi();
  const toNaver = (p: LatLng) => new maps.LatLng(p.lat, p.lng);
  const map: NaverMap = new maps.Map(element, {
    center: toNaver(options.center),
    zoom: options.zoom,
    scaleControl: false,
  });

  const listeners = new Set<NaverListener>();
  const markers = new Set<{ remove(): void }>();

  const instance: MapInstance = {
    setCenter: (center) => map.setCenter(toNaver(center)),
    getCenter: () => {
      const c = map.getCenter();
      return { lat: c.lat(), lng: c.lng() };
    },
    setZoom: (zoom) => map.setZoom(zoom),
    addMarker: (opts: MarkerOptions): MarkerHandle => {
      const marker = new maps.Marker({
        position: toNaver(opts.position),
        map,
        title: opts.title,
        zIndex: opts.zIndex,
        icon: {
          content: opts.content,
          anchor: opts.anchor && new maps.Point(opts.anchor.x, opts.anchor.y),
        },
      });
      const clickListener = opts.onClick
        ? maps.Event.addListener(marker, "click", opts.onClick)
        : undefined;
      const handle = {
        setPosition: (position: LatLng) =>
          marker.setPosition(toNaver(position)),
        remove: () => {
          if (clickListener) {
            maps.Event.removeListener(clickListener);
            listeners.delete(clickListener);
          }
          marker.setMap(null);
          markers.delete(handle);
        },
      };
      if (clickListener) listeners.add(clickListener);
      markers.add(handle);
      return handle;
    },
    fitBounds: (bounds: Bounds, padding = 0) =>
      map.fitBounds(
        new maps.LatLngBounds(toNaver(bounds.sw), toNaver(bounds.ne)),
        { top: padding, right: padding, bottom: padding, left: padding },
      ),
    onIdle: (callback) => {
      const listener = maps.Event.addListener(map, "idle", callback);
      listeners.add(listener);
      return () => {
        maps.Event.removeListener(listener);
        listeners.delete(listener);
      };
    },
    destroy: () => {
      for (const marker of [...markers]) marker.remove();
      for (const listener of listeners) maps.Event.removeListener(listener);
      listeners.clear();
      map.destroy();
    },
  };
  return instance;
}

export function createNaverMapProvider(
  loadOptions: LoadNaverMapsOptions = {},
): MapProvider {
  return {
    name: "naver",
    load: () => loadNaverMaps(loadOptions),
    createMap: createNaverMap,
    onAuthFailure: onNaverAuthFailure,
  };
}
