// 지도 기본값. 저장하는 값이 아니라 화면 초기 위치(서울시청 근처)일 뿐이다. 현위치는 쓰지 않는다.
import type { LatLng } from "./types";

export const DEFAULT_MAP_CENTER: LatLng = { lat: 37.5665, lng: 126.978 };
export const DEFAULT_MAP_ZOOM = 16;
