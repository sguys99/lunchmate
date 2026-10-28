// 오늘(홈) 화면 문구. 컴포넌트 안에 문장을 직접 쓰지 않는다 (CLAUDE.md 4장).
// 문체: 상태 안내는 습니다체, 제안과 질문은 해요체 (tasks.md 2.2절).
// design-lab 비교 화면(T1.11~T1.13)과 3단계 홈 시안이 함께 쓴다.
// 하단 탭, 다시 시도, 이전/다음 같은 공통 라벨은 common.ts에 있다.
import { commonCopy } from "./common";

export const homeCopy = {
  actions: {
    directions: "길찾기",
    reroll: "다시 뽑기",
    pollWithFriends: "친구랑 정하기",
  },
  badges: {
    estimate: "추정",
    report: "제보",
    deal: "할인",
    waiting: "웨이팅",
    avoidWarning: "못 먹는 분 있음",
  },
  waitingLevels: {
    walkIn: "바로 입장",
    short: "조금 기다려요",
    long: "줄 길어요",
  },
  /** PLACE-07 웨이팅 표시. 예: "12분 전, 줄 길어요" */
  waitingReport: (minutesAgo: number, levelLabel: string) =>
    `${minutesAgo}분 전, ${levelLabel}`,
  thumbsUpEmpty: "후기 모으는 중",
  /**
   * 빈 상태, 오류, 오프라인 문구. title은 지금 상태를 말하는 짧은 습니다체 문장(마침표 없음),
   * body는 다음에 일어날 일이나 할 일만 말한다(title을 되풀이하지 않는다). 제안은 해요체.
   */
  states: {
    loading: {
      label: "추천을 불러오는 중입니다",
    },
    empty: {
      title: (walkMinutes: number) =>
        `도보 ${walkMinutes}분 안에 조건에 맞는 식당이 없습니다`,
      body: (expandTo: number) => `${expandTo}분까지 넓혀볼까요?`,
      action: (expandTo: number) => `${expandTo}분까지 넓히기`,
    },
    error: {
      title: "식당 정보를 불러오지 못했습니다",
      body: "잠시 후 자동으로 다시 시도합니다.",
      action: commonCopy.actions.retry,
    },
    offline: {
      title: "인터넷에 연결되어 있지 않습니다",
      body: "연결되면 추천을 자동으로 다시 불러옵니다.",
      action: commonCopy.actions.retry,
    },
  },
} as const;

// 투표 득표 바와 상세 바텀시트 문구 (design-lab 비교 화면 2, T1.12).
export const pollPreviewCopy = {
  participants: (count: number) => `${count}명 참여`,
  votes: (count: number) => `${count}표`,
  deadline: (hhmm: string) => `${hhmm} 마감`,
  minutesLeft: (minutes: number) => `${minutes}분 남음`,
  myVote: "내 선택",
  vote: "투표하기",
  /** 득표가 하나도 없을 때 (design-lab 시트 화면의 empty 상태) */
  noVotes: "아직 투표한 사람이 없습니다. 먼저 골라 볼까요?",
} as const;

export const placeDetailCopy = {
  address: "주소",
  phone: "전화",
  hours: "영업시간",
  menu: "대표 메뉴",
  call: "전화 걸기",
  viewOnNaver: "네이버 플레이스에서 보기",
  addToPoll: "투표에 추가",
  favorite: "즐겨찾기",
  share: "공유",
  reviewCount: (count: number) => `후기 ${count}건`,
  priceReportCount: (count: number) => `제보 ${count}건`,
} as const;
