// 네이버 Maps JS v3 중 이 프로젝트가 쓰는 부분만 최소로 선언한다 (공식 @types/navermaps 는 설치하지 않음).
// 이 파일의 타입은 src/lib/naver 안에서만 쓰고, 바깥으로 내보내지 않는다.

export interface NaverLatLng {
  lat(): number;
  lng(): number;
}
export interface NaverPoint {
  readonly x: number;
  readonly y: number;
}
export interface NaverLatLngBounds {
  getSW(): NaverLatLng;
  getNE(): NaverLatLng;
}
export interface NaverListener {
  readonly __brand?: "listener";
}
export interface NaverMap {
  setCenter(center: NaverLatLng): void;
  getCenter(): NaverLatLng;
  getBounds(): NaverLatLngBounds;
  setZoom(zoom: number): void;
  getZoom(): number;
  panTo(center: NaverLatLng): void;
  panBy(offset: NaverPoint): void;
  setSize(size: { width: number; height: number }): void;
  fitBounds(
    bounds: NaverLatLngBounds,
    margin?: { top: number; right: number; bottom: number; left: number },
  ): void;
  destroy(): void;
}
export interface NaverMarker {
  setPosition(position: NaverLatLng): void;
  getPosition(): NaverLatLng;
  setZIndex(zIndex: number): void;
  setMap(map: NaverMap | null): void;
}
export interface NaverCircle {
  setCenter(center: NaverLatLng): void;
  setRadius(radius: number): void;
  setMap(map: NaverMap | null): void;
}
export interface NaverCircleOptions {
  map: NaverMap;
  center: NaverLatLng;
  radius: number;
  strokeColor: string;
  strokeOpacity: number;
  strokeWeight: number;
  fillColor: string;
  fillOpacity: number;
  /** 출처: https://navermaps.github.io/maps.js.ncp/docs/naver.maps.Circle.html (StrokeStyleType) */
  strokeStyle?: "solid" | "shortdash";
  clickable: boolean;
}
/** 지도 click 이벤트 인자 중 쓰는 것 */
export interface NaverPointerEvent {
  coord: NaverLatLng;
}
export interface NaverMarkerOptions {
  position: NaverLatLng;
  map: NaverMap;
  title?: string;
  zIndex?: number;
  draggable?: boolean;
  icon: { content: string | HTMLElement; anchor?: NaverPoint };
}

export interface NaverMapsApi {
  Map: new (
    element: HTMLElement,
    options: { center: NaverLatLng; zoom: number; scaleControl?: boolean },
  ) => NaverMap;
  LatLng: new (lat: number, lng: number) => NaverLatLng;
  LatLngBounds: new (sw: NaverLatLng, ne: NaverLatLng) => NaverLatLngBounds;
  Point: new (x: number, y: number) => NaverPoint;
  Marker: new (options: NaverMarkerOptions) => NaverMarker;
  Circle: new (options: NaverCircleOptions) => NaverCircle;
  Event: {
    addListener(
      target: object,
      eventName: string,
      // 이벤트마다 인자가 다르다(click은 NaverPointerEvent). 받는 쪽에서 좁힌다
      handler: (event?: unknown) => void,
    ): NaverListener;
    removeListener(listener: NaverListener): void;
  };
}

declare global {
  interface Window {
    naver?: { maps?: NaverMapsApi };
    /** 네이버가 인증 실패 시 호출하는 전역 훅 */
    navermap_authFailure?: () => void;
  }
}
