// design-lab 목업 데이터 타입 (T1.10). 실제 카카오 데이터는 쓰지 않는다 (CLAUDE.md 7장).
import type { CategorySlug } from "@/features/place/categories";
import type { MockPlaceId } from "./places";

/** 최대 2개까지 담는 목록 (태그, 상태 배지). 타입에서 개수를 막는다. */
export type UpToTwo<T> = readonly [] | readonly [T] | readonly [T, T];

export type PriceSource = "report" | "estimate";

/** 카드 상태 배지 (REC-06). 우선순위 규칙은 T3.2에서 정한다. */
export type StatusBadge = "estimate" | "deal" | "waiting" | "avoidWarning";

/** PLACE-07 웨이팅 3단계: 바로 입장 / 조금 기다려요 / 줄 길어요 */
export type WaitingLevel = "walkIn" | "short" | "long";

export type MockMenuItem = {
  name: string;
  priceKRW: number;
};

export type MockPlace = {
  id: string;
  name: string;
  category: CategorySlug;
  /** 도보 분 (정수, 2~15) */
  walkMinutes: number;
  /** 1인 가격 대표값. report면 제보 중앙값, estimate면 카테고리 추정값 */
  priceKRW: number;
  priceSource: PriceSource;
  /** 가격 제보 수. estimate면 0 */
  priceReportCount: number;
  /** 👍 비율 0~100. 후기 3건 미만이면 null (콜드 스타트) */
  thumbsUpRate: number | null;
  reviewCount: number;
  tags: UpToTwo<string>;
  /** 추천 이유 1줄 (명사형) */
  reason: string;
  statusBadges: UpToTwo<StatusBadge>;
  /** statusBadges에 deal이 있을 때 상세에 보여 줄 할인 내용 */
  deal?: { title: string };
  /** statusBadges에 waiting이 있을 때의 최근 제보 */
  waiting?: { level: WaitingLevel; minutesAgo: number };
  /** 상세용 가상 주소 */
  address: string;
  /** 상세용 가상 번호 (02-0000-xxxx) */
  phone: string;
  /** 영업시간 요약 */
  hours: string;
  /** 대표 메뉴 2~3개 */
  menu: readonly MockMenuItem[];
};

export type MockPick = readonly [MockPlace, MockPlace, MockPlace];

export type MockHomeScenario = {
  /** 허용 도보 분 (빈 상태 문구에 쓴다) */
  walkLimitMinutes: number;
  /** 빈 상태에서 제안할 확장 도보 분 */
  expandToMinutes: number;
  picks: MockPick | readonly [];
};

export type MockPollCandidate = {
  /** 목업 식당 id. 타입으로 고정해 getMockPlace()가 항상 찾게 한다 */
  placeId: MockPlaceId;
  votes: number;
  /** POLL-13 참여자 기피 경고 플래그 (누구인지, 무엇인지는 없음) */
  avoidWarning: boolean;
};

export type MockPoll = {
  id: string;
  title: string;
  meal: "lunch" | "dinner";
  participantCount: number;
  multipleChoice: boolean;
  /** 마감 시각 (ISO, KST 오프셋 고정값) */
  deadlineAt: string;
  /** 시연 기준 현재 시각 (ISO 고정값). 실제 시계 대신 이 값으로 남은 시간을 계산한다 */
  mockNow: string;
  myVotePlaceId: MockPlaceId | null;
  candidates: readonly MockPollCandidate[];
};
