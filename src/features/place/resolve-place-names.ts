// 장소 이름 해석 공통 모듈 (T5.12a, research-notes T0.16-2).
// DB에는 카카오 place_id와 place_url만 있다. 즐겨찾기, 기록, 피드백 요청, 투표방, 투표 결과 화면은
// 이 모듈로 이름을 그때그때 찾는다. 카카오에는 id 단건 조회 API가 없고, 비공식 엔드포인트는 쓰지 않는다.
//
// 순서
// 1. 세션 메모리: 이번 탭의 TanStack Query 캐시(KAKAO_PLACES_KEY 아래 결과)에 같은 id가 있으면 그 값
// 2. 기준점 주변 실시간 매칭: 기준점(사무실 핀, 투표방 기준점, 현위치) 반경 FD6 거리순 검색으로 id를 맞춘다.
//    45곳 상한에 닿았고 아직 못 찾은 id가 있으면 반경을 감싸는 사각형을 사분면 rect로 나눠 추가 검색한다.
//    추가 호출은 화면당(이 함수 한 번 호출당) 최대 4회. 반경 검색 1회는 추가 호출에 세지 않는다.
// 3. 미해결: 이름 없이 카카오맵 링크(저장된 place_url, 없으면 id로 만든 링크). 화면은 copy/place.ts 문구를 쓴다.
//
// 데이터 규칙 (CLAUDE.md 7장)
// - 결과는 저장하지 않는다. 부르는 쪽은 세션 메모리에만 둔다(use-place-names.ts).
// - 기준점 좌표, 장소명은 분석 이벤트, 로그로 보내지 않는다. 미해결 비율은 summarizeResolution의 개수만 쓴다.
// - 카카오 호출이 실패해도 던지지 않는다. 못 찾은 곳은 미해결로 돌려 화면이 대체 표시를 하게 한다.
import type { QueryClient } from "@tanstack/react-query";
import { searchRadiusFromWalkMinutes } from "@/lib/format";
import {
  kakaoPlaceUrl,
  type KakaoRestaurant,
  type KakaoRestaurantsResult,
} from "@/lib/kakao/local";
import {
  KAKAO_PLACES_KEY,
  restaurantsInRadiusQuery,
  restaurantsInRectQuery,
} from "@/lib/kakao/queries";
import type { Bounds, LatLng } from "@/lib/map/types";

/** DB에서 온 장소 참조. 카카오 값은 이 둘뿐이다 */
export type PlaceRef = {
  readonly placeId: string;
  readonly placeUrl?: string | null;
};

export type ResolvedPlace =
  | {
      readonly placeId: string;
      readonly status: "resolved";
      readonly via: "memory" | "nearby";
      readonly place: KakaoRestaurant;
      readonly placeUrl: string;
    }
  | {
      readonly placeId: string;
      readonly status: "unresolved";
      readonly placeUrl: string;
    };

/** 이름 해석 집계. 개수만 담는다(좌표, id, 이름 없음). 미해결 비율 확인용 */
export type ResolveStats = {
  readonly total: number;
  readonly fromMemory: number;
  readonly fromNearby: number;
  readonly unresolved: number;
  /** 사분면 추가 호출 수(0~4) */
  readonly extraCalls: number;
  /** 카카오 호출이 한 번이라도 실패했는지 */
  readonly searchFailed: boolean;
};

export type ResolveResult = {
  /** 입력 순서 그대로(중복 id는 첫 항목 기준으로 한 번만) */
  readonly places: readonly ResolvedPlace[];
  readonly stats: ResolveStats;
};

/** 화면당 사분면 추가 호출 상한 (T0.16-2) */
export const MAX_EXTRA_CALLS = 4;
/** 기준점 기본 반경: 허용 도보 최대(20분) 반경. 즐겨찾기, 기록은 대부분 이 안이다 */
export const DEFAULT_RESOLVE_RADIUS = searchRadiusFromWalkMinutes(20);

export type ResolveDeps = {
  /** 1단계: 세션 메모리에서 id로 찾기 */
  lookupMemory: (placeId: string) => KakaoRestaurant | undefined;
  /** 2단계: 기준점 반경 검색 */
  searchRadius: (
    center: LatLng,
    radius: number,
  ) => Promise<KakaoRestaurantsResult>;
  /** 2단계 보완: 사각 영역 검색 */
  searchRect: (
    bounds: Bounds,
    sortFrom: LatLng,
  ) => Promise<KakaoRestaurantsResult>;
};

export type ResolveOptions = {
  /** 기준점. 없으면 2단계를 건너뛴다(세션 메모리 + 미해결만) */
  anchor: LatLng | null;
  radius?: number;
  maxExtraCalls?: number;
};

const KAKAO_PLACE_URL = /^https?:\/\/place\.map\.kakao\.com\/\d+\/?$/;

/**
 * 카카오맵 링크. 저장된 place_url이 카카오맵 상세 주소일 때만 그대로 쓰고, 아니면 id로 만든다.
 * DB 값이 엉뚱한 주소여도 외부 사이트로 보내지 않기 위함이다.
 */
export function placeLinkFor(ref: PlaceRef): string {
  const url = ref.placeUrl?.trim();
  if (url && KAKAO_PLACE_URL.test(url)) return url.replace(/^http:/, "https:");
  return kakaoPlaceUrl(ref.placeId);
}

const METERS_PER_DEG_LAT = 111_320;

