// 디자인 랩 시안 B "Quiet Stone" 비교 화면 문구 (T1.11~T1.13).
// 공용 문구(homeCopy, pollPreviewCopy, placeDetailCopy)에 없는 것만 둔다.
// 문체: 상태 안내는 습니다체, 제안은 해요체 (tasks.md 2.2절). 라벨은 명사형.
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
    close: "닫기",
    open: (name: string) => `${name} 상세 열기`,
    pollLabel: "투표",
    pollMeta: (participants: string, deadline: string) =>
      `${participants}, ${deadline}`,
    voteFor: (name: string) => `${name}에 투표`,
    leading: "현재 1위",
    voteUnit: "표",
  },
} as const;
