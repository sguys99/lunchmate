// 카카오 로컬(장소, 주소) 검색 래퍼 (T4.16, T4.17, T5.12 FD6 반경, 사각 영역 검색). 화면은 카카오 SDK를 직접 부르지 않고 이 함수만 쓴다(CLAUDE.md 9장).
//
// 데이터 규칙 (CLAUDE.md 7장, T0.16)
// - 결과(장소명, 주소, 좌표)는 저장하지 않는다. 부르는 쪽은 TanStack Query 세션 메모리에만 둔다.
//   localStorage, DB, 서버 캐시, 서비스 워커 캐시 금지.
// - 위치 검색 결과 좌표는 지도 이동에만 쓴다. 사무실 저장 값은 사용자가 놓은 핀뿐이다(features/onboarding/pin.ts).
// - 실패하면 1회 재시도하고, 그래도 실패하면 KakaoSearchError를 던진다(화면이 다음 행동을 안내).
import type { Bounds, LatLng } from "@/lib/map/types";
import type {
  KakaoAddressDoc,
  KakaoPagination,
  KakaoPlaceDoc,
  KakaoStatus,
} from "./kakao-types";
import { getKakaoMapsApi, loadKakaoSdk } from "./sdk-loader";

export class KakaoSearchError extends Error {
  constructor(message = "카카오 검색에 실패했습니다.") {
    super(message);
    this.name = "KakaoSearchError";
  }
}

/** 위치 검색 결과(지도 이동용). 저장하지 않는다 */
export type LocalSearchResult = {
  /** 목록 key. 카카오 장소 id 또는 주소 */
  readonly key: string;
  readonly name: string;
  readonly address: string;
  readonly position: LatLng;
};

/** 근처 음식점(개수와 점 표시용). 이름은 담지 않는다 */
export type NearbyRestaurant = {
  readonly id: string;
  readonly position: LatLng;
  /** 기준점에서 직선거리(m) */
  readonly distance: number;
};

/**
 * 음식점 한 곳의 화면용 정보 (T5.12). 세션 메모리 전용: DB, localStorage, 서버 캐시, 분석 이벤트에 넣지 않는다.
 * 저장할 수 있는 값은 id와 placeUrl뿐이다(CLAUDE.md 7장).
 */
export type KakaoRestaurant = {
  readonly id: string;
  readonly name: string;
  /** 카카오 원문 카테고리("음식점 > 한식 > 국밥"). 앱 카테고리 매핑은 features/place */
  readonly categoryName: string;
  readonly address: string;
  readonly position: LatLng;
  /** 검색 기준점에서 직선거리(m). 카카오가 주지 않으면 null */
  readonly distance: number | null;
  /** 카카오맵 상세 링크 */
  readonly placeUrl: string;
};

export type KakaoRestaurantsResult = {
  readonly places: readonly KakaoRestaurant[];
  readonly capped: boolean;
};

/** 카카오맵 장소 상세 링크. 저장된 place_url이 없을 때 id로 만든다(T0.16-2) */
export function kakaoPlaceUrl(id: string): string {
  return `https://place.map.kakao.com/${encodeURIComponent(id)}`;
}

/** 카카오 검색 상한: 한 페이지 15건 x 3페이지 */
export const KAKAO_PAGE_SIZE = 15;
export const KAKAO_MAX_PAGES = 3;
export const KAKAO_RESULT_CAP = KAKAO_PAGE_SIZE * KAKAO_MAX_PAGES;
/** 위치 검색 결과는 최대 3개(3개 이하 원칙) */
export const LOCATION_RESULT_LIMIT = 3;
/** 카카오 반경 상한(m) */
export const KAKAO_MAX_RADIUS = 20_000;
/** 음식점 카테고리 그룹 코드 */
export const FOOD_CATEGORY = "FD6";

