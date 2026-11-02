// 디자인 랩 홈 한 화면 맞춤 시안 문구 (T9.10 G9 시안, docs/design/g9-comparison-home-compact.md).
// 화면 안 문구는 실제 홈 문구(homeCopy)를 그대로 쓰고, 시안 이름과 견본 식당 이름만 둔다.
// 선택 뒤 구현에서 이 파일은 지운다.

export const homeCompactLabCopy = {
  metaTitle: (id: string) => `오늘(홈) 한 화면 ${id.toUpperCase()}`,
  /** 시안 한 줄 설명(디자인 랩 목록) */
  intent: {
    a: "A 간격 줄이기: 머리 한 줄, 상세를 카드 윗줄로, 이유 줄이 펼치기",
    b: "B 가로 카드: 작은 그림 왼쪽, 숫자 한 줄, 대안은 목록 두 줄",
    c: "C 카드 안 행동: 길찾기를 카드 아래에 넣고 하단 탭을 낮춤",
  },
  /** 큰 카드 "더 보기" 아이콘(시안에서는 메뉴를 열지 않는다) */
  more: (name: string) => `${name} 다른 행동 더 보기`,
} as const;
