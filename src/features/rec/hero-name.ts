// 큰 카드 이름 길이 단계 (T9.10). 홈 첫 로드(today-cards)가 쓰므로 card-model(가격 추정, 이유 문장 등)과 따로 둔다.
/**
 * 큰 카드 이름 단계 (T9.10, D-25). 그림은 80px 고정이고, 이름이 아주 짧을 때(lg)만 title 30px, 나머지(md, sm)는 heading 22px로
 * 두 줄까지 쓴다. 두 줄 heading(약 59px)은 그림 행(약 67px) 안에 들어가 카드 높이가 이름 길이와 무관하다(홈 한 화면 맞춤).
 * 폭은 글자 수로 어림한다: 한글(전각) 1, 영문과 숫자, 기호 0.6, 띄어쓰기 0.3. 360px에서 이름 칸 약 188px(30px 글자 6자).
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
