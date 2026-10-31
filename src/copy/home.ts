// 오늘(홈) 화면 문구. 컴포넌트 안에 문장을 직접 쓰지 않는다 (CLAUDE.md 4장).
// 문체: 상태 안내는 습니다체, 제안과 질문은 해요체 (tasks.md 2.2절).
// design-lab 비교 화면(T1.11~T1.13)과 3단계 홈 시안이 함께 쓴다.
// 하단 탭, 다시 시도, 이전/다음 같은 공통 라벨은 common.ts에 있다.
import { badgeCopy } from "./badges";
import { commonCopy } from "./common";

const actions = {
  directions: "길찾기",
  reroll: "다시 뽑기",
  pollWithFriends: "친구랑 정하기",
} as const;

export const homeCopy = {
  actions,
  /** 배지 문구 정본은 badges.ts(T2.9). 기존 사용처를 위해 같은 값을 가리킨다 */
  badges: badgeCopy.labels,
  waitingLevels: badgeCopy.waitingLevels,
  waitingReport: badgeCopy.waitingReport,
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
      // 재시도 1회가 끝난 뒤 보이는 화면이라 자동 재시도를 약속하지 않는다 (PRD 12장, copy-guide 4.3절)
      body: "잠시 후 다시 시도해 주세요.",
      action: commonCopy.actions.retry,
    },
    offline: {
      title: "인터넷에 연결되어 있지 않습니다",
      body: "연결되면 추천을 자동으로 다시 불러옵니다.",
      action: commonCopy.actions.retry,
    },
  },

  /**
   * 오늘(홈) 화면 (T5.15~T5.25, G3 D1, DESIGN.md 5장 "오늘(홈) 화면").
   * 디자인 랩 D1 확인 화면(design-lab-home.ts)도 이 값을 그대로 쓴다.
   */
  today: {
    metaTitle: "오늘",
    title: "오늘의 추천",
    /** 예: "10월 28일 수요일" */
    dateLine: (month: number, day: number, weekday: string) =>
      `${month}월 ${day}일 ${weekday}요일`,
    weekdays: ["일", "월", "화", "수", "목", "금", "토"],

    meal: {
      label: "끼니",
      lunch: "점심",
      dinner: "저녁",
      changed: (meal: string) => `${meal} 추천으로 바꿨습니다.`,
    },

    location: {
      label: "기준 위치",
      options: {
        office: "기본 사무실",
        other: "다른 사무실",
        here: "현위치",
      },
      /** 칩의 스크린 리더 이름. 보이는 글자를 그대로 품는다 */
      chipLabel: (name: string) => `기준 위치 ${name}, 바꾸기`,
      changed: (name: string) => `${name} 기준으로 다시 추천했습니다.`,
      menuLabel: "기준 위치 고르기",
      defaultMark: "기본",
      locating: "현위치를 확인하는 중입니다",
      /** PRD 12장 위치 권한 거부 */
      deniedNotice:
        "현위치를 쓰려면 위치 권한이 필요합니다. 지금은 기본 사무실 기준으로 추천합니다.",
      unavailableNotice:
        "현위치를 확인하지 못했습니다. 지금은 기본 사무실 기준으로 추천합니다.",
      /** 둘러보기(비로그인): 로그인 유도 시트를 연다 */
      saveOffice: "회사 위치 저장",
      /** 로그인했지만 사무실이 없을 때: 사무실 추가 화면으로 */
      addOffice: "회사 위치 정하기",
      guestNote: "둘러보기 중에는 설정이 저장되지 않습니다.",
    },

    /** 위치를 하나도 쓸 수 없을 때 (PRD 12장 사무실 미설정 + 권한 거부) */
    needLocation: {
      title: "위치를 알 수 없어 추천하지 못했습니다",
      denied:
        "위치 권한을 허용하면 현위치로 추천합니다. 회사 위치를 저장해 둘까요?",
      unavailable:
        "현위치를 확인하지 못했습니다. 다시 찾거나 회사 위치를 저장해 주세요.",
      retry: "현위치 다시 찾기",
    },

    actions: {
      ...actions,
      justPick: "그냥 골라줘",
      detail: "상세",
      directionsTo: (name: string) => `${name} 길찾기`,
      detailOf: (name: string) => `${name} 상세`,
      /** 큰 카드 "상세" 옆 더 보기(즐겨찾기, 다시 안 갈래요, 투표에 추가, T5.20) */
      moreOf: (name: string) => `${name} 다른 행동 더 보기`,
      /** 길찾기를 여는 동안(앱 확인 최대 1.5초) */
      opening: "여는 중",
      why: "왜 추천했나요?",
      party: "회식 모드",
      entriesLabel: "같이 정하기",
    },

    numbers: {
      walk: "도보",
      price: "1인",
      thumbs: "만족",
      walkUnit: "분",
      thumbsUnit: "%",
    },

    rerolled: "새 추천 세 곳을 불러왔습니다.",
    /** 다시 안 갈래요로 큰 카드를 바꾼 뒤(T5.20). 토스트와 따로 스크린 리더에 알린다 */
    blockedReplaced: "그 식당은 빼고 다른 곳을 골랐습니다.",
    blockRestored: "되돌렸습니다. 다시 추천합니다.",
    /** 다시 뽑기를 거듭해 이번 세션 후보를 다 본 뒤 (REC-05) */
    recycled: "모두 한 번씩 보여 드렸습니다. 처음부터 다시 고릅니다.",

    /** 후보 부족 (REC-09, PRD 12장) */
    shortage: {
      few: (count: number) => `조건에 맞는 곳이 ${count}곳뿐입니다.`,
      overBudget: (count: number) =>
        `예산 조건을 풀면 ${count}곳이 더 있습니다.`,
      relaxBudget: "예산 조건 풀기",
      widen: (to: number) => `도보 ${to}분까지 넓혀볼까요?`,
      widenAction: (to: number) => `${to}분까지 넓히기`,
      /** 가장 넓은 도보 거리에서도 0곳일 때 */
      maxedBody: "못 먹는 음식이나 예산 조건을 바꿔 볼까요?",
      editSettings: "조건 바꾸기",
      widened: (to: number) => `도보 ${to}분까지 넓혀 다시 추천했습니다.`,
      budgetRelaxed: "예산 조건을 풀고 다시 추천했습니다.",
    },

    /** 카카오 오류, 한도 초과 (T5.24, PRD 12장) */
    error: {
      naverLink: "네이버 지도에서 주변 식당 보기",
      naverQuery: "음식점",
    },

    /** "그냥 골라줘" R1 연출과 결과 카드 (REC-12, G3 D-05) */
    justPick: {
      dialogLabel: "그냥 골라줘 결과",
      picking: "세 곳 중에서 고르고 있습니다.",
      skip: "바로 보기",
      /** 결과 카드 위 세리프 한 줄 (축하, 해요체) */
      settled: "오늘은 여기로 가요.",
      /** 스크린 리더 결과 안내 */
      announce: (name: string) => `${name}, 오늘은 여기로 가요.`,
      again: "다시 고르기",
      close: "닫기",
    },

    /** 오늘의 한 곳 (큰 카드, 대안, 하단 행동 줄) */
    single: {
      eyebrow: "오늘의 한 곳",
      alternatives: "또는 이 두 곳",
      alternativesOne: "또는 이 곳",
      /** 대안 카드 버튼의 보이지 않는 끝말. 이름은 보이는 글자 + 이 말(axe label-content-name-mismatch, T3.5) */
      swapHint: "크게 보기",
      swapped: (name: string) => `오늘의 한 곳을 바꿨습니다. ${name}입니다.`,
      /** 하단 고정 행동 줄 */
      actionsLabel: "오늘의 한 곳 행동",
      /** 카드 순서 낭독 (T5.25) */
      order: (index: number, total: number) => `${total}곳 중 ${index}번째`,
      listLabel: "오늘 추천 식당",
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
  noVotes: "아직 투표한 사람이 없습니다. 먼저 골라볼까요?",
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
