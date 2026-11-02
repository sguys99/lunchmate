// 큰 카드 이름 길이 단계 (T9.10). 홈 첫 로드(today-cards)가 쓰므로 card-model(가격 추정, 이유 문장 등)과 따로 둔다.
/**
 * 큰 카드 이름 단계 (T9.10). 이름이 길수록 일러스트를 줄이고(lg 152 → md 112 → sm 80) sm은 글자도 한 단계 내린다.
 * 이름이 정보의 주인공이라(CLAUDE.md 6.2) 그림과 겹치지 않고 두 줄 안에 들어가는 쪽을 고른다.
 * 폭은 글자 수로 어림한다: 한글(전각) 1, 영문과 숫자, 기호 0.6, 띄어쓰기 0.3.
 * 경계: 390px에서 lg 이름 칸 약 144px(30px 글자 4.8자), md 약 184px(한 줄 6자, 두 줄), sm 약 216px(22px 글자 한 줄 9.8자, 두 줄).
 */
export type HeroNameSize = "lg" | "md" | "sm";

export function nameWidthUnits(name: string): number {
  let units = 0;
  for (const ch of name.trim()) {
    if (/\s/.test(ch)) units += 0.3;
    else if (/[\u0000-\u024f]/.test(ch)) units += 0.6;
    else units += 1;
  }
  return Math.round(units * 10) / 10;
}

export function heroNameSize(name: string): HeroNameSize {
  const units = nameWidthUnits(name);
  if (units <= 4.5) return "lg";
  if (units <= 9) return "md";
  return "sm";
}
