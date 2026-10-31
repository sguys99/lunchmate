// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  KakaoMapsApi,
  KakaoPagination,
  KakaoPlaceDoc,
} from "./kakao-types";
import {
  fromAddressDoc,
  fromPlaceDoc,
  followingPages,
  fromRestaurantDoc,
  kakaoPlaceUrl,
  mergeLocationResults,
  nearbyRestaurants,
  searchLocation,
  searchRestaurants,
  searchRestaurantsInRect,
  toKakaoRect,
} from "./local";
import { resetKakaoSdkForTest } from "./sdk-loader";

afterEach(() => resetKakaoSdkForTest());

const doc = (i: number, over: Partial<KakaoPlaceDoc> = {}): KakaoPlaceDoc => ({
  id: String(i),
  place_name: `식당${i}`,
  address_name: "소담동 1",
  road_address_name: "소담로 1",
  x: String(127 + i * 0.001),
  y: String(37.5 + i * 0.001),
  distance: String(i * 20),
  ...over,
});

function installFakeKakao(opts: {
  keyword?: KakaoPlaceDoc[] | "error";
  address?: { address_name: string; x: string; y: string }[];
  category?: KakaoPlaceDoc[];
  /** categorySearch가 처음 n번 ERROR를 돌려준다 */
  failTimes?: number;
  /** 페이지별 응답 지연(ms). 없으면 바로 응답 */
  pageDelay?: Record<number, number>;
}) {
  let failures = opts.failTimes ?? 0;
  const categorySearch = vi.fn();
  const api = {
    load: (cb: () => void) => cb(),
    LatLng: function (lat: number, lng: number) {
      return { getLat: () => lat, getLng: () => lng };
    },
    services: {
      Status: { OK: "OK", ZERO_RESULT: "ZERO_RESULT", ERROR: "ERROR" },
      SortBy: { ACCURACY: "accuracy", DISTANCE: "distance" },
      Places: function () {
        return {
          keywordSearch: (_q: string, cb: (r: unknown[], s: string) => void) =>
            opts.keyword === "error"
              ? cb([], "ERROR")
              : cb(
                  opts.keyword ?? [],
                  opts.keyword?.length ? "OK" : "ZERO_RESULT",
                ),
          categorySearch: (
            code: string,
            cb: (r: KakaoPlaceDoc[], s: string, p: KakaoPagination) => void,
            o: unknown,
          ) => {
            categorySearch(code, o);
            if (failures > 0) {
              failures -= 1;
              cb([], "ERROR", {
                totalCount: 0,
                current: 1,
                hasNextPage: false,
                nextPage: () => {},
              });
              return;
            }
            const all = opts.category ?? [];
            const page = (o as { page?: number } | undefined)?.page ?? 1;
            const slice = all.slice((page - 1) * 15, page * 15);
            const reply = () =>
              cb(slice, slice.length ? "OK" : "ZERO_RESULT", {
                totalCount: all.length,
                current: page,
                hasNextPage: page * 15 < all.length,
                nextPage: () => {
                  throw new Error("nextPage는 쓰지 않는다(T5.41 병렬 요청)");
                },
              });
            const delay = opts.pageDelay?.[page];
            if (delay === undefined) reply();
            else setTimeout(reply, delay);
          },
        };
      },
      Geocoder: function () {
        return {
          addressSearch: (_q: string, cb: (r: unknown[], s: string) => void) =>
            cb(opts.address ?? [], opts.address?.length ? "OK" : "ZERO_RESULT"),
        };
      },
    },
  };
  window.kakao = { maps: api as unknown as KakaoMapsApi };
  return { categorySearch };
}

