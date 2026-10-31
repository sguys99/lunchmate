// 카카오 지도 JS SDK 중 이 프로젝트가 쓰는 services(장소 검색, 주소 검색)만 최소로 선언한다.
// 이 파일의 타입은 src/lib/kakao 안에서만 쓰고, 바깥으로 내보내지 않는다.
// 출처 (2026-10-30 확인): https://apis.map.kakao.com/web/documentation/#services_Places
//   (Context7 /websites/apis_map_kakao_web) keywordSearch, categorySearch(location 필수, radius 0~20000,
//   size 1~15, page 1~45, sort DISTANCE), 콜백 (result, status, pagination), Geocoder.addressSearch
// 2026-10-31 확인(T5.12): categorySearch options의 rect(String, "좌x,좌y,우x,우y", bounds가 있으면 무시)

export interface KakaoLatLng {
  getLat(): number;
  getLng(): number;
}

export type KakaoStatus = "OK" | "ZERO_RESULT" | "ERROR";

export interface KakaoPagination {
  totalCount: number;
  hasNextPage: boolean;
  current: number;
  nextPage(): void;
}

/** Places 검색 결과 한 건(쓰는 필드만). x는 경도, y는 위도(문자열) */
export interface KakaoPlaceDoc {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  /** "음식점 > 한식 > 국밥" 형태. 카테고리 매핑은 화면 메모리에서만 한다(저장 금지) */
  category_name?: string;
  category_group_code?: string;
  /** 카카오맵 상세 링크. DB에 저장할 수 있는 카카오 값은 id와 이것뿐이다(T0.16) */
  place_url?: string;
  x: string;
  y: string;
  /** location을 준 검색에서만 채워지는 거리(m, 문자열). 없으면 빈 문자열일 수 있다 */
  distance?: string;
}

/** Geocoder.addressSearch 결과 한 건(쓰는 필드만) */
export interface KakaoAddressDoc {
  address_name: string;
  x: string;
  y: string;
  road_address?: { address_name: string; building_name?: string } | null;
}

export type KakaoPlacesCallback = (
  result: KakaoPlaceDoc[],
  status: KakaoStatus,
  pagination: KakaoPagination,
) => void;

export type KakaoPlacesOptions = {
  location?: KakaoLatLng;
  radius?: number;
  /** 사각 영역 "좌x,좌y,우x,우y"(남서 경도, 남서 위도, 북동 경도, 북동 위도). T5.12a 사분면 추가 검색 */
  rect?: string;
  size?: number;
  page?: number;
  sort?: string;
};

export interface KakaoPlaces {
  keywordSearch(
    keyword: string,
    callback: KakaoPlacesCallback,
    options?: KakaoPlacesOptions,
  ): void;
  categorySearch(
    code: string,
    callback: KakaoPlacesCallback,
    options: KakaoPlacesOptions,
  ): void;
}

export interface KakaoGeocoder {
  addressSearch(
    address: string,
    callback: (
      result: KakaoAddressDoc[],
      status: KakaoStatus,
      pagination: KakaoPagination,
    ) => void,
    options?: { size?: number },
  ): void;
}

export interface KakaoMapsApi {
  load(callback: () => void): void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  services?: {
    Places: new () => KakaoPlaces;
    Geocoder: new () => KakaoGeocoder;
    Status: Record<KakaoStatus, KakaoStatus>;
    SortBy: { ACCURACY: string; DISTANCE: string };
  };
}

declare global {
  interface Window {
    kakao?: { maps?: KakaoMapsApi };
  }
}
