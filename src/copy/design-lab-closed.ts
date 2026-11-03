// "지금 안 열었어요" 제보 시안 문구 (T9.18, /design-lab/closed/<a|b|c>).
// 문체: 상태, 안내, 결과는 습니다체. 질문은 해요체. 버튼, 메뉴 항목은 명사형(비율 제외).
// 목업 식당 이름은 design-lab/mock의 지어낸 이름이다. 상태 title은 마침표 없는 짧은 습니다체(common.ts 규칙).
import { commonCopy } from "./common";

export const closedLabCopy = {
  names: {
    a: "영업 제보 시안 A 상세 지금 행",
    b: "영업 제보 시안 B 카드에서 바로 바꾸기",
    c: "영업 제보 시안 C 길찾기 뒤 확인",
  },

  home: {
    title: "오늘의 추천",
    eyebrow: "11월 4일 수요일 점심",
    place: "회사",
    spot: "오늘의 한 곳",
    reason: "도보 약 4분, 새로 찾은 곳",
    others: "또는 이 두 곳",
    walk: (m: number) => `${m}분`,
    detail: "상세",
    more: "다른 행동 더 보기",
    directions: "길찾기",
    justPick: "그냥 골라줘",
    reroll: "다시 뽑기",
    hours: "영업시간 보기",
    hoursHint: "네이버 플레이스에서 엽니다",
  },

  /** 세 안 공통: 카드 배지(그 끼니 동안) */
  badge: {
    one: "오늘 쉰다는 제보",
    label: (n: number) => `이번 끼니에 문이 닫혀 있었다는 제보 ${n}건`,
  },

  /** A: 상세 "지금" 행 */
  a: {
    sheetTitle: "정담국밥",
    nowTitle: "지금",
    closedAsk: "가 보니 문이 닫혀 있었나요?",
    closedButton: "오늘 닫혀 있어요",
    closedDone: (time: string) =>
      `${time}에 알렸습니다. 이번 점심 동안 다른 분들께 보입니다.`,
    undo: "취소",
    waitTitle: "줄은 어땠나요?",
    wait: ["바로 입장", "조금 기다려요", "줄 길어요"] as const,
    note: "두 분 이상 알리면 이번 점심 추천에서 뺍니다.",
  },

  /** B: 카드 더 보기 메뉴 */
  b: {
    menuLabel: "정담국밥 다른 행동",
    menu: {
      closed: "문이 닫혀 있어요",
      hours: "영업시간 보기",
      favorite: "즐겨찾기",
      block: "다시 안 갈래요",
      poll: "투표에 추가",
    },
    done: "정담국밥은 닫혀 있다고 알렸습니다. 다른 곳을 골랐습니다.",
    undo: "되돌리기",
  },

  /** C: 길찾기 뒤 확인 */
  c: {
    ask: (name: string) => `${name}, 문 열려 있었나요?`,
    open: "열려 있었어요",
    closed: "닫혀 있었어요",
    doneTitle: "알려 줘서 고마워요. 가까운 다른 곳입니다.",
    altWalk: (m: number) => `도보 약 ${m}분`,
    altDirections: "여기로 길찾기",
    openThanks: "확인했습니다.",
  },

  states: {
    empty: {
      title: "조건에 맞는 곳이 없습니다",
      body: "도보 시간을 조금 늘려 보시겠어요?",
      action: "도보 15분으로 넓히기",
    },
    error: {
      title: "추천을 불러오지 못했습니다",
      body: "잠시 뒤 다시 시도해 주세요.",
      action: commonCopy.states.error.action,
    },
    offline: {
      title: commonCopy.states.offline.title,
      body: commonCopy.states.offline.body,
      action: commonCopy.states.offline.action,
    },
    offlineReport: "인터넷에 연결되면 알릴 수 있습니다.",
  },
} as const;
