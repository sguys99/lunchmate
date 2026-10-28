// /design-lab/badges 확인 화면 문구 (T2.9). 내부용이지만 문구 규칙(tasks.md 2.2절)은 똑같이 지킨다.
export const designLabBadgesCopy = {
  title: "공통 배지",
  description:
    "추정, 제보, 할인, 웨이팅 3단계, 기피 경고 배지입니다. 테마는 시스템 설정을 따릅니다.",
  sections: {
    all: "배지 전체",
    waiting: "웨이팅 3단계",
    tooltip: "설명 툴팁",
    card: "카드 한 줄 (후보 4개 중 우선순위 2개)",
    priority: "우선순위",
  },
  tooltipHint: "배지에 포인터를 올리거나 Tab으로 이동하면 설명이 보입니다.",
  sampleName: "을지로 할머니 국밥",
  candidatesLabel: "후보",
  pickedLabel: "카드",
} as const;
