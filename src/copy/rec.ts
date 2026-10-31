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
  /**
   * "왜 추천했나요?" 펼치기 (REC-07, T5.19). 점수 요소를 사람이 읽는 문장으로. 설명이라 습니다체.
   * 조사(을/를, 이/가)는 src/features/rec/why.ts가 받침을 보고 붙인다.
   */
  why: {
    title: "왜 추천했나요?",
    distance: (minutes: number) => `도보 약 ${minutes}분 거리라 가깝습니다.`,
    likedPlace: {
      today: "오늘 이 집에 👍를 남겼습니다.",
      yesterday: "어제 이 집에 👍를 남겼습니다.",
      recent: "최근 이 집에 👍를 남겼습니다.",
      lastWeek: "지난주 이 집에 👍를 남겼습니다.",
      older: "예전에 이 집에 👍를 남겼습니다.",
    },
    craving: (labelWithParticle: string) =>
      `요즘 땡긴다고 고른 ${labelWithParticle} 먼저 찾았습니다.`,
    likedCategory: (label: string) => `👍를 남긴 적 있는 ${label} 집입니다.`,
    budget: (band: string) => `제보된 1인 가격이 ${band}로 예산 안입니다.`,
    reputation: (percent: number) => `후기의 ${percent}%가 👍입니다.`,
    novelty: (labelWithParticle: string) =>
      `최근 3일 동안 ${labelWithParticle} 먹지 않았습니다.`,
    newPlace: "아직 가 본 기록이 없는 곳입니다.",
    coldStart: "후기가 3건 미만이라 만족도는 중립으로 계산했습니다.",
    noAds: "할인과 광고는 추천에 반영하지 않습니다.",
  },
  /** 기피 음식 판정 한계 (D-07 안건 4, T5.6). 못 먹는 음식 설정 화면과 상세에서 쓴다 */
  avoidLimit:
    "못 먹는 음식은 식당 이름과 업종으로만 거릅니다. 메뉴 재료까지는 확인하지 못하니 알레르기가 있다면 주문 전에 꼭 확인해 주세요.",
} as const;
