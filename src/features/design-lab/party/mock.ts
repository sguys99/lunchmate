// 회식 모드 시안 목업과 근거 모델 (T7.3). 저장은 하지 않고 화면 상태만 바꾼다.
// 식당 이름, 카테고리, 거리는 카카오 세션 값이라 저장하지 않는다(CLAUDE.md 7장). 근거는 우리 집계(place_stats)에서 온다:
//   가격 제보 중앙값과 건수(price_median, price_count), 태그 상위 5(top_tags의 "룸 있음", "단체석"), 👍/👎.
// 주류는 태그가 없어 카카오 카테고리로 추정한다(술집은 충족, 카페, 분식, 샐러드, 패스트푸드는 뺌). G7 안건 3.
// 순수 함수라 실제 화면(T7.27)으로 옮길 때 src/features/party로 그대로 가져갈 수 있다.
import { CATEGORY_PRICE_ESTIMATE } from "@/features/place/price-estimate";
import { categoryLabel, type CategorySlug } from "@/features/place/categories";
import { partyLabCopy as copy } from "@/copy/design-lab-party";
import type { PartyParams } from "./params";

export type PartyConditions = {
  /** 2~40 (PARTY-01) */
  headcount: number;
  /** 1인 예산(원), 1만~10만, 5천 단위 */
  budget: number;
  room: boolean;
  alcohol: boolean;
};

export const HEADCOUNT_MIN = 2;
export const HEADCOUNT_MAX = 40;
export const BUDGET_MIN = 10_000;
export const BUDGET_MAX = 100_000;
export const BUDGET_STEP = 5_000;
/** B 빠른 선택 (3개 이하 원칙) */
export const QUICK_HEADCOUNTS = [4, 6, 8, 12] as const;
export const QUICK_BUDGETS = [30_000, 40_000, 50_000] as const;
/** 회식 후보 수 (PARTY-03) */
export const PARTY_RESULT_COUNT = 5;

/** 지난번 조건(C는 이 값으로 바로 결과를 보여 준다). 실제로는 기기에만 남긴다(안건 6) */
export const DEFAULT_CONDITIONS: PartyConditions = {
  headcount: 8,
  budget: 40_000,
  room: true,
  alcohol: true,
};

export type PartyCandidate = {
  id: string;
  name: string;
  category: CategorySlug;
  walkMinutes: number;
  /** 가격 제보 중앙값(원). 없으면 null(카테고리 저녁 추정가) */
  priceMedian: number | null;
  priceCount: number;
  /** 👍 비율. 후기 3건 미만이면 null */
  thumbsUpRate: number | null;
  /** 태그 "룸 있음" 제보 수(사람당 최신 하나) */
  roomReports: number;
  /** 태그 "단체석" 제보 수 */
  groupReports: number;
  /** 추천 점수 정규화 목업값(같은 근거 수 안에서 순서) */
  score: number;
};

/** 가상 식당. 이름은 지어낸 값이다 */
const POOL: readonly PartyCandidate[] = [
  {
    id: "party-gogi",
    name: "화로정",
    category: "gogi",
    walkMinutes: 9,
    priceMedian: 32_000,
    priceCount: 6,
    thumbsUpRate: 91,
    roomReports: 4,
    groupReports: 2,
    score: 0.86,
  },
  {
    id: "party-hansik",
    name: "소반 한상",
    category: "hansik",
    walkMinutes: 7,
    priceMedian: 28_000,
    priceCount: 3,
    thumbsUpRate: 86,
    roomReports: 3,
    groupReports: 0,
    score: 0.8,
  },
  {
    id: "party-pub",
    name: "달빛 이자카야",
    category: "pub",
    walkMinutes: 12,
    priceMedian: 34_000,
    priceCount: 5,
    thumbsUpRate: 78,
    roomReports: 0,
    groupReports: 3,
    score: 0.74,
  },
  {
    id: "party-jungsik",
    name: "진미 중화",
    category: "jungsik",
    walkMinutes: 11,
    priceMedian: null,
    priceCount: 0,
    thumbsUpRate: null,
    roomReports: 2,
    groupReports: 0,
    score: 0.7,
  },
  {
    id: "party-ilsik",
    name: "하루 스시",
    category: "ilsik",
    walkMinutes: 14,
    priceMedian: null,
    priceCount: 0,
    thumbsUpRate: 88,
    roomReports: 0,
    groupReports: 0,
    score: 0.77,
  },
  // 아래 둘은 조건에 걸려 빠진다(시연용)
  {
    id: "party-yangsik",
    name: "르 팡 비스트로",
    category: "yangsik",
    walkMinutes: 10,
    priceMedian: 52_000,
    priceCount: 4,
    thumbsUpRate: 90,
    roomReports: 1,
    groupReports: 0,
    score: 0.83,
  },
  {
    id: "party-cafe",
    name: "모래 베이커리",
    category: "cafe",
    walkMinutes: 5,
    priceMedian: 12_000,
    priceCount: 8,
    thumbsUpRate: 84,
    roomReports: 0,
    groupReports: 1,
    score: 0.6,
  },
];

/** 주류를 고르면 뺄 카테고리(안건 3 기본안) */
const ALCOHOL_EXCLUDED: readonly CategorySlug[] = [
  "cafe",
  "salad",
  "fastfood",
  "bunsik",
];

export type EvidenceKey = "budget" | "room" | "alcohol";
/** met 제보로 확인, estimate 카테고리로 추정, unknown 정보 없음(PARTY-04) */
export type EvidenceStatus = "met" | "estimate" | "unknown";
export type Evidence = {
  key: EvidenceKey;
  status: EvidenceStatus;
  text: string;
};

