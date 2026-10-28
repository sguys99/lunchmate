// 디자인 랩 시안 B "Quiet Stone" 화면 문구 (T1.11~T1.13, 일러스트 확인 페이지 T1.5).
// 공용 문구(commonCopy, homeCopy, pollPreviewCopy, placeDetailCopy)에 없는 것만 둔다.
// 문체: 상태 안내는 습니다체, 제안은 해요체 (tasks.md 2.2절). 라벨은 명사형.
// G3 홈 구현 때 실제 화면 문구는 home.ts로 옮기고, 남은 시안 전용 문구만 여기 둔다.
import { commonCopy } from "./common";

export const quietStoneScreenCopy = {
  title: "오늘의 추천",
  /** 예: "10월 28일 수요일 점심" */
  dateLine: (month: number, day: number, weekday: string, meal: string) =>
    `${month}월 ${day}일 ${weekday}요일 ${meal}`,
  weekdays: ["일", "월", "화", "수", "목", "금", "토"],
  meals: { lunch: "점심", dinner: "저녁" },

  numbers: {
    walk: "도보",
    price: "1인",
    thumbs: "만족",
    walkUnit: "분",
    thumbsUnit: "%",
  },

  carousel: {
    label: "오늘 추천 세 곳",
    slide: (index: number, total: number) => `${total}곳 중 ${index}번째`,
    announce: (index: number, total: number, name: string) =>
      `${total}곳 중 ${index}번째, ${name}`,
    goTo: (name: string) => `${name} 보기`,
    previous: "이전 식당",
    next: "다음 식당",
    rerolled: "새 추천 세 곳을 불러왔습니다.",
  },

  desktopListLabel: "오늘 추천 목록",
  directionsTo: (name: string) => `${name} 길찾기`,

  sheet: {
    close: commonCopy.actions.close,
    open: (name: string) => `${name} 상세 열기`,
    pollLabel: "투표",
    pollMeta: (participants: string, deadline: string) =>
      `${participants}, ${deadline}`,
    voteFor: (name: string) => `${name}에 투표`,
    leading: "현재 1위",
    voteUnit: "표",
  },
} as const;

/**
 * /design-lab/illustrations/b 확인 페이지 (T1.5). 숫자 라벨과 단위는 quietStoneScreenCopy.numbers,
 * 길찾기는 homeCopy.actions를 쓴다. T2.8에서 운영 일러스트로 옮길 때 페이지와 함께 지운다.
 */
export const quietStoneIllustrationsCopy = {
  metaTitle: "시안 B 일러스트",
  eyebrow: "시안 B",
  title: "Quiet Stone",
  description:
    "가는 선화 12종과 제목 세리프 견본입니다. 왼쪽은 라이트, 오른쪽은 다크 토큰입니다.",
  lightLabel: "라이트",
  darkLabel: "다크",
  specimenLabel: "제목 세리프",
  specimenDisplay: "오늘 점심은 여기로 정했어요",
  specimenTitle: "오늘의 추천",
  illustrationsLabel: "카테고리 일러스트",
  cardLabel: "추천 카드 예시",
  secondaryAction: "다른 곳",
} as const;
