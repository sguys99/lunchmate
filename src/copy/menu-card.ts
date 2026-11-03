// 홈 큰 카드 가운데 칸 대표 메뉴 문구 (T10.16e, D-35 A). 홈 첫 로드에 실리므로 src/copy/menu.ts에서 떼어 둔다.
export const menuCardCopy = {
  /** 가운데 칸 라벨 앞 스크린 리더 말 */
  popular: "많이 먹는 메뉴",
  reportsLabel: (n: number) => `제보 ${n}건`,
  priceUnit: "원",
} as const;