/** 기준점 반경을 감싸는 정사각형을 북동, 북서, 남서, 남동 사분면으로 나눈다 */
export function quadrantBounds(center: LatLng, radius: number): Bounds[] {
  const dLat = radius / METERS_PER_DEG_LAT;
  const dLng =
    radius / (METERS_PER_DEG_LAT * Math.cos((center.lat * Math.PI) / 180));
  const { lat, lng } = center;
  return [
    { sw: { lat, lng }, ne: { lat: lat + dLat, lng: lng + dLng } },
    { sw: { lat, lng: lng - dLng }, ne: { lat: lat + dLat, lng } },
    { sw: { lat: lat - dLat, lng: lng - dLng }, ne: { lat, lng } },
    { sw: { lat: lat - dLat, lng }, ne: { lat, lng: lng + dLng } },
  ];
}

function uniqueRefs(refs: readonly PlaceRef[]): PlaceRef[] {
  const seen = new Set<string>();
  const out: PlaceRef[] = [];
  for (const ref of refs) {
    if (!ref.placeId || seen.has(ref.placeId)) continue;
    seen.add(ref.placeId);
    out.push(ref);
  }
  return out;
}

/** place_id 목록의 이름을 세 단계로 찾는다. 저장하지 않고 던지지 않는다 */
export async function resolvePlaceNames(
  refs: readonly PlaceRef[],
  deps: ResolveDeps,
  options: ResolveOptions,
): Promise<ResolveResult> {
  const list = uniqueRefs(refs);
  const found = new Map<
    string,
    { via: "memory" | "nearby"; place: KakaoRestaurant }
  >();

  for (const ref of list) {
    const hit = deps.lookupMemory(ref.placeId);
    if (hit) found.set(ref.placeId, { via: "memory", place: hit });
  }
  const fromMemory = found.size;

  const pending = () => list.filter((r) => !found.has(r.placeId));
  const absorb = (result: KakaoRestaurantsResult) => {
    const wanted = new Set(pending().map((r) => r.placeId));
    for (const place of result.places) {
      if (wanted.has(place.id)) found.set(place.id, { via: "nearby", place });
    }
  };

  let extraCalls = 0;
  let searchFailed = false;
  const { anchor } = options;
  if (anchor && pending().length > 0) {
    const radius = options.radius ?? DEFAULT_RESOLVE_RADIUS;
    const maxExtra = Math.max(
      0,
      Math.min(options.maxExtraCalls ?? MAX_EXTRA_CALLS, MAX_EXTRA_CALLS),
    );
    let capped = false;
    try {
      const base = await deps.searchRadius(anchor, radius);
      absorb(base);
      capped = base.capped;
    } catch {
      searchFailed = true;
    }
    // 반경 검색이 45곳 상한에 닿았을 때만 사분면을 더 본다(상한 밖이면 반경 안에 그 id가 없다는 뜻)
    if (capped) {
      for (const bounds of quadrantBounds(anchor, radius)) {
        if (pending().length === 0 || extraCalls >= maxExtra) break;
        extraCalls += 1;
        try {
          absorb(await deps.searchRect(bounds, anchor));
        } catch {
          searchFailed = true;
          break;
        }
      }
    }
  }

  const places: ResolvedPlace[] = list.map((ref) => {
    const hit = found.get(ref.placeId);
    if (!hit)
      return {
        placeId: ref.placeId,
        status: "unresolved",
        placeUrl: placeLinkFor(ref),
      };
    return {
      placeId: ref.placeId,
      status: "resolved",
      via: hit.via,
      place: hit.place,
      // 저장된 링크가 있으면 그것, 없으면 방금 받은 카카오 링크
      placeUrl: ref.placeUrl ? placeLinkFor(ref) : hit.place.placeUrl,
    };
  });

  return {
    places,
    stats: {
      total: list.length,
      fromMemory,
      fromNearby: found.size - fromMemory,
      unresolved: list.length - found.size,
      extraCalls,
      searchFailed,
    },
  };
}

/** 여러 번의 해석 결과를 합친 개수와 미해결 비율(0~1). 좌표, id, 이름은 담지 않는다 */
export function summarizeResolution(stats: readonly ResolveStats[]): {
  total: number;
  unresolved: number;
  unresolvedRate: number;
  extraCalls: number;
} {
  const total = stats.reduce((n, s) => n + s.total, 0);
  const unresolved = stats.reduce((n, s) => n + s.unresolved, 0);
  const extraCalls = stats.reduce((n, s) => n + s.extraCalls, 0);
  return {
    total,
    unresolved,
    unresolvedRate: total === 0 ? 0 : unresolved / total,
    extraCalls,
  };
}

/** 세션 메모리(QueryClient)에서 이름이 들어 있는 카카오 결과를 id로 찾는 함수를 만든다 */
export function memoryLookup(
  client: QueryClient,
): (placeId: string) => KakaoRestaurant | undefined {
  let index: Map<string, KakaoRestaurant> | undefined;
  return (placeId) => {
    if (!index) {
      index = new Map();
      for (const [, data] of client.getQueriesData<KakaoRestaurantsResult>({
        queryKey: KAKAO_PLACES_KEY,
      })) {
        for (const place of data?.places ?? []) {
          if (!index.has(place.id)) index.set(place.id, place);
        }
      }
    }
    return index.get(placeId);
  };
}

/**
 * 실제 화면용 의존성: 세션 메모리 조회 + 카카오 래퍼 호출을 QueryClient로 묶는다.
 * fetchQuery라 같은 기준점 검색은 다른 화면과 캐시를 나누고(세션 메모리만), 결과는 다음 1단계 조회에도 쓰인다.
 */
export function queryClientDeps(client: QueryClient): ResolveDeps {
  return {
    lookupMemory: memoryLookup(client),
    searchRadius: (center, radius) =>
      client.fetchQuery(restaurantsInRadiusQuery(center, radius)),
    searchRect: (bounds, sortFrom) =>
      client.fetchQuery(restaurantsInRectQuery(bounds, sortFrom)),
  };
}