/** 표시할 1인 가격: 제보 중앙값, 없으면 카테고리 저녁 추정가 */
export function displayPrice(c: PartyCandidate): {
  krw: number;
  estimate: boolean;
} {
  return c.priceMedian !== null && c.priceCount > 0
    ? { krw: c.priceMedian, estimate: false }
    : { krw: CATEGORY_PRICE_ESTIMATE[c.category].dinner, estimate: true };
}

/** 조건별 근거. 끈 조건(룸, 주류)은 줄을 만들지 않는다. 예산은 늘 보인다 */
export function evidenceFor(
  c: PartyCandidate,
  cond: PartyConditions,
): Evidence[] {
  const out: Evidence[] = [];
  const price = displayPrice(c);
  out.push(
    price.estimate
      ? {
          key: "budget",
          status: "estimate",
          text: copy.evidence.budgetEstimate(price.krw),
        }
      : {
          key: "budget",
          status: "met",
          text: copy.evidence.budgetReport(price.krw, c.priceCount),
        },
  );
  if (cond.room) {
    if (c.roomReports > 0 || c.groupReports > 0) {
      // 큰 모임(10명 이상)은 단체석 근거를 앞에 둔다(안건 4)
      const preferGroup = cond.headcount >= 10 && c.groupReports > 0;
      const useRoom = !preferGroup && c.roomReports >= c.groupReports;
      out.push({
        key: "room",
        status: "met",
        text: useRoom
          ? copy.evidence.roomReport(c.roomReports)
          : copy.evidence.groupReport(c.groupReports),
      });
    } else {
      out.push({ key: "room", status: "unknown", text: copy.evidence.unknown });
    }
  }
  if (cond.alcohol) {
    out.push(
      c.category === "pub"
        ? { key: "alcohol", status: "met", text: copy.evidence.alcoholPub }
        : {
            key: "alcohol",
            status: "estimate",
            text: copy.evidence.alcoholLikely(categoryLabel(c.category)),
          },
    );
  }
  return out;
}

function metCount(c: PartyCandidate, cond: PartyConditions): number {
  return evidenceFor(c, cond).filter((e) => e.status === "met").length;
}

/**
 * 후보 고르기(시안 규칙, 실제는 T7.27).
 *  하드 필터: 주류를 고르면 카페, 분식, 샐러드, 패스트푸드 제외 / 가격 제보가 있고 예산을 넘으면 제외(REC와 같은 규칙).
 *  순서: 제보로 확인된 조건 수 많은 순, 같으면 점수 순. 룸/단체석은 하드 필터가 아니라 순서에만(PRD 축소안, 안건 2).
 */
export function rankCandidates(
  pool: readonly PartyCandidate[],
  cond: PartyConditions,
): PartyCandidate[] {
  return pool
    .filter((c) => !(cond.alcohol && ALCOHOL_EXCLUDED.includes(c.category)))
    .filter(
      (c) =>
        !(
          c.priceMedian !== null &&
          c.priceCount > 0 &&
          c.priceMedian > cond.budget
        ),
    )
    .sort((a, b) => metCount(b, cond) - metCount(a, cond) || b.score - a.score)
    .slice(0, PARTY_RESULT_COUNT);
}

/** 콜드 스타트: 제보가 거의 없는 동네 */
function coldPool(): PartyCandidate[] {
  return POOL.map((c, i) => ({
    ...c,
    priceMedian: i === 0 ? c.priceMedian : null,
    priceCount: i === 0 ? 1 : 0,
    thumbsUpRate: null,
    roomReports: 0,
    groupReports: i === 0 ? 1 : 0,
  }));
}

/** 쿼리에 맞는 후보. state=empty면 0곳, few=on이면 2곳 */
export function candidatesFor(
  p: PartyParams,
  cond: PartyConditions,
): PartyCandidate[] {
  if (p.state === "empty") return [];
  const ranked = rankCandidates(p.cold ? coldPool() : POOL, cond);
  return p.few ? ranked.slice(0, 2) : ranked;
}

/** 조건이 몇 개 정보 없음인가(콜드 스타트 안내를 띄울지) */
export function unknownShare(
  list: readonly PartyCandidate[],
  cond: PartyConditions,
): number {
  const all = list.flatMap((c) => evidenceFor(c, cond));
  if (all.length === 0) return 0;
  return all.filter((e) => e.status !== "met").length / all.length;
}

/** 지도 자리 위 핀 위치(장식용 고정값, 회사 기준 도보 15분 원 안) */
export const PARTY_PIN_POSITIONS = [
  { left: "58%", top: "36%" },
  { left: "40%", top: "58%" },
  { left: "70%", top: "64%" },
  { left: "30%", top: "34%" },
  { left: "52%", top: "78%" },
] as const;

/** 모바일 띠 지도(C, 높이 160): 원이 높이를 채워 핀을 가운데 띠에 모은다 */
export const PARTY_PIN_POSITIONS_COMPACT = [
  { left: "57%", top: "24%" },
  { left: "41%", top: "70%" },
  { left: "58%", top: "78%" },
  { left: "38%", top: "34%" },
  { left: "66%", top: "48%" },
] as const;

export const OFFICE_POSITION = { left: "50%", top: "52%" } as const;

/** 네이버 플레이스 검색 링크(이름은 세션 값, 링크만 만들고 저장하지 않는다) */
export function naverPlaceHref(name: string): string {
  return `https://map.naver.com/p/search/${encodeURIComponent(name)}`;
}

export const NAVER_MAP_HREF =
  "https://map.naver.com/p/search/%EC%9D%8C%EC%8B%9D%EC%A0%90";
