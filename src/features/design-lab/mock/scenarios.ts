// 홈과 투표 시연 시나리오 (T1.10). 시안 A/B/C와 3단계 홈 시안이 같은 데이터를 쓴다.
import { getMockPlace } from "./places";
import type { MockHomeScenario, MockPick, MockPoll } from "./types";

/**
 * 오늘 추천 3장 (서로 다른 카테고리).
 *  1. 정담국밥: 숫자 3개 + 이유 + 배지 2개(할인, 웨이팅)가 모두 보이는 카드
 *  2. 사이공 골목: 👍 null 콜드 스타트 + 추정 가격
 *  3. 하루미 식당: 배지 없는 기본 카드
 */
export const MOCK_HOME_TODAY: MockPick = [
  getMockPlace("mock-gukbap"),
  getMockPlace("mock-asian"),
  getMockPlace("mock-ilsik"),
];

/** "다시 뽑기"로 차례로 보여 줄 다음 세트 */
export const MOCK_HOME_REROLL_SETS: readonly MockPick[] = [
  [
    getMockPlace("mock-hansik"),
    getMockPlace("mock-yangsik"),
    getMockPlace("mock-salad"),
  ],
  [
    getMockPlace("mock-bunsik"),
    getMockPlace("mock-jungsik"),
    getMockPlace("mock-gogi"),
  ],
];

/** 오늘 세트 + 다시 뽑기 세트. index를 돌려 가며 쓴다 */
export const MOCK_HOME_ALL_SETS: readonly MockPick[] = [
  MOCK_HOME_TODAY,
  ...MOCK_HOME_REROLL_SETS,
];

/**
 * 배지 넘침 세트 (T3.2): 후보 배지가 3개 이상 겹치는 카드 3장. 기본 12곳을 바탕으로 배지와 웨이팅만 덧씌운다.
 * 홈 시안 비교에서 `?deck=overflow`로 본다. 랜딩과 PoC가 쓰는 MOCK_HOME_ALL_SETS에는 넣지 않는다.
 *  1. 홍운각: 기피 경고 + 줄 길어요 + 할인 (3개 → 기피, 웨이팅. 할인 빠짐). 기피 경고는 투표 후보 카드(POLL-13)에서만 생기지만,
 *     배지 줄 폭이 가장 넓어지는 조합이라 홈 카드에서도 확인한다.
 *  2. 초록접시: 추정 + 할인 + 조금 기다려요 (3개 → 웨이팅, 할인. 추정은 가격 옆)
 *  3. 화로담: 추정 + 바로 입장 + 할인 + 기피 경고 (4개 → 기피, 웨이팅. 할인 빠짐, 추정은 가격 옆)
 */
export const MOCK_HOME_BADGE_OVERFLOW: MockPick = [
  {
    ...getMockPlace("mock-jungsik"),
    statusBadges: ["avoidWarning", "waiting", "deal"],
    deal: { title: "탕수육 소 3천 원 할인" },
  },
  {
    ...getMockPlace("mock-salad"),
    statusBadges: ["estimate", "deal", "waiting"],
    waiting: { level: "short", minutesAgo: 3 },
  },
  {
    ...getMockPlace("mock-gogi"),
    statusBadges: ["estimate", "waiting", "deal", "avoidWarning"],
    waiting: { level: "walkIn", minutesAgo: 6 },
    deal: { title: "점심 특선 2천 원 할인" },
  },
];

export const MOCK_HOME_DEFAULT: MockHomeScenario = {
  walkLimitMinutes: 10,
  expandToMinutes: 15,
  picks: MOCK_HOME_TODAY,
};

/** 빈 상태: 도보 10분 안에 조건에 맞는 식당 0곳 */
export const MOCK_HOME_EMPTY: MockHomeScenario = {
  walkLimitMinutes: 10,
  expandToMinutes: 15,
  picks: [],
};

/**
 * 투표 시나리오: 참여 6명, 후보 4곳, 단일 선택, 11:50 마감.
 * 시각은 고정 문자열이다. 남은 시간은 mockNow 기준으로 src/lib/time 유틸(msUntil 등)로 계산한다.
 */
export const MOCK_POLL: MockPoll = {
  id: "mock-poll-1",
  title: "수요일 점심",
  meal: "lunch",
  participantCount: 6,
  multipleChoice: false,
  deadlineAt: "2026-10-28T11:50:00+09:00",
  mockNow: "2026-10-28T11:32:00+09:00",
  myVotePlaceId: "mock-gukbap",
  candidates: [
    { placeId: "mock-gukbap", votes: 3, avoidWarning: false },
    { placeId: "mock-hansik", votes: 2, avoidWarning: false },
    { placeId: "mock-jungsik", votes: 1, avoidWarning: true },
    { placeId: "mock-fastfood", votes: 0, avoidWarning: false },
  ],
};

/** 바텀시트 상세 시연 기본 식당 (배지와 메뉴가 모두 있는 카드) */
export const MOCK_DETAIL_PLACE = getMockPlace("mock-gukbap");
