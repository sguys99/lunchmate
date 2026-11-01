// 회식 조건과 후보 고르기 (T7.25~T7.27, D-16). 순수 함수 테스트.
import { describe, expect, it } from "vitest";
import {
  emptyPlaceStats,
  type PlaceStats,
} from "@/features/place/place-stats-model";
import type { KakaoRestaurant } from "@/lib/kakao/local";
import {
  DEFAULT_CONDITIONS,
  PARTY_CONDITIONS_KEY,
  PARTY_RADIUS_M,
  clampBudget,
  clampHeadcount,
  parseConditions,
  readSavedConditions,
  saveConditions,
  serializeConditions,
  type PartyConditions,
} from "./conditions";
import { partySearched } from "./events";
import { evidenceFor, rankParty, unknownShare, type PartyInput } from "./rank";

const CENTER = { lat: 37.5665, lng: 126.978 };
const NOW = new Date("2026-11-02T09:00:00Z"); // 18:00 KST

function place(
  id: string,
  categoryName: string,
  distance = 300,
): KakaoRestaurant {
  return {
    id,
    name: `식당${id}`,
    categoryName,
    address: "",
    position: { lat: CENTER.lat + 0.001, lng: CENTER.lng },
    distance,
    placeUrl: `https://place.map.kakao.com/${id}`,
  };
}

function stats(id: string, over: Partial<PlaceStats> = {}): PlaceStats {
  return { ...emptyPlaceStats(id), ...over };
}

function input(over: Partial<PartyInput> = {}): PartyInput {
  return {
    places: [],
    statsOf: () => null,
    center: CENTER,
    conditions: { headcount: 8, budget: 40_000, room: true, alcohol: true },
    avoid: [],
    blocked: new Set(),
    visits: [],
    now: NOW,
    ...over,
  };
}

function memoryStore() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    raw: m,
  };
}

describe("회식 조건 (T7.25, D-16 안건 6)", () => {
  it("처음 기본값은 6명, 1인 3만 원, 자리와 주류 끔", () => {
    expect(DEFAULT_CONDITIONS).toEqual({
      headcount: 6,
      budget: 30_000,
      room: false,
      alcohol: false,
    });
  });

  it("인원 2~40, 예산 1만~10만 5천 단위로 맞춘다", () => {
    expect(clampHeadcount(1)).toBe(2);
    expect(clampHeadcount(41)).toBe(40);
    expect(clampBudget(32_000)).toBe(30_000);
    expect(clampBudget(500_000)).toBe(100_000);
    expect(clampBudget(Number.NaN)).toBe(30_000);
  });

  it("저장은 조건 4개만, 읽을 때 모양이 틀리면 null", () => {
    const s = memoryStore();
    expect(readSavedConditions(s)).toBeNull();
    const c: PartyConditions = {
      headcount: 12,
      budget: 45_000,
      room: true,
      alcohol: false,
    };
    saveConditions(c, s);
    expect(JSON.parse(s.raw.get(PARTY_CONDITIONS_KEY)!)).toEqual(c);
    expect(readSavedConditions(s)).toEqual(c);
    expect(parseConditions("{")).toBeNull();
    expect(parseConditions('{"headcount":"8"}')).toBeNull();
    expect(
      Object.keys(
        JSON.parse(serializeConditions({ ...c, name: "x" } as never)),
      ),
    ).toEqual(["headcount", "budget", "room", "alcohol"]);
  });

  it("저장소가 막혀 있어도 던지지 않는다", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readSavedConditions(broken)).toBeNull();
    expect(() => saveConditions(DEFAULT_CONDITIONS, broken)).not.toThrow();
  });

  it("검색 반경은 도보 15분 (PARTY-02)", () => {
    expect(PARTY_RADIUS_M).toBe(Math.floor((15 * 67) / 1.3));
  });
});

describe("근거 3단계 (T7.27, PARTY-03, PARTY-04)", () => {
  const cond = { headcount: 8, budget: 40_000, room: true, alcohol: true };

  it("가격 제보가 있으면 met, 없으면 카테고리 저녁 추정가 estimate", () => {
    expect(
      evidenceFor({
        category: "gogi",
        priceReport: { medianKRW: 32_000, count: 6 },
        roomReports: 0,
        groupReports: 0,
        conditions: cond,
      })[0],
    ).toEqual({ key: "budget", status: "met", priceKRW: 32_000, count: 6 });
    expect(
      evidenceFor({
        category: "gogi",
        priceReport: null,
        roomReports: 0,
        groupReports: 0,
        conditions: cond,
      })[0],
    ).toEqual({ key: "budget", status: "estimate", priceKRW: 25_000 });
  });

  it("룸/단체석: 제보가 없으면 unknown, 10명 이상이면 단체석 근거 먼저", () => {
    const base = { category: "hansik" as const, priceReport: null };
    expect(
      evidenceFor({
        ...base,
        roomReports: 0,
        groupReports: 0,
        conditions: cond,
      })[1],
    ).toEqual({ key: "room", status: "unknown" });
    expect(
      evidenceFor({
        ...base,
        roomReports: 4,
        groupReports: 2,
        conditions: cond,
      })[1],
    ).toEqual({ key: "room", status: "met", kind: "room", count: 4 });
    expect(
      evidenceFor({
        ...base,
        roomReports: 4,
        groupReports: 2,
        conditions: { ...cond, headcount: 12 },
      })[1],
    ).toEqual({ key: "room", status: "met", kind: "group", count: 2 });
  });

  it("주류: 술집은 met, 그 밖은 카테고리 추정. 끈 조건은 줄이 없다", () => {
    const pub = evidenceFor({
      category: "pub",
      priceReport: null,
      roomReports: 0,
      groupReports: 0,
      conditions: cond,
    });
    expect(pub.at(-1)).toEqual({ key: "alcohol", status: "met" });
    const gogi = evidenceFor({
      category: "gogi",
      priceReport: null,
      roomReports: 0,
      groupReports: 0,
      conditions: cond,
    });
    expect(gogi.at(-1)).toEqual({
      key: "alcohol",
      status: "estimate",
      category: "gogi",
    });
    const off = evidenceFor({
      category: "gogi",
      priceReport: null,
      roomReports: 3,
      groupReports: 0,
      conditions: { ...cond, room: false, alcohol: false },
    });
    expect(off.map((e) => e.key)).toEqual(["budget"]);
  });
});

