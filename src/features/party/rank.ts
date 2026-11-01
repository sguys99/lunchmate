// 회식 후보 고르기와 근거 (T7.27, PARTY-03, PARTY-04, D-16 안건 2~5, 10, 11). 순수 함수, React와 네트워크 의존 없음.
//
// 입력: 카카오 반경 검색 결과(세션 메모리) + place_stats 집계(place_id별, 익명) + 내 기피, 다시 안 갈 곳, 방문 기록.
// 규칙(DESIGN.md 5장 "회식 모드")
// - 하드 필터: 내 기피 음식과 다시 안 갈 곳, 폐업 제보 3명(추천과 같은 hardFilterReason), 예산 초과(가격 제보가 있을 때만),
//   주류를 켜면 카페, 분식, 샐러드, 패스트푸드 제외. 룸/단체석과 인원은 거르지 않는다(순서에만).
// - 근거 3단계: met 제보로 확인 / estimate 카테고리로 추정 / unknown 정보 없음.
//   예산은 가격 제보 중앙값(met) 또는 카테고리 저녁 추정가(estimate). 룸/단체석은 태그 "룸 있음", "단체석" 제보.
//   주류는 카카오 카테고리로 판정: 술집은 met, 그 밖의 식사 카테고리는 estimate(태그 8종에 주류가 없다, D-16 안건 3).
// - 순서: 제보로 확인된 조건 수 → 추천 점수(저녁, 도보 15분, 1인 예산, 내 선호와 반복) → 가까운 곳 → id.
//   할인은 점수에 쓰지 않는다(AC-DEAL-2, 엔진이 deal을 무시한다). 무작위 없음(같은 입력이면 같은 결과).
// 이름, 카테고리, 좌표는 카카오 세션 값이다. 결과를 저장하거나 분석 이벤트에 넣지 않는다(CLAUDE.md 7장).
import { categoryLabel, type CategorySlug } from "@/features/place/categories";
import { resolvePrice } from "@/features/place/price-estimate";
import type { PlaceStats as PlaceAggregate } from "@/features/place/place-stats-model";
import {
  toCandidate,
  type PlaceStats as EngineStats,
} from "@/features/rec/candidates";
import { thumbsUpPercent } from "@/lib/format/number";
import type { KakaoRestaurant } from "@/lib/kakao/local";
import type { LatLng } from "@/lib/map/types";
import { estimateWalkMinutes } from "@/lib/reco/distance";
import { CLOSED_REPORT_THRESHOLD, hardFilterReason } from "@/lib/reco/filter";
import { MIN_REVIEWS_FOR_REPUTATION } from "@/lib/reco/constants";
import { scoreAll } from "@/lib/reco/score";
import type { AvoidRule, Visit } from "@/lib/reco/types";
import {
  LARGE_GROUP,
  PARTY_RADIUS_M,
  PARTY_RESULT_COUNT,
  PARTY_WALK_MINUTES,
  type PartyConditions,
} from "./conditions";

/** 주류를 켜면 뺄 카테고리 (D-16 안건 3) */
export const ALCOHOL_EXCLUDED: readonly CategorySlug[] = [
  "cafe",
  "salad",
  "fastfood",
  "bunsik",
];

export type EvidenceKey = "budget" | "room" | "alcohol";
export type EvidenceStatus = "met" | "estimate" | "unknown";

/** 근거 한 줄. 문장은 화면이 copy로 만든다(값만 담는다) */
export type Evidence =
  | { key: "budget"; status: "met"; priceKRW: number; count: number }
  | { key: "budget"; status: "estimate"; priceKRW: number }
  | { key: "room"; status: "met"; kind: "room" | "group"; count: number }
  | { key: "room"; status: "unknown" }
  | { key: "alcohol"; status: "met" }
  | { key: "alcohol"; status: "estimate"; category: CategorySlug };

export type PartyPick = {
  id: string;
  name: string;
  placeUrl: string;
  /** 카카오 원문 업종(투표 만들기로 세션 전달, 저장 금지) */
  categoryName: string;
  category: CategorySlug;
  position: LatLng;
  walkMinutes: number;
  price: { krw: number; estimate: boolean; count: number };
  /** 후기 3건 이상일 때만 👍 비율(0~100) */
  thumbsUpRate: number | null;
  evidence: readonly Evidence[];
  /** 제보로 확인된 조건 수 */
  metCount: number;
  score: number;
};

export type PartyFiltered = {
  personal: number;
  closed: number;
  overBudget: number;
  alcohol: number;
};

export type PartyResult = {
  picks: readonly PartyPick[];
  /** 거르고 남은 곳 수(5곳 미만 안내) */
  eligibleCount: number;
  filtered: PartyFiltered;
};

export type PartyInput = {
  places: readonly KakaoRestaurant[];
  /** place_id → 집계. 못 받았으면 null(콜드 스타트 중립) */
  statsOf: (placeId: string) => PlaceAggregate | null;
  center: LatLng;
  conditions: PartyConditions;
  avoid: readonly AvoidRule[];
  blocked: ReadonlySet<string>;
  visits: readonly Visit[];
  now: Date;
};

/** 집계 → 엔진 값. 웨이팅은 저녁이라 쓰지 않고, 할인은 넘기지 않는다(점수 반영 0) */
export function engineStats(s: PlaceAggregate | null): EngineStats {
  return {
    priceReport:
      s && s.priceCount > 0 && s.priceMedian !== null && s.priceMedian > 0
        ? { medianKRW: s.priceMedian, count: s.priceCount }
        : null,
    thumbs: { up: s?.thumbsUp ?? 0, down: s?.thumbsDown ?? 0 },
    closedReports: s
      ? s.closed
        ? Math.max(s.closedReports, CLOSED_REPORT_THRESHOLD)
        : s.closedReports
      : 0,
    waiting: null,
    deal: null,
  };
}

