// 추천 엔진 문구 (T5.6, T5.10). 추천 이유 조각은 명사형이라 문체 비율에서 빠진다(copy-guide 4.1절).
// 조각은 쉼표로 잇는다(중간점 금지). 할인, 제휴는 추천 이유에 절대 쓰지 않는다(제품 원칙 6).
// 기피 판정 한계 안내는 상태 안내라 습니다체.

export const recCopy = {
  reason: {
    separator: ", ",
    /** "도보 약 4분"은 src/lib/format formatWalkMinutes가 만든다 */
    likedPlace: {
      today: (label: string) => `오늘 👍한 ${label}`,
      yesterday: (label: string) => `어제 👍한 ${label}`,
      recent: (label: string) => `최근 👍한 ${label}`,
      lastWeek: (label: string) => `지난주 👍한 ${label}`,
      older: (label: string) => `예전에 👍한 ${label}`,
    },
    craving: (label: string) => `요즘 땡기는 ${label}`,
    likedCategory: (label: string) => `👍한 적 있는 ${label}`,
    /** 제보 가격이 있을 때. band는 "9천 원대" */
    budgetReported: (band: string) => `예산 안 1인 ${band}`,
    reputation: (percent: number) => `👍 ${percent}%`,
    novelty: (label: string) => `최근 3일 안 먹은 ${label}`,
    newPlace: "새로 찾은 곳",
  },
  /** 기피 음식 판정 한계 (D-07 안건 4, T5.6). 못 먹는 음식 설정 화면과 상세에서 쓴다 */
  avoidLimit:
    "못 먹는 음식은 식당 이름과 업종으로만 거릅니다. 메뉴 재료까지는 확인하지 못하니 알레르기가 있다면 주문 전에 꼭 확인해 주세요.",
} as const;
