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

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [...TOKEN_TEXT_STEPS],
      radius: [...TOKEN_RADIUS_COMPONENTS],
      shadow: ["sheet"],
      ease: [...TOKEN_EASINGS],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