function toPosition(x: string, y: string): LatLng | null {
  const lng = Number(x);
  const lat = Number(y);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

export function fromPlaceDoc(doc: KakaoPlaceDoc): LocalSearchResult | null {
  const position = toPosition(doc.x, doc.y);
  if (!position || !doc.place_name) return null;
  return {
    key: `p:${doc.id}`,
    name: doc.place_name,
    address: doc.road_address_name || doc.address_name,
    position,
  };
}

export function fromAddressDoc(doc: KakaoAddressDoc): LocalSearchResult | null {
  const position = toPosition(doc.x, doc.y);
  if (!position || !doc.address_name) return null;
  const road = doc.road_address;
  const name =
    road?.building_name?.trim() || road?.address_name || doc.address_name;
  return {
    key: `a:${doc.address_name}`,
    name,
    address: road?.address_name || doc.address_name,
    position,
  };
}

/** 주소 결과를 앞에, 같은 지점(약 10m 안)은 하나만, 최대 3개 */
export function mergeLocationResults(
  addresses: readonly (LocalSearchResult | null)[],
  places: readonly (LocalSearchResult | null)[],
  limit = LOCATION_RESULT_LIMIT,
): LocalSearchResult[] {
  const out: LocalSearchResult[] = [];
  const near = (a: LatLng, b: LatLng) =>
    Math.abs(a.lat - b.lat) < 0.0001 && Math.abs(a.lng - b.lng) < 0.0001;
  for (const r of [...addresses, ...places]) {
    if (!r) continue;
    if (out.some((o) => o.key === r.key || near(o.position, r.position)))
      continue;
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}

export function fromNearbyDoc(doc: KakaoPlaceDoc): NearbyRestaurant | null {
  const position = toPosition(doc.x, doc.y);
  const distance = Number(doc.distance);
  if (!position || !doc.id || !Number.isFinite(distance)) return null;
  return { id: doc.id, position, distance };
}

export function fromRestaurantDoc(doc: KakaoPlaceDoc): KakaoRestaurant | null {
  const position = toPosition(doc.x, doc.y);
  if (!position || !doc.id || !doc.place_name) return null;
  const d = doc.distance ? Number(doc.distance) : Number.NaN;
  return {
    id: doc.id,
    name: doc.place_name,
    categoryName: doc.category_name ?? "",
    address: doc.road_address_name || doc.address_name,
    position,
    distance: Number.isFinite(d) ? d : null,
    placeUrl: doc.place_url || kakaoPlaceUrl(doc.id),
  };
}

async function withRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch {
    return run();
  }
}

function settle<T>(
  status: KakaoStatus,
  result: T[],
  resolve: (v: T[]) => void,
  reject: (e: Error) => void,
) {
  if (status === "OK") resolve(result);
  else if (status === "ZERO_RESULT") resolve([]);
  else reject(new KakaoSearchError());
}

function keywordOnce(query: string): Promise<KakaoPlaceDoc[]> {
  const api = getKakaoMapsApi();
  const places = new api.services!.Places();
  return new Promise((resolve, reject) =>
    places.keywordSearch(
      query,
      (result, status) => settle(status, result, resolve, reject),
      { size: 5 },
    ),
  );
}

function addressOnce(query: string): Promise<KakaoAddressDoc[]> {
  const api = getKakaoMapsApi();
  const geocoder = new api.services!.Geocoder();
  return new Promise((resolve, reject) =>
    geocoder.addressSearch(
      query,
      (result, status) => settle(status, result, resolve, reject),
      { size: 3 },
    ),
  );
}

/**
 * 회사 주소나 건물명 검색(주소 검색 + 키워드 검색). 결과는 지도 이동에만 쓴다.
 * 둘 중 하나만 실패하면 나머지로 보여 주고, 둘 다 실패하면 던진다.
 */
export async function searchLocation(
  query: string,
): Promise<LocalSearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  await loadKakaoSdk();
  const [addr, kw] = await Promise.allSettled([
    withRetry(() => addressOnce(q)),
    withRetry(() => keywordOnce(q)),
  ]);
  if (addr.status === "rejected" && kw.status === "rejected")
    throw new KakaoSearchError();
  return mergeLocationResults(
    addr.status === "fulfilled" ? addr.value.map(fromAddressDoc) : [],
    kw.status === "fulfilled" ? kw.value.map(fromPlaceDoc) : [],
  );
}

/** 반경 검색(기준점 + 반경) 또는 사각 영역 검색(rect). 둘 다 기준점에서 가까운 순 */
type CategoryArea =
  | { kind: "radius"; center: LatLng; radius: number }
  | { kind: "rect"; bounds: Bounds; sortFrom: LatLng };

/** 카카오 rect 문자열: 좌x,좌y,우x,우y = 남서 경도, 남서 위도, 북동 경도, 북동 위도 */
export function toKakaoRect(bounds: Bounds): string {
  const { sw, ne } = bounds;
  return [sw.lng, sw.lat, ne.lng, ne.lat].map((n) => n.toFixed(6)).join(",");
}

