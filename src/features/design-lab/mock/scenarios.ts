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
