// 홈 큰 카드 메모 배지 자리 규칙 (T10.15, D-33 안건 1). 홈 첫 로드(card-bits, today-cards)에 들어가므로 이 함수 하나만 둔다.

/**
 * 홈 큰 카드에 메모 배지를 보일지.
 * 카드 배지(웨이팅, 할인)가 먼저이고 배지는 최대 2개(MAX_CARD_BADGES)라, 카드 배지가 2개 미만일 때만 메모가 한 자리를 쓴다.
 */
export function showMemoBadge(
  cardBadgeCount: number,
  memo: string | null | undefined,
  max = 2,
): memo is string {
  return typeof memo === "string" && memo.length > 0 && cardBadgeCount < max;
}
