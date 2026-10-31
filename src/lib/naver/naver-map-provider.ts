// MapProvider 의 네이버 구현체 (T0.34). 네이버 고유 타입은 이 파일 안에서만 쓴다.
import type {
  Bounds,
  CircleHandle,
  CircleOptions,
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
import type {
  NaverLatLng,
  NaverListener,
  NaverMap,
  NaverPointerEvent,
} from "./naver-maps-types";

const fromNaver = (p: NaverLatLng): LatLng => ({ lat: p.lat(), lng: p.lng() });

function isPointerEvent(e: unknown): e is NaverPointerEvent {
  return (
    typeof e === "object" &&
    e !== null &&
    "coord" in e &&
    typeof (e as { coord?: { lat?: unknown } }).coord?.lat === "function"
  );
}

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
  const listen = (
    target: object,
    eventName: string,
    handler: (event?: unknown) => void,
  ): NaverListener => {
    const listener = maps.Event.addListener(target, eventName, handler);
    listeners.add(listener);
    return listener;
  };
  const unlisten = (listener: NaverListener) => {
    maps.Event.removeListener(listener);
    listeners.delete(listener);
  };

  const instance: MapInstance = {
    setCenter: (center) => map.setCenter(toNaver(center)),
    getCenter: () => fromNaver(map.getCenter()),
    setZoom: (zoom) => map.setZoom(zoom),
    getZoom: () => map.getZoom(),
    panTo: (center) => map.panTo(toNaver(center)),
    panBy: ({ x, y }) => map.panBy(new maps.Point(x, y)),
    // 출처: https://navermaps.github.io/maps.js.ncp/docs/naver.maps.Map.html#setSize
    //   (size를 주지 않으면 생성 시점 요소 크기에 고정되고 setSize 전까지 바뀌지 않는다)
    setSize: (size) => {
      const center = map.getCenter();
      map.setSize(size);
      map.setCenter(center);
    },
    addMarker: (opts: MarkerOptions): MarkerHandle => {
      const marker = new maps.Marker({
        position: toNaver(opts.position),
        map,
        title: opts.title,
        zIndex: opts.zIndex,
        draggable: opts.draggable ?? false,
        icon: {
          content: opts.content,
          anchor: opts.anchor && new maps.Point(opts.anchor.x, opts.anchor.y),
        },
      });
      const own: NaverListener[] = [];
      if (opts.onClick) own.push(listen(marker, "click", opts.onClick));
      if (opts.onDragStart)
        own.push(listen(marker, "dragstart", opts.onDragStart));
      const onDragEnd = opts.onDragEnd;
      if (onDragEnd)
        own.push(
          listen(marker, "dragend", () =>
            onDragEnd(fromNaver(marker.getPosition())),
          ),
        );
      const handle = {
        setPosition: (position: LatLng) =>
          marker.setPosition(toNaver(position)),
        setZIndex: (zIndex: number) => marker.setZIndex(zIndex),
        remove: () => {
          for (const l of own) unlisten(l);
          marker.setMap(null);
          markers.delete(handle);
        },
      };
      markers.add(handle);
      return handle;
    },
    addCircle: (opts: CircleOptions): CircleHandle => {
      const circle = new maps.Circle({
        map,
        center: toNaver(opts.center),
        radius: opts.radius,
        strokeColor: opts.strokeColor,
        strokeOpacity: opts.strokeOpacity ?? 1,
        strokeWeight: opts.strokeWeight ?? 1.5,
        fillColor: opts.fillColor,
        fillOpacity: opts.fillOpacity ?? 0.08,
        strokeStyle: opts.strokeStyle === "dash" ? "shortdash" : "solid",
        clickable: false,
      });
      const handle = {
        setCenter: (center: LatLng) => circle.setCenter(toNaver(center)),
        setRadius: (radius: number) => circle.setRadius(radius),
        remove: () => {
          circle.setMap(null);
          markers.delete(handle);
        },
      };
      markers.add(handle);
      return handle;
    },
    onClick: (callback) => {
      const listener = listen(map, "click", (e) => {
        if (isPointerEvent(e)) callback(fromNaver(e.coord));
      });
      return () => unlisten(listener);
    },
    fitBounds: (bounds: Bounds, padding = 0) =>
      map.fitBounds(
        new maps.LatLngBounds(toNaver(bounds.sw), toNaver(bounds.ne)),
        { top: padding, right: padding, bottom: padding, left: padding },
      ),
    getBounds: () => {
      const b = map.getBounds();
      return { sw: fromNaver(b.getSW()), ne: fromNaver(b.getNE()) };
    },
    onIdle: (callback) => {
      const listener = listen(map, "idle", callback);
      return () => unlisten(listener);
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
