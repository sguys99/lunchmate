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
};

export interface MarkerHandle {
  setPosition(position: LatLng): void;
  remove(): void;
}

export type Unsubscribe = () => void;

export interface MapInstance {
  setCenter(center: LatLng): void;
  getCenter(): LatLng;
  setZoom(zoom: number): void;
  addMarker(options: MarkerOptions): MarkerHandle;
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
