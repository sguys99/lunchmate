// 제보와 신고 시안 목업 (T6.3). 지금은 2026-10-31(금) 12:24 KST로 둔다.
// 카카오 값(이름, 주소, 좌표)은 세션 메모리 값이라는 가정이고, 할인, 웨이팅, 후기는 place_id로 묶인 우리 데이터다.
import {
  EMPTY_PLACE_STATS,
  type PlaceDetailPlace,
  type PlaceDetailStats,
} from "@/features/place/detail-model";

export type DealType =
  | "lunchSpecial"
  | "discount"
  | "event"
  | "happyHour"
  | "etc";

export const DEAL_TYPES: readonly DealType[] = [
  "lunchSpecial",
  "discount",
  "event",
  "happyHour",
  "etc",
];

export type DealItem = {
  readonly id: string;
  readonly type: DealType;
  readonly text: string;
  /** "3일 전 제보" 같은 표시 문자열 */
  readonly reported: string;
  /** "11월 5일" */
  readonly until: string;
  /** "평일 점심" 같은 적용 요일과 시간대. 없으면 null */
  readonly when: string | null;
  /** 아직 해요 누른 사람 수 */
  readonly still: number;
  /** 끝났어요 누른 사람 수 (서로 다른 사용자 3명이면 숨김, AC-DEAL-3) */
  readonly ended: number;
};

export const PLACE: PlaceDetailPlace = {
  id: "10000001",
  placeUrl: "https://place.map.kakao.com/10000001",
  category: "gukbap",
  name: "정담 순대국",
  walkMinutes: 4,
  reason: "도보 약 4분, 지난주 👍한 국밥, 예산 안",
};

export const BUDGET_KRW = 10_000;

export const STATS: PlaceDetailStats = {
  priceReports: [8000, 8500, 9000, 9000, 9000, 9500, 11000, 12000],
  thumbs: { up: 20, down: 3 },
  tags: [
    { label: "혼밥 OK", count: 14 },
    { label: "15분 컷", count: 11 },
  ],
  reviews: [
    {
      id: "r1",
      nickname: "점심탐험가",
      visitMonth: 10,
      thumb: "up",
      text: "국물이 진하고 회전이 빨라서 12시 10분에 가도 금방 앉았어요.",
    },
    {
      id: "r2",
      nickname: "보리차",
      visitMonth: 10,
      thumb: "up",
      text: "순대 양이 넉넉합니다. 다대기는 따로 달라고 하면 줍니다.",
    },
    {
      id: "r3",
      nickname: "구일팔",
      visitMonth: 9,
      thumb: "down",
      text: "옆 가게가 훨씬 싸고 맛있어요. 여기 가지 말고 거기 가세요.",
    },
  ],
  reviewTotal: 23,
  waiting: { level: "short", minutesAgo: 12 },
  deal: {
    title: "점심특선 순대국 정식 9천 원",
    daysAgo: 3,
    untilLabel: "11월 5일",
  },
  myVisit: null,
};

export const STATS_EMPTY: PlaceDetailStats = {
  ...STATS,
  waiting: null,
  deal: null,
};

export const STATS_LOADING: PlaceDetailStats = EMPTY_PLACE_STATS;

export const DEALS: readonly DealItem[] = [
  {
    id: "d1",
    type: "lunchSpecial",
    text: "점심특선 순대국 정식 9천 원",
    reported: "3일 전 제보",
    until: "11월 5일",
    when: "평일 점심",
    still: 4,
    ended: 1,
  },
  {
    id: "d2",
    type: "discount",
    text: "포장하면 1천 원 할인",
    reported: "어제 제보",
    until: "11월 7일",
    when: null,
    still: 1,
    ended: 0,
  },
];

/** 신고 대상으로 쓰는 후기 (광고 의심) */
export const REPORTED_REVIEW_ID = "r3";

/** 사용자가 새로 쓴 할인 (done 단계에서 목록 맨 위) */
export const NEW_DEAL: DealItem = {
  id: "new",
  type: "happyHour",
  text: "오후 5시~7시 수육 반 접시 추가 무료",
  reported: "방금 제보",
  until: "11월 7일",
  when: "평일 저녁",
  still: 0,
  ended: 0,
};

/** 폼 채운 상태(오류, 금칙어 캡처용) */
export const FILLED_TEXT = "오후 5시~7시 수육 반 접시 추가 무료";
export const BANNED_TEXT = "사장님 번호로 연락 주면 더 깎아 줌, 경쟁 가게는 쓰레기";

/* ---------- 날짜 (표시용 목업, 실제 판정은 src/lib/time) ---------- */

const TODAY = { y: 2026, m: 10, d: 31 } as const;

/** 오늘에서 n일 뒤를 "11월 7일"로 */
export function dateAfter(days: number): string {
  const t = new Date(Date.UTC(TODAY.y, TODAY.m - 1, TODAY.d + days));
  return `${t.getUTCMonth() + 1}월 ${t.getUTCDate()}일`;
}

/** 종료일 선택지 (DEAL-01: 기본 7일, 최대 30일) */
export const UNTIL_OPTIONS = [
  { days: 3, label: "3일" },
  { days: 7, label: "7일" },
  { days: 14, label: "2주" },
  { days: 30, label: "30일" },
] as const;

export const DEFAULT_UNTIL_DAYS = 7;

/** 목업 지금 시각과 웨이팅 쿨다운 */
export const NOW_LABEL = "12시 24분";
export const COOLDOWN_UNTIL_LABEL = "12시 54분";
/** cooldown 단계: 내가 18분 전에 알림, 12분 남음 */
export const MY_WAIT = { minutesAgo: 18, left: 12 } as const;
export const MY_WAIT_COOLDOWN_LABEL = "12시 36분";
