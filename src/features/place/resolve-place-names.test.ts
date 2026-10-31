import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type {
  KakaoRestaurant,
  KakaoRestaurantsResult,
} from "@/lib/kakao/local";
import { kakaoKeys } from "@/lib/kakao/queries";
import {
  MAX_EXTRA_CALLS,
  memoryLookup,
  placeLinkFor,
  quadrantBounds,
  resolvePlaceNames,
  summarizeResolution,
  type ResolveDeps,
} from "./resolve-place-names";

const anchor = { lat: 37.5, lng: 127 };

const place = (id: string): KakaoRestaurant => ({
  id,
  name: `식당${id}`,
  categoryName: "음식점 > 한식",
  address: "소담로 1",
  position: { lat: 37.5, lng: 127 },
  distance: 100,
  placeUrl: `https://place.map.kakao.com/${id}`,
});

const result = (ids: string[], capped = false): KakaoRestaurantsResult => ({
  places: ids.map(place),
  capped,
});

function deps(over: Partial<ResolveDeps> = {}) {
  const searchRadius = vi.fn<ResolveDeps["searchRadius"]>(async () =>
    result([]),
  );
  const searchRect = vi.fn<ResolveDeps["searchRect"]>(async () => result([]));
  return {
    lookupMemory: () => undefined,
    searchRadius,
    searchRect,
    ...over,
  } satisfies ResolveDeps;
}

describe("resolvePlaceNames (T5.12a)", () => {
  it("1단계 세션 메모리에 있으면 카카오를 부르지 않는다", async () => {
    const d = deps({
      lookupMemory: (id) => (id === "1" ? place("1") : undefined),
    });
    const r = await resolvePlaceNames([{ placeId: "1" }], d, { anchor });
    expect(r.places[0]).toMatchObject({
      status: "resolved",
      via: "memory",
      place: { name: "식당1" },
    });
    expect(d.searchRadius).not.toHaveBeenCalled();
    expect(r.stats).toMatchObject({ total: 1, fromMemory: 1, unresolved: 0 });
  });

  it("2단계 기준점 반경 검색으로 id를 맞춘다. 상한이 아니면 사분면을 보지 않는다", async () => {
    const d = deps({
      searchRadius: vi.fn(async () => result(["2", "3", "9"])),
    });
    const r = await resolvePlaceNames([{ placeId: "2" }, { placeId: "4" }], d, {
      anchor,
      radius: 1030,
    });
    expect(d.searchRadius).toHaveBeenCalledWith(anchor, 1030);
    expect(d.searchRect).not.toHaveBeenCalled();
    expect(r.places.map((p) => p.status)).toEqual(["resolved", "unresolved"]);
    expect(r.stats).toMatchObject({
      fromNearby: 1,
      unresolved: 1,
      extraCalls: 0,
    });
  });

  it("45곳 상한이면 사분면 rect로 추가 검색하고, 다 찾으면 멈춘다", async () => {
    const searchRect = vi
      .fn<ResolveDeps["searchRect"]>()
      .mockResolvedValueOnce(result(["a"]))
      .mockResolvedValueOnce(result(["b"]));
    const d = deps({
      searchRadius: vi.fn(async () => result(["x"], true)),
      searchRect,
    });
    const r = await resolvePlaceNames([{ placeId: "a" }, { placeId: "b" }], d, {
      anchor,
    });
    expect(searchRect).toHaveBeenCalledTimes(2);
    expect(searchRect.mock.calls[0]?.[1]).toEqual(anchor);
    expect(r.stats).toMatchObject({
      fromNearby: 2,
      unresolved: 0,
      extraCalls: 2,
    });
  });

  it("추가 호출은 화면당 최대 4회", async () => {
    const d = deps({ searchRadius: vi.fn(async () => result([], true)) });
    const r = await resolvePlaceNames([{ placeId: "z" }], d, {
      anchor,
      maxExtraCalls: 10,
    });
    expect(d.searchRect).toHaveBeenCalledTimes(MAX_EXTRA_CALLS);
    expect(r.stats.extraCalls).toBe(4);
    expect(r.places[0]?.status).toBe("unresolved");
  });

  it("3단계 미해결은 저장된 카카오맵 링크, 없으면 id로 만든 링크", async () => {
    const r = await resolvePlaceNames(
      [
        { placeId: "11", placeUrl: "http://place.map.kakao.com/11" },
        { placeId: "12" },
      ],
      deps(),
      { anchor: null },
    );
    expect(r.places).toEqual([
      {
        placeId: "11",
        status: "unresolved",
        placeUrl: "https://place.map.kakao.com/11",
      },
      {
        placeId: "12",
        status: "unresolved",
        placeUrl: "https://place.map.kakao.com/12",
      },
    ]);
  });

  it("카카오 장애는 던지지 않고 미해결로 돌려준다", async () => {
    const d = deps({
      searchRadius: vi.fn(async () => {
        throw new Error("kakao down");
      }),
    });
    const r = await resolvePlaceNames([{ placeId: "1" }], d, { anchor });
    expect(r.places[0]?.status).toBe("unresolved");
    expect(r.stats.searchFailed).toBe(true);
  });

  it("중복 id는 한 번만, 입력 순서를 지킨다", async () => {
    const d = deps({ searchRadius: vi.fn(async () => result(["2", "1"])) });
    const r = await resolvePlaceNames(
      [{ placeId: "1" }, { placeId: "2" }, { placeId: "1" }],
      d,
      { anchor },
    );
    expect(r.places.map((p) => p.placeId)).toEqual(["1", "2"]);
    expect(r.stats.total).toBe(2);
  });

  it("집계에는 개수만 있고 좌표, id, 이름이 없다", async () => {
    const r = await resolvePlaceNames([{ placeId: "1" }], deps(), { anchor });
    expect(Object.keys(r.stats).sort()).toEqual([
      "extraCalls",
      "fromMemory",
      "fromNearby",
      "searchFailed",
      "total",
      "unresolved",
    ]);
    expect(summarizeResolution([r.stats, r.stats])).toEqual({
      total: 2,
      unresolved: 2,
      unresolvedRate: 1,
      extraCalls: 0,
    });
    expect(summarizeResolution([]).unresolvedRate).toBe(0);
  });
});

describe("보조 함수", () => {
  it("카카오맵 상세 주소가 아닌 저장 링크는 쓰지 않는다", () => {
    expect(
      placeLinkFor({ placeId: "5", placeUrl: "https://evil.example/5" }),
    ).toBe("https://place.map.kakao.com/5");
  });

  it("사분면 4개가 기준점을 꼭짓점으로 반경을 덮는다", () => {
    const q = quadrantBounds(anchor, 1000);
    expect(q).toHaveLength(4);
    for (const b of q) {
      expect(b.sw.lat).toBeLessThan(b.ne.lat);
      expect(b.sw.lng).toBeLessThan(b.ne.lng);
    }
    expect(q[0]?.ne.lat).toBeCloseTo(37.5 + 1000 / 111_320, 6);
  });

  it("세션 메모리 조회는 이름이 든 카카오 결과만 훑는다", () => {
    const client = new QueryClient();
    client.setQueryData(kakaoKeys.radius(anchor, 515), result(["m1"]));
    client.setQueryData(kakaoKeys.nearbyCount(anchor, 1030), {
      places: [{ id: "n1", position: anchor, distance: 1 }],
      capped: false,
    });
    const lookup = memoryLookup(client);
    expect(lookup("m1")?.name).toBe("식당m1");
    expect(lookup("n1")).toBeUndefined();
  });
});
