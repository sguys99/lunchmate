// 디자인 랩 시안 A "Terracotta Table" 비교 화면 전용 문구 (T1.11~T1.13).
// 공용 문구(homeCopy, pollPreviewCopy, placeDetailCopy)를 먼저 쓰고, 시안 A에만 필요한 말만 여기에 둔다.
// 문체: 상태 안내는 습니다체, 제안과 질문은 해요체 (tasks.md 2.2절). Em dash, 중간점 금지.
export const designLabACopy = {
  brand: "런치메이트",
  weekdays: ["일", "월", "화", "수", "목", "금", "토"] as const,
  meals: { lunch: "점심", dinner: "저녁" },
  /** 예: "10월 28일 수요일 점심" */
  context: (month: number, day: number, weekday: string, meal: string) =>
    `${month}월 ${day}일 ${weekday}요일 ${meal}`,
  title: {
    lunch: "오늘 점심, 여기 어때요?",
    dinner: "오늘 저녁, 여기 어때요?",
  },

  stack: {
    /** 카드 묶음 영역의 이름과 역할 설명 (스크린 리더) */
    label: "오늘 추천 3곳",
    roleDescription: "추천 카드 묶음",
    slideRoleDescription: "추천 카드",
    position: (index: number, total: number) => `${total}곳 중 ${index}번째`,
    swipeHint: "좌우로 밀거나 화살표 키로 넘깁니다",
    rerolled: "새 추천 3곳을 불러왔습니다",
  },

  numbers: {
    walk: "도보",
    walkUnit: "분",
    price: "1인",
    thumbs: "만족도",
    thumbsUnit: "%",
  },

  map: {
    office: "사무실",
    openDetail: (name: string) => `${name} 상세 열기`,
    selectPlace: (name: string) => `${name} 선택`,
  },

  sheet: {
    close: "닫기",
    pollTitle: (title: string) => `${title} 투표`,
    votesUnit: "표",
    minutesLeftUnit: "분 남음",
    leader: "현재 1위",
    voteFor: (name: string) => `${name}에 투표`,
  },
} as const;
