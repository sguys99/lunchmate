// 홈 카드 대표 메뉴 고르기 (T10.16e, D-35 A + 안건 2). 홈 첫 로드에 실리므로 따로 둔다(model.ts 전체가 홈 청크에 실리지 않게).

/** 카드에 대표 메뉴를 보일 최소 제보 수(D-35 안건 2). 1건짜리는 상세 메뉴판에만 */
export const CARD_MIN_REPORTS = 2;

/** 카드 가운데 칸에 보일 대표 메뉴 */
export type CardMenu = {
  readonly name: string;
  readonly medianKrw: number;
  readonly count: number;
};

/** 제보 수 1위(rank 1)이고 CARD_MIN_REPORTS 이상일 때만 */
export function cardMenu(
  top: { name: string; medianKrw: number; count: number } | undefined,
): CardMenu | null {
  if (!top || top.count < CARD_MIN_REPORTS) return null;
  return { name: top.name, medianKrw: top.medianKrw, count: top.count };
}
