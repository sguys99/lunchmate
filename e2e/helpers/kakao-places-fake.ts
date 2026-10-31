// 가짜 카카오 음식점 검색 (T5.40, T5.41). 오늘(홈) 추천과 지도 E2E가 같이 쓴다.
// 카카오 JS 키는 도메인 제한이 걸려 있어 E2E(localhost 임의 포트)에서는 실제 SDK가 인증에 실패한다.
// 그래서 sdk.js 요청을 가로채 이 스크립트로 응답한다. 응답 모양은 src/lib/kakao/kakao-types.ts(KakaoPlaceDoc, 페이지 15건 x 3).
//
// - 음식점 N곳(기본 45, 카카오 상한)을 검색 기준점 둘레에 만든다. 거리는 30m부터 고르게 늘려 도보 10분 반경(515m) 안에 둔다.
// - 업종은 여러 대분류를 돌려 쓴다(다양성 규칙이 같은 카테고리 최대 2장이라 고르게 섞어야 묶음이 나온다).
//   점심에 빠질 수 있는 술집, 카페는 넣지 않는다.
// - 응답 지연: SDK 스크립트 지연(sdkDelayMs, 라우트에서 기다림)과 검색 콜백 지연(searchDelayMs, 페이지마다)을 따로 준다.
//   Playwright가 가로채 채운 응답에는 CDP 네트워크 스로틀이 걸리지 않으므로, 성능 측정(T5.41)은 이 값으로 현실 지연을 넣는다.
// - 네이버 지도는 map-sdk-mocks.ts의 가짜를 그대로 쓴다(데스크톱 /today 오른쪽 지도). 라우트는 나중에 등록한 것이 먼저라
//   mockMapSdks 다음에 카카오만 덮어쓴다.
// 장소 id는 숫자 문자열이다(visits.place_id 형식 검사 ^[0-9]{1,20}$).
import type { Page } from "@playwright/test";
import { mockMapSdks } from "./map-sdk-mocks";

export type FakeKakaoOptions = {
  /** 음식점 수. 기본 45(카카오 상한 15 x 3페이지) */
  count?: number;
  /** sdk.js 응답 지연(ms) */
  sdkDelayMs?: number;
  /** 검색 콜백 지연(ms). [최소, 최대]면 페이지마다 그 사이 값(결정적) */
  searchDelayMs?: number | readonly [number, number];
};

const CATEGORIES = [
  "음식점 > 한식 > 국밥",
  "음식점 > 중식 > 중화요리",
  "음식점 > 일식 > 초밥,롤",
  "음식점 > 양식 > 이탈리안",
  "음식점 > 분식",
  "음식점 > 아시아음식 > 베트남음식",
  "음식점 > 패스트푸드 > 햄버거",
  "음식점 > 샐러드",
  "음식점 > 한식 > 육류,고기 > 삼겹살",
  "음식점 > 한식 > 한정식",
] as const;

/** 가짜 장소 id. i번째 곳 */
export function fakePlaceId(i: number): string {
  return String(9_100_000 + i);
}

function fakeScript(count: number, delay: readonly [number, number]): string {
  const config = JSON.stringify({ count, delay, categories: CATEGORIES });
  return `(function () {
  var C = ${config};
  var DEG_PER_M = 1 / 111320;
  function LatLng(lat, lng) { this.getLat = function () { return lat; }; this.getLng = function () { return lng; }; }
  var calls = 0;
  function wait() {
    var lo = C.delay[0], hi = C.delay[1];
    calls += 1;
    return lo + ((calls * 37) % (hi - lo + 1));
  }
  function docsAround(lat, lng) {
    var out = [];
    for (var i = 0; i < C.count; i++) {
      var d = 30 + Math.round((i * 470) / Math.max(1, C.count - 1));
      var a = ((i * 137.5 + 11) * Math.PI) / 180; // 11도 틀어 기준점과 위도, 경도가 0.00005도 이상 떨어지게(45곳 기준)
      var dy = d * Math.cos(a) * DEG_PER_M, dx = (d * Math.sin(a) * DEG_PER_M) / Math.cos((lat * Math.PI) / 180);
      var id = String(${9_100_000} + i);
      out.push({ id: id, place_name: "테스트식당" + (i + 1), category_name: C.categories[i % C.categories.length],
        category_group_code: "FD6", address_name: "서울 중구 테스트동 " + (i + 1), road_address_name: "서울 중구 테스트로 " + (i + 1),
        place_url: "http://place.map.kakao.com/" + id, phone: "02-000-" + String(1000 + i),
        x: String(lng + dx), y: String(lat + dy), distance: String(d) });
    }
    return out;
  }
  function paged(all, cb) {
    var size = 15, pages = Math.max(1, Math.ceil(all.length / size));
    function send(p) {
      var pg = { totalCount: all.length, current: p, hasNextPage: p < pages, nextPage: function () { send(p + 1); } };
      var slice = all.slice((p - 1) * size, p * size);
      setTimeout(function () { cb(slice, slice.length ? "OK" : "ZERO_RESULT", pg); }, wait());
    }
    send(1);
  }
  var services = {
    Status: { OK: "OK", ZERO_RESULT: "ZERO_RESULT", ERROR: "ERROR" },
    SortBy: { ACCURACY: "accuracy", DISTANCE: "distance" },
    Places: function () {
      return {
        keywordSearch: function (q, cb) { paged([], cb); },
        categorySearch: function (code, cb, o) {
          var c = o && o.location ? o.location : new LatLng(37.5665, 126.978);
          var all = docsAround(c.getLat(), c.getLng());
          if (o && o.radius) all = all.filter(function (d) { return Number(d.distance) <= o.radius; });
          paged(all, cb);
        }
      };
    },
    Geocoder: function () { return { addressSearch: function (q, cb) { paged([], cb); } }; }
  };
  window.kakao = { maps: { LatLng: LatLng, load: function (cb) { window.kakao.maps.services = services; cb(); } } };
})();`;
}

function delayRange(options: FakeKakaoOptions): readonly [number, number] {
  const d = options.searchDelayMs ?? 30;
  return typeof d === "number" ? [d, d] : d;
}

/**
 * 라우트 없이 첫 스크립트(addInitScript)로 넣는 가짜. SDK가 이미 준비된 상태(services 있음)라 sdk.js 요청이 없다.
 * Playwright 라우트를 걸면 HTTP 캐시가 꺼지므로, 재방문(캐시 있음) 측정은 이것을 쓴다.
 */
export function kakaoFakeInitSource(
  options: Omit<FakeKakaoOptions, "sdkDelayMs"> = {},
): string {
  return `${fakeScript(options.count ?? 45, delayRange(options))}
window.kakao.maps.load(function () {});`;
}

/**
 * 네이버 지도(가짜)와 카카오 음식점 검색(가짜 N곳)을 건다. 페이지 이동 전에 부른다.
 */
export async function mockRecommendSdks(
  page: Page,
  options: FakeKakaoOptions = {},
): Promise<void> {
  const count = options.count ?? 45;
  const delay = delayRange(options);
  const sdkDelay = options.sdkDelayMs ?? 0;
  await mockMapSdks(page);
  await page.route("https://dapi.kakao.com/v2/maps/sdk.js**", async (route) => {
    if (sdkDelay > 0) await new Promise((r) => setTimeout(r, sdkDelay));
    await route.fulfill({
      contentType: "application/javascript",
      body: fakeScript(count, delay),
    });
  });
}
