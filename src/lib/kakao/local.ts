// 카카오 로컬(장소, 주소) 검색 래퍼 (T4.16, T4.17). 화면은 카카오 SDK를 직접 부르지 않고 이 함수만 쓴다(CLAUDE.md 9장).
//
// 데이터 규칙 (CLAUDE.md 7장, T0.16)
// - 결과(장소명, 주소, 좌표)는 저장하지 않는다. 부르는 쪽은 TanStack Query 세션 메모리에만 둔다.
//   localStorage, DB, 서버 캐시, 서비스 워커 캐시 금지.
// - 위치 검색 결과 좌표는 지도 이동에만 쓴다. 사무실 저장 값은 사용자가 놓은 핀뿐이다(features/onboarding/pin.ts).
// - 실패하면 1회 재시도하고, 그래도 실패하면 KakaoSearchError를 던진다(화면이 다음 행동을 안내).
import type { LatLng } from "@/lib/map/types";
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

/** 카카오 검색 상한: 한 페이지 15건 x 3페이지 */
export const KAKAO_PAGE_SIZE = 15;
export const KAKAO_MAX_PAGES = 3;
export const KAKAO_RESULT_CAP = KAKAO_PAGE_SIZE * KAKAO_MAX_PAGES;
/** 위치 검색 결과는 최대 3개(3개 이하 원칙) */
export const LOCATION_RESULT_LIMIT = 3;
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

function categoryPages(
  center: LatLng,
  radius: number,
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
    places.categorySearch(FOOD_CATEGORY, callback, {
      location: new api.LatLng(center.lat, center.lng),
      radius: Math.min(20_000, Math.max(0, Math.round(radius))),
      sort: services.SortBy.DISTANCE,
      size: KAKAO_PAGE_SIZE,
    });
  });
}

/**
 * 기준점 둘레 반경 안 음식점(FD6), 가까운 순 최대 45곳.
 * capped: 카카오 상한(45곳)에 닿아 실제로는 더 있을 수 있음.
 */
export async function nearbyRestaurants(
  center: LatLng,
  radius: number,
): Promise<{ places: NearbyRestaurant[]; capped: boolean }> {
  await loadKakaoSdk();
  const { docs, total } = await withRetry(() => categoryPages(center, radius));
  const places = docs
    .map(fromNearbyDoc)
    .filter((p): p is NearbyRestaurant => p !== null);
  return { places, capped: total >= KAKAO_RESULT_CAP };
}
