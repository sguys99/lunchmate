import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * DESIGN.md 토큰으로 만든 Tailwind 이름 (globals.css @theme inline, FORMAT.md 3.3).
 * tailwind-merge가 모르는 `text-label`을 글자색으로 보고 `text-primary-foreground`와 합쳐 지우는 일을 막는다.
 * 목록은 src/lib/design/schema.ts 상수와 같아야 한다(utils.test.ts가 검사). 클라이언트 번들에 zod를 넣지 않으려고 복사해 둔다.
 */
export const TOKEN_TEXT_STEPS = [
  "display",
  "title",
  "heading",
  "body",
  "body-sm",
  "label",
  "caption",
  "numeric-lg",
  "numeric-md",
] as const;
export const TOKEN_RADIUS_COMPONENTS = [
  "card",
  "button",
  "chip",
  "badge",
  "input",
  "sheet",
  "tab-bar",
] as const;
export const TOKEN_EASINGS = [
  "standard",
  "enter",
  "exit",
  "emphasized",
] as const;

/**
 * 타입 스케일 묶음 유틸리티 type-*(globals.css @utility, 글꼴, 크기, 줄 높이, 굵기, 자간을 한 번에).
 * 사용자 정의 클래스라 tailwind-merge가 그룹을 모르면 `type-title`과 `type-heading`이 둘 다 남아 CSS 순서로
 * 결정된다(DrawerTitle 기본 type-title에 type-heading을 넘겨도 바뀌지 않던 문제, T7.11). 한 그룹으로 묶어 뒤의 값이 이긴다.
 */
const twMerge = extendTailwindMerge<"type-step">({
  extend: {
    theme: {
      text: [...TOKEN_TEXT_STEPS],
      radius: [...TOKEN_RADIUS_COMPONENTS],
      shadow: ["sheet"],
      ease: [...TOKEN_EASINGS],
    },
    classGroups: {
      "type-step": [{ type: [...TOKEN_TEXT_STEPS] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
