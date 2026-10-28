// 디자인 랩 시안 C "Clay Grid" 비교 화면 문구 (T1.11~T1.13).
// 공용 문구(homeCopy, pollPreviewCopy, placeDetailCopy)에 없는 것만 둔다.
// 문체: 상태 안내는 습니다체, 제안은 해요체 (tasks.md 2.2절). 버튼과 라벨은 명사형.
export const clayGridCopy = {
  weekdays: ["일", "월", "화", "수", "목", "금", "토"],
  meals: { lunch: "점심", dinner: "저녁" },
  /** 상단 맥락 한 줄. 예: "10월 28일 수요일 점심" */
  context: (month: number, day: number, weekday: string, meal: string) =>
    `${month}월 ${day}일 ${weekday}요일 ${meal}`,
  title: { lunch: "오늘 점심", dinner: "오늘 저녁" },
  /** 제목 아래 설명. 예: "도보 10분 안에서 세 곳을 골랐습니다." */
  subtitle: (walkMinutes: number) =>
    `도보 ${walkMinutes}분 안에서 세 곳을 골랐습니다.`,
  picksLabel: "오늘 추천 세 곳",
  rerolled: "새로 세 곳을 골랐습니다.",
  metrics: {
    walk: "도보",
    walkUnit: "분",
    price: "1인 가격",
    priceUnitThousand: "천 원대",
    priceUnitTenThousand: "만 원대",
    thumbs: "👍",
    thumbsUnit: "%",
  },
  /** 주 버튼. 선택한 식당 기준. 예: "정담국밥 길찾기" */
  directionsTo: (name: string) => `${name} 길찾기`,
  selectedHint: "카드를 누르면 길찾기 대상이 바뀝니다.",
  empty: {
    rulerLabel: "검색 범위",
    minutes: (n: number) => `${n}분`,
  },
  sheet: {
    close: "닫기",
    loadingTitle: "식당 정보",
    pollMeta: (participants: string, deadline: string) =>
      `${participants}, ${deadline}`,
    minutesLeftUnit: "분 남음",
    votesUnit: "표",
    leading: "1위",
    voteHint: "후보를 누르면 내 표를 옮깁니다.",
    pollLabel: (title: string) => `${title} 투표 후보`,
    callAria: (phone: string) => `${phone}로 전화 걸기`,
  },
} as const;