describe("후보 고르기 (T7.27, D-16 안건 2~5, 11)", () => {
  it("주류를 켜면 카페, 분식, 샐러드, 패스트푸드를 뺀다", () => {
    const r = rankParty(
      input({
        places: [
          place("1", "음식점 > 카페"),
          place("2", "음식점 > 분식"),
          place("3", "음식점 > 술집 > 호프,요리주점"),
          place("4", "음식점 > 한식 > 육류,고기"),
        ],
      }),
    );
    expect(r.picks.map((p) => p.id).sort()).toEqual(["3", "4"]);
    expect(r.filtered.alcohol).toBe(2);
  });

  it("예산은 가격 제보가 있고 넘을 때만 거른다", () => {
    const r = rankParty(
      input({
        places: [place("1", "음식점 > 양식"), place("2", "음식점 > 양식")],
        statsOf: (id) =>
          id === "1" ? stats(id, { priceCount: 3, priceMedian: 60_000 }) : null,
      }),
    );
    expect(r.picks.map((p) => p.id)).toEqual(["2"]);
    expect(r.filtered.overBudget).toBe(1);
  });

  it("룸/단체석과 인원은 거르지 않고, 제보로 확인된 조건 수가 많은 곳이 앞", () => {
    const r = rankParty(
      input({
        places: [
          place("1", "음식점 > 한식", 100),
          place("2", "음식점 > 한식", 600),
        ],
        statsOf: (id) =>
          id === "2"
            ? stats(id, {
                priceCount: 2,
                priceMedian: 30_000,
                topTags: [{ tag: "private_room", count: 3 }],
              })
            : null,
      }),
    );
    expect(r.picks.map((p) => p.id)).toEqual(["2", "1"]);
    expect(r.picks[0]!.metCount).toBe(2);
    expect(r.picks[1]!.evidence.find((e) => e.key === "room")).toEqual({
      key: "room",
      status: "unknown",
    });
  });

  it("기피 음식, 다시 안 갈 곳, 폐업은 빼고 반경 밖도 뺀다", () => {
    const r = rankParty(
      input({
        conditions: { ...DEFAULT_CONDITIONS },
        places: [
          place("1", "음식점 > 한식 > 해물,생선 > 회"),
          place("2", "음식점 > 중식"),
          place("3", "음식점 > 일식"),
          place("4", "음식점 > 양식", PARTY_RADIUS_M + 50),
          place("5", "음식점 > 한식"),
        ],
        avoid: [{ kind: "food", value: "회" }],
        blocked: new Set(["2"]),
        statsOf: (id) => (id === "3" ? stats(id, { closed: true }) : null),
      }),
    );
    expect(r.picks.map((p) => p.id)).toEqual(["5"]);
    expect(r.filtered).toMatchObject({ personal: 2, closed: 1 });
  });

  it("최대 5곳, 같은 입력이면 같은 순서, 할인은 순서에 영향이 없다", () => {
    const places = Array.from({ length: 9 }, (_, i) =>
      place(String(i + 1), "음식점 > 한식", 100 + i * 50),
    );
    const a = rankParty(input({ places }));
    const b = rankParty(
      input({
        places,
        statsOf: (id) => stats(id, { dealCount: id === "9" ? 3 : 0 }),
      }),
    );
    expect(a.picks).toHaveLength(5);
    expect(a.eligibleCount).toBe(9);
    expect(b.picks.map((p) => p.id)).toEqual(a.picks.map((p) => p.id));
    expect(b.picks.map((p) => p.score)).toEqual(a.picks.map((p) => p.score));
  });

  it("근거 대부분이 추정이나 정보 없음이면 콜드 스타트 비율이 높다", () => {
    const r = rankParty(input({ places: [place("1", "음식점 > 한식")] }));
    expect(unknownShare(r.picks)).toBe(1);
    expect(unknownShare([])).toBe(0);
  });
});

describe("party_searched (PRD 10.2)", () => {
  it("PRD 속성만 담는다", () => {
    expect(
      partySearched(
        { headcount: 8, budget: 40_000, room: true, alcohol: false },
        5,
      ),
    ).toEqual({
      name: "party_searched",
      properties: {
        headcount: 8,
        budget: 40_000,
        room: true,
        alcohol: false,
        result_count: 5,
      },
    });
  });
});