function categoryPages(
  area: CategoryArea,
): Promise<{ docs: KakaoPlaceDoc[]; total: number }> {
  const api = getKakaoMapsApi();
  const services = api.services!;
  const places = new services.Places();
  return new Promise((resolve, reject) => {
    const docs: KakaoPlaceDoc[] = [];
    const callback = (
      result: KakaoPlaceDoc[],
      status: KakaoStatus,
      pagination: KakaoPagination,
    ) => {
      if (status === "ZERO_RESULT") {
        resolve({ docs, total: docs.length });
        return;
      }
      if (status !== "OK") {
        reject(new KakaoSearchError());
        return;
      }
      docs.push(...result);
      if (pagination.hasNextPage && pagination.current < KAKAO_MAX_PAGES) {
        pagination.nextPage();
        return;
      }
      resolve({ docs, total: pagination.totalCount });
    };
    const base = {
      sort: services.SortBy.DISTANCE,
      size: KAKAO_PAGE_SIZE,
    };
    places.categorySearch(
      FOOD_CATEGORY,
      callback,
      area.kind === "radius"
        ? {
            ...base,
            location: new api.LatLng(area.center.lat, area.center.lng),
            radius: clampRadius(area.radius),
          }
        : {
            ...base,
            // 거리순 정렬의 기준점. 반경 필터는 기본값(5km)이라 사분면(최대 약 1.5km)을 자르지 않는다
            location: new api.LatLng(area.sortFrom.lat, area.sortFrom.lng),
            rect: toKakaoRect(area.bounds),
          },
    );
  });
}

function clampRadius(radius: number): number {
  return Math.min(KAKAO_MAX_RADIUS, Math.max(0, Math.round(radius)));
}

async function searchArea(
  area: CategoryArea,
): Promise<{ docs: KakaoPlaceDoc[]; capped: boolean }> {
  await loadKakaoSdk();
  const { docs, total } = await withRetry(() => categoryPages(area));
  return { docs, capped: total >= KAKAO_RESULT_CAP };
}

function toRestaurants(docs: readonly KakaoPlaceDoc[]): KakaoRestaurant[] {
  const out: KakaoRestaurant[] = [];
  const seen = new Set<string>();
  for (const doc of docs) {
    const r = fromRestaurantDoc(doc);
    if (!r || seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out;
}

/**
 * 기준점 둘레 반경 안 음식점(FD6) 전체 정보, 가까운 순 최대 45곳 (T5.12).
 * 추천 후보, 지도, 장소 이름 해석(T5.12a)이 쓴다. 결과는 세션 메모리(TanStack Query)에만 둔다.
 * capped: 카카오 상한(45곳)에 닿아 실제로는 더 있을 수 있음.
 */
export async function searchRestaurants(
  center: LatLng,
  radius: number,
): Promise<KakaoRestaurantsResult> {
  const { docs, capped } = await searchArea({ kind: "radius", center, radius });
  return { places: toRestaurants(docs), capped };
}

/**
 * 사각 영역 안 음식점(FD6), sortFrom에서 가까운 순 최대 45곳 (T5.12a 사분면 추가 검색).
 * distance는 sortFrom 기준이다.
 */
export async function searchRestaurantsInRect(
  bounds: Bounds,
  sortFrom: LatLng,
): Promise<KakaoRestaurantsResult> {
  const { docs, capped } = await searchArea({
    kind: "rect",
    bounds,
    sortFrom,
  });
  return { places: toRestaurants(docs), capped };
}

/**
 * 기준점 둘레 반경 안 음식점(FD6), 가까운 순 최대 45곳. 개수와 점 표시용이라 이름을 담지 않는다(온보딩 T4.16).
 * capped: 카카오 상한(45곳)에 닿아 실제로는 더 있을 수 있음.
 */
export async function nearbyRestaurants(
  center: LatLng,
  radius: number,
): Promise<{ places: NearbyRestaurant[]; capped: boolean }> {
  const { docs, capped } = await searchArea({ kind: "radius", center, radius });
  const places = docs
    .map(fromNearbyDoc)
    .filter((p): p is NearbyRestaurant => p !== null);
  return { places, capped };
}