describe("카카오 로컬 래퍼", () => {
  it("장소 결과를 이름, 주소, 좌표로 바꾼다", () => {
    expect(fromPlaceDoc(doc(1))).toEqual({
      key: "p:1",
      name: "식당1",
      address: "소담로 1",
      position: { lat: 37.501, lng: 127.001 },
    });
    expect(fromPlaceDoc(doc(1, { x: "abc" }))).toBeNull();
    expect(
      fromAddressDoc({
        address_name: "소담동 24",
        x: "127",
        y: "37.5",
        road_address: { address_name: "소담로 24", building_name: "소담빌딩" },
      })?.name,
    ).toBe("소담빌딩");
  });

  it("주소 결과를 앞에, 같은 지점은 하나만, 최대 3개", () => {
    const a = fromAddressDoc({
      address_name: "소담동 1",
      x: "127.001",
      y: "37.501",
    });
    const merged = mergeLocationResults(
      [a],
      [doc(1), doc(2), doc(3), doc(4)].map(fromPlaceDoc),
    );
    expect(merged.map((m) => m.key)).toEqual(["a:소담동 1", "p:2", "p:3"]);
  });

  it("검색어로 주소와 키워드를 함께 찾는다. 한쪽 오류는 나머지로 보여 준다", async () => {
    installFakeKakao({
      keyword: "error",
      address: [{ address_name: "소담동 1", x: "127", y: "37.5" }],
    });
    const r = await searchLocation("소담");
    expect(r).toHaveLength(1);
    expect(await searchLocation("  ")).toEqual([]);
  });

  it("FD6 반경 검색은 가까운 순으로 최대 3페이지, 45곳이면 상한", async () => {
    const { categorySearch } = installFakeKakao({
      category: Array.from({ length: 60 }, (_, i) => doc(i)),
    });
    const r = await nearbyRestaurants({ lat: 37.5, lng: 127 }, 1030);
    expect(r.places).toHaveLength(45);
    expect(r.capped).toBe(true);
    expect(categorySearch).toHaveBeenCalledWith(
      "FD6",
      expect.objectContaining({ radius: 1030, sort: "distance", size: 15 }),
    );
    // 장소명은 담지 않는다
    expect(Object.keys(r.places[0]!).sort()).toEqual([
      "distance",
      "id",
      "position",
    ]);
  });

  it("결과가 적으면 상한이 아니다", async () => {
    installFakeKakao({ category: [doc(1), doc(2)] });
    const r = await nearbyRestaurants({ lat: 37.5, lng: 127 }, 1030);
    expect(r).toMatchObject({ capped: false });
    expect(r.places).toHaveLength(2);
  });

  it("FD6 결과를 이름, 카테고리, 거리, 카카오맵 링크로 바꾼다 (T5.12)", () => {
    expect(
      fromRestaurantDoc(
        doc(7, {
          category_name: "음식점 > 한식 > 국밥",
          place_url: "http://place.map.kakao.com/7",
        }),
      ),
    ).toEqual({
      id: "7",
      name: "식당7",
      categoryName: "음식점 > 한식 > 국밥",
      address: "소담로 1",
      position: { lat: 37.507, lng: 127.007 },
      distance: 140,
      placeUrl: "http://place.map.kakao.com/7",
    });
    // 링크가 없으면 id로 만들고, 거리가 없으면 null
    const r = fromRestaurantDoc(doc(8, { distance: "" }));
    expect(r?.placeUrl).toBe(kakaoPlaceUrl("8"));
    expect(r?.distance).toBeNull();
    expect(fromRestaurantDoc(doc(9, { place_name: "" }))).toBeNull();
  });

  it("FD6 반경 전체 정보 검색: 45곳 상한, 중복 id 제거 (T5.12)", async () => {
    installFakeKakao({
      category: [...Array.from({ length: 50 }, (_, i) => doc(i))].map((d, i) =>
        i === 1 ? { ...d, id: "0" } : d,
      ),
    });
    const r = await searchRestaurants({ lat: 37.5, lng: 127 }, 515);
    expect(r.capped).toBe(true);
    expect(r.places).toHaveLength(44);
    expect(r.places[0]).toMatchObject({ id: "0", name: "식당0" });
  });

  it("실패하면 1회 재시도하고, 두 번 실패하면 던진다 (T5.12)", async () => {
    const once = installFakeKakao({ category: [doc(1)], failTimes: 1 });
    await expect(
      searchRestaurants({ lat: 37.5, lng: 127 }, 515),
    ).resolves.toMatchObject({ capped: false });
    expect(once.categorySearch).toHaveBeenCalledTimes(2);

    resetKakaoSdkForTest();
    const twice = installFakeKakao({ category: [doc(1)], failTimes: 2 });
    await expect(
      searchRestaurants({ lat: 37.5, lng: 127 }, 515),
    ).rejects.toThrow();
    expect(twice.categorySearch).toHaveBeenCalledTimes(2);
  });

  it("사각 영역 검색은 rect 문자열과 기준점 거리순으로 부른다 (T5.12a)", async () => {
    const { categorySearch } = installFakeKakao({ category: [doc(1)] });
    const bounds = {
      sw: { lat: 37.5, lng: 127 },
      ne: { lat: 37.51, lng: 127.01 },
    };
    expect(toKakaoRect(bounds)).toBe(
      "127.000000,37.500000,127.010000,37.510000",
    );
    const r = await searchRestaurantsInRect(bounds, { lat: 37.5, lng: 127 });
    expect(r.places).toHaveLength(1);
    expect(categorySearch).toHaveBeenCalledWith(
      "FD6",
      expect.objectContaining({
        rect: "127.000000,37.500000,127.010000,37.510000",
        sort: "distance",
        size: 15,
      }),
    );
  });
  it("1페이지 뒤 2, 3페이지는 나란히 요청하고, 늦게 와도 페이지 순서를 지킨다 (T5.41)", async () => {
    vi.useFakeTimers();
    try {
      const { categorySearch } = installFakeKakao({
        category: Array.from({ length: 45 }, (_, i) => doc(i)),
        pageDelay: { 1: 100, 2: 300, 3: 100 },
      });
      const pending = searchRestaurants({ lat: 37.5, lng: 127 }, 515);
      await vi.advanceTimersByTimeAsync(100);
      // 1페이지가 오자마자 2, 3페이지를 함께 보낸다
      expect(categorySearch).toHaveBeenCalledTimes(3);
      expect(categorySearch.mock.calls.map(([, o]) => o.page)).toEqual([
        1, 2, 3,
      ]);
      await vi.advanceTimersByTimeAsync(300);
      const r = await pending;
      expect(r.capped).toBe(true);
      expect(r.places.map((p) => p.id)).toEqual(
        Array.from({ length: 45 }, (_, i) => String(i)),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("더 받을 페이지는 1페이지 개수로 정한다, 최대 3페이지 (T5.41)", () => {
    expect(followingPages({ totalCount: 10, hasNextPage: false })).toEqual([]);
    expect(followingPages({ totalCount: 20, hasNextPage: true })).toEqual([2]);
    expect(followingPages({ totalCount: 45, hasNextPage: true })).toEqual([
      2, 3,
    ]);
    expect(followingPages({ totalCount: 300, hasNextPage: true })).toEqual([
      2, 3,
    ]);
  });

  it("뒤 페이지 하나가 실패하면 전체를 1회 다시 받는다 (T5.41)", async () => {
    let calls = 0;
    const fake = installFakeKakao({
      category: Array.from({ length: 30 }, (_, i) => doc(i)),
    });
    const services = (window.kakao?.maps as KakaoMapsApi).services!;
    const Places = services.Places;
    services.Places = function () {
      const inner = new Places();
      return {
        ...inner,
        categorySearch: (
          code: string,
          cb: (r: KakaoPlaceDoc[], s: string, p: KakaoPagination) => void,
          o: { page?: number },
        ) => {
          calls += 1;
          // 첫 시도의 2페이지만 실패
          if (calls === 2)
            return cb([], "ERROR", {
              totalCount: 0,
              current: 2,
              hasNextPage: false,
              nextPage: () => {},
            });
          return inner.categorySearch(code, cb, o);
        },
      };
    } as unknown as typeof Places;
    const r = await searchRestaurants({ lat: 37.5, lng: 127 }, 515);
    expect(r.places).toHaveLength(30);
    expect(calls).toBe(4);
    expect(fake.categorySearch).toHaveBeenCalledTimes(3);
  });
});