function tagCount(
  s: PlaceAggregate | null,
  tag: "private_room" | "group_seats",
) {
  return s?.topTags.find((t) => t.tag === tag)?.count ?? 0;
}

/** 조건별 근거. 끈 조건(룸, 주류)은 줄을 만들지 않는다. 예산은 늘 있다 */
export function evidenceFor(args: {
  category: CategorySlug;
  priceReport: EngineStats["priceReport"];
  roomReports: number;
  groupReports: number;
  conditions: PartyConditions;
}): Evidence[] {
  const { category, conditions: cond } = args;
  const price = resolvePrice(args.priceReport, category, "dinner");
  const out: Evidence[] = [
    price.source === "report"
      ? {
          key: "budget",
          status: "met",
          priceKRW: price.priceKRW,
          count: price.reportCount,
        }
      : { key: "budget", status: "estimate", priceKRW: price.priceKRW },
  ];
  if (cond.room) {
    const { roomReports: room, groupReports: group } = args;
    if (room > 0 || group > 0) {
      // 큰 모임은 단체석 근거를 앞에 둔다(D-16 안건 4)
      const preferGroup = cond.headcount >= LARGE_GROUP && group > 0;
      const useRoom = !preferGroup && room >= group;
      out.push({
        key: "room",
        status: "met",
        kind: useRoom ? "room" : "group",
        count: useRoom ? room : group,
      });
    } else {
      out.push({ key: "room", status: "unknown" });
    }
  }
  if (cond.alcohol) {
    out.push(
      category === "pub"
        ? { key: "alcohol", status: "met" }
        : { key: "alcohol", status: "estimate", category },
    );
  }
  return out;
}

export function rankParty(input: PartyInput): PartyResult {
  const { conditions: cond } = input;
  const filtered: PartyFiltered = {
    personal: 0,
    closed: 0,
    overBudget: 0,
    alcohol: 0,
  };
  const kept = [];
  for (const place of input.places) {
    const stats = input.statsOf(place.id);
    const c = toCandidate(place, input.center, engineStats(stats));
    if (c.distanceM > PARTY_RADIUS_M) continue;
    const reason = hardFilterReason(
      c,
      { avoid: input.avoid, budgetKRW: cond.budget },
      { blocked: input.blocked },
    );
    if (reason === "avoid" || reason === "blocked") {
      filtered.personal += 1;
      continue;
    }
    if (reason === "closed" || reason === "overBudget") {
      filtered[reason] += 1;
      continue;
    }
    if (cond.alcohol && ALCOHOL_EXCLUDED.includes(c.category)) {
      filtered.alcohol += 1;
      continue;
    }
    kept.push({ place, stats, candidate: c });
  }

  const scored = scoreAll(
    kept.map((k) => k.candidate),
    {
      meal: "dinner",
      budgetKRW: cond.budget,
      walkMinutes: PARTY_WALK_MINUTES,
      avoid: input.avoid,
      craving: { categories: [], until: null },
    },
    { visits: input.visits, blocked: input.blocked },
    input.now,
  );

  const picks: PartyPick[] = kept.map(({ place, stats, candidate: c }, i) => {
    const evidence = evidenceFor({
      category: c.category,
      priceReport: c.priceReport,
      roomReports: tagCount(stats, "private_room"),
      groupReports: tagCount(stats, "group_seats"),
      conditions: cond,
    });
    const price = resolvePrice(c.priceReport, c.category, "dinner");
    const total = c.thumbs.up + c.thumbs.down;
    return {
      id: c.id,
      name: c.name,
      placeUrl: place.placeUrl,
      categoryName: place.categoryName,
      category: c.category,
      position: place.position,
      walkMinutes: Math.max(1, Math.round(estimateWalkMinutes(c.distanceM))),
      price: {
        krw: price.priceKRW,
        estimate: price.source === "estimate",
        count: price.reportCount,
      },
      thumbsUpRate:
        total >= MIN_REVIEWS_FOR_REPUTATION
          ? thumbsUpPercent(c.thumbs.up, total)
          : null,
      evidence,
      metCount: evidence.filter((e) => e.status === "met").length,
      score: scored[i]?.score ?? 0,
    };
  });

  picks.sort(
    (a, b) =>
      b.metCount - a.metCount ||
      b.score - a.score ||
      a.walkMinutes - b.walkMinutes ||
      a.id.localeCompare(b.id),
  );
  return {
    picks: picks.slice(0, PARTY_RESULT_COUNT),
    eligibleCount: picks.length,
    filtered,
  };
}

/** 근거 줄 가운데 추정이나 정보 없음 비율(0~1). 0.6을 넘으면 콜드 스타트 안내 */
export function unknownShare(picks: readonly PartyPick[]): number {
  const all = picks.flatMap((p) => p.evidence);
  if (all.length === 0) return 0;
  return all.filter((e) => e.status !== "met").length / all.length;
}

export const COLD_SHARE = 0.6;

/** 화면 문장용 카테고리 이름 */
export function categoryName(slug: CategorySlug): string {
  return categoryLabel(slug);
}

/** 네이버 플레이스 이름 검색 주소(그 자리에서 만들고 저장하지 않는다, PARTY-04) */
export function naverPlaceHref(name: string): string {
  return `https://map.naver.com/p/search/${encodeURIComponent(name)}`;
}

export const NAVER_MAP_HREF =
  "https://map.naver.com/p/search/%EC%9D%8C%EC%8B%9D%EC%A0%90";
