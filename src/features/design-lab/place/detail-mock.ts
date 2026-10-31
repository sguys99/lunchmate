// 식당 상세 시안 목업 (T5.2). 후기, 가격 제보, 태그 집계는 6단계 데이터라 여기서 지어낸다.
// 카카오에서 오는 값(이름, 주소, 전화, 좌표, 카테고리)은 화면에서 세션 메모리로만 쓰고 저장하지 않는다(CLAUDE.md 7장).
// 우리 DB에서 오는 값은 place_id 기준 집계(가격 중앙값, 👍 수, 태그 빈도)와 공개 후기뿐이다(AC-FB-2: 비공개 후기 텍스트 없음).
import { getMockPlace, type MockPlace } from "@/features/design-lab/mock";

export type DetailReview = {
  id: string;
  /** public_profiles 뷰의 닉네임 (PRD 11.2) */
  nickname: string;
  /** 방문 시기는 월까지만 (PRD 11.2) */
  visitMonth: number;
  thumb: "up" | "down";
  text: string;
  tags: readonly string[];
};

export type PlaceDetail = {
  place: MockPlace;
  /** 가격 제보 값(원). 비어 있으면 카테고리 추정값(place.priceKRW)을 쓴다 */
  priceReports: readonly number[];
  thumbs: { up: number; down: number };
  /** 태그 빈도 상위 5개, 많은 순 */
  tags: readonly { label: string; count: number }[];
  /** 공개 후기 최신순. null이면 불러오지 못했다(오프라인) */
  reviews: readonly DetailReview[] | null;
  /** 공개 후기 전체 수 (목록은 앞 3건만) */
  reviewTotal: number;
  /** 할인 제보 (DEAL-02) */
  deal: { title: string; daysAgo: number; until: string } | null;
  /** PLACE-06 내 방문 기록 (P1) */
  myVisit: { dateLabel: string } | null;
  /** 내 점심 예산 (SET-02). C안 가격 막대에 쓴다 */
  budgetKRW: number;
};

/** 중앙값. 짝수 개면 가운데 두 값의 평균을 천 원 단위로 내린다. 빈 배열이면 null */
export function medianPrice(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? null;
  const a = sorted[mid - 1] ?? 0;
  const b = sorted[mid] ?? 0;
  return Math.floor((a + b) / 2 / 500) * 500;
}

/** 가격 칸에 쓸 대표값: 제보 중앙값, 없으면 카테고리 추정값 */
export function representativePrice(d: PlaceDetail): {
  value: number;
  estimate: boolean;
} {
  const median = medianPrice(d.priceReports);
  return median === null
    ? { value: d.place.priceKRW, estimate: true }
    : { value: median, estimate: false };
}

/** 👍 비율을 보여도 되는 최소 표본 (콜드 스타트, PRD 7장 "후기 3건 미만이면 C 중립") */
export const THUMBS_MIN_SAMPLE = 3;

export function thumbsTotal(d: PlaceDetail): number {
  return d.thumbs.up + d.thumbs.down;
}

const gukbap = getMockPlace("mock-gukbap");
const asian = getMockPlace("mock-asian");
const cafe = getMockPlace("mock-cafe");

/** 데이터가 넉넉한 식당 (기본) */
export const DETAIL_FULL: PlaceDetail = {
  place: gukbap,
  priceReports: [8000, 8500, 9000, 9000, 9000, 9500, 11000],
  thumbs: { up: 20, down: 3 },
  tags: [
    { label: "혼밥 OK", count: 14 },
    { label: "15분 컷", count: 11 },
    { label: "가성비", count: 9 },
    { label: "양 많음", count: 6 },
    { label: "웨이팅 적음", count: 3 },
  ],
  reviews: [
    {
      id: "r1",
      nickname: "점심탐험가",
      visitMonth: 10,
      thumb: "up",
      text: "국물이 진하고 회전이 빨라서 12시 10분에 가도 금방 앉았어요.",
      tags: ["15분 컷", "혼밥 OK"],
    },
    {
      id: "r2",
      nickname: "보리차",
      visitMonth: 10,
      thumb: "up",
      text: "순대 양이 넉넉합니다. 다대기는 따로 달라고 하면 줍니다.",
      tags: ["양 많음"],
    },
    {
      id: "r3",
      nickname: "구일팔",
      visitMonth: 9,
      thumb: "down",
      text: "점심 피크에는 자리가 좁아서 넷이 가기엔 불편했어요.",
      tags: [],
    },
  ],
  reviewTotal: 23,
  deal: { title: "점심 세트 1천 원 할인", daysAgo: 3, until: "11월 5일" },
  myVisit: { dateLabel: "10월 24일" },
  budgetKRW: 10000,
};

/** 표본이 적은 식당 (?data=sparse): 추정 가격, 후기 1건 */
export const DETAIL_SPARSE: PlaceDetail = {
  place: asian,
  priceReports: [],
  thumbs: { up: 1, down: 0 },
  tags: [{ label: "조용함", count: 1 }],
  reviews: [
    {
      id: "s1",
      nickname: "쌀국수러버",
      visitMonth: 10,
      thumb: "up",
      text: "양지 쌀국수 국물이 깔끔했어요.",
      tags: ["조용함"],
    },
  ],
  reviewTotal: 1,
  deal: null,
  myVisit: null,
  budgetKRW: 10000,
};

/** 빈 상태 (?state=empty): 후기 0건, 가격 제보 0건 */
export const DETAIL_EMPTY: PlaceDetail = {
  place: { ...cafe, statusBadges: [], waiting: undefined },
  priceReports: [],
  thumbs: { up: 0, down: 0 },
  tags: [],
  reviews: [],
  reviewTotal: 0,
  deal: null,
  myVisit: null,
  budgetKRW: 10000,
};

/** 오프라인: 세션 메모리에 남은 식당 정보만, 후기는 불러오지 못함 */
export const DETAIL_OFFLINE: PlaceDetail = {
  ...DETAIL_FULL,
  reviews: null,
};

/** 목업 카카오맵 링크 (place_url 자리). 실제 장소 링크가 아니다 */
export const MOCK_PLACE_URL = "https://place.map.kakao.com/";
/** 네이버 지도 웹 검색 (PRD 12장 카카오 장애 대체 동작) */
export const NAVER_MAP_SEARCH_URL = "https://map.naver.com/p/search/";
