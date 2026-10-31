// 지도 공급자 독립 인터페이스 (T0.34). 네이버, 카카오 등 구현체가 바뀌어도 화면 코드는 이 파일의 타입만 쓴다.
// 규칙: 공급자 고유 타입(naver.maps.*, kakao.maps.*)은 이 인터페이스로 새어 나오면 안 된다.

export type LatLng = { lat: number; lng: number };

/** 남서(sw), 북동(ne) 모서리로 정의하는 사각형 영역 */
export type Bounds = { sw: LatLng; ne: LatLng };

export type MapOptions = {
  center: LatLng;
  zoom: number;
};

export type MarkerOptions = {
  position: LatLng;
  /**
   * 마커 본체. HTML 문자열이나 DOM 요소를 받는다(카테고리 아이콘 마커는 T5.27).
   * 문자열은 그대로 innerHTML 로 들어가므로 사용자 입력을 섞지 않는다. 신뢰할 수 없는 값은 DOM 요소로 만든다.
   */
  content: string | HTMLElement;
  /** content 안에서 좌표에 맞출 지점(px). 기본은 content 의 가운데 아래 */
  anchor?: { x: number; y: number };
  /** 접근성용 제목(툴팁) */
  title?: string;
  zIndex?: number;
  onClick?: () => void;
  /** true면 사용자가 마커를 끌어 옮길 수 있다 */
  draggable?: boolean;
  /** 끌기 시작(사용자 조작) */
  onDragStart?: () => void;
  /** 끌기 끝(사용자 조작). 놓인 좌표를 넘긴다 */
  onDragEnd?: (position: LatLng) => void;
};

export interface MarkerHandle {
  setPosition(position: LatLng): void;
  /** 겹칠 때 쌓임 순서. 고른 마커를 이웃보다 위로 올린다(T5.27) */
  setZIndex(zIndex: number): void;
  remove(): void;
}

export type Unsubscribe = () => void;

/** 지도 위 원(반경 표시). 색은 호출하는 쪽이 디자인 토큰에서 읽어 넘긴다(하드코딩 금지) */
export type CircleOptions = {
  center: LatLng;
  /** 반지름(m) */
  radius: number;
  strokeColor: string;
  fillColor: string;
  strokeOpacity?: number;
  fillOpacity?: number;
  strokeWeight?: number;
  /** 선 모양. 기본 solid. dash는 짧은 점선(도보 반경 원) */
  strokeStyle?: "solid" | "dash";
};

export interface CircleHandle {
  setCenter(center: LatLng): void;
  setRadius(radius: number): void;
  remove(): void;
}

export interface MapInstance {
  setCenter(center: LatLng): void;
  getCenter(): LatLng;
  setZoom(zoom: number): void;
  /** 지금 확대 단계(맞춤 계산, 지도 탭) */
  getZoom(): number;
  /** 부드럽게 이동한다(공급자가 지원하면 애니메이션) */
  panTo(center: LatLng): void;
  /** 지도 요소 크기가 바뀌었을 때 알린다(네이버는 생성 시 크기에 고정된다). 중심은 유지한다 */
  setSize(size: { width: number; height: number }): void;
  /** 화면 px만큼 옮긴다(방향키 조작) */
  panBy(offset: { x: number; y: number }): void;
  addMarker(options: MarkerOptions): MarkerHandle;
  addCircle(options: CircleOptions): CircleHandle;
  /**
   * 사용자가 지도를 눌렀을 때(끌기 제외) 그 지점 좌표로 호출된다.
   * 사용자 조작에서만 불린다. 코드가 setCenter, panTo를 불러도 호출되지 않는다.
   */
  onClick(callback: (position: LatLng) => void): Unsubscribe;
  /** 지금 보이는 영역(남서, 북동). 화면 px 거리 계산(클러스터, T5.27)에 쓴다 */
  getBounds(): Bounds;
  /** 영역이 모두 보이도록 맞춘다. padding 은 네 방향 여백(px) */
  fitBounds(bounds: Bounds, padding?: number): void;
  /** 지도 이동, 확대가 멈출 때마다 호출된다 */
  onIdle(callback: () => void): Unsubscribe;
  /** 마커, 리스너, DOM 을 정리한다. 이후 인스턴스는 쓰지 않는다 */
  destroy(): void;
}

export interface MapProvider {
  /** 로그, 분석 구분용 이름 (예: "naver") */
  readonly name: string;
  /** SDK 를 불러온다. 여러 번 불러도 한 번만 로드한다. 실패 시 errors.ts 의 오류를 던진다 */
  load(): Promise<void>;
  /** load() 가 끝난 뒤에만 호출한다 */
  createMap(element: HTMLElement, options: MapOptions): MapInstance;
  /**
   * 인증 실패 알림 구독. 인증은 스크립트 로드 뒤에 비동기로 실패할 수 있다.
   * 이미 실패한 상태라면 구독 즉시 호출한다.
   */
  onAuthFailure(callback: () => void): Unsubscribe;
}
