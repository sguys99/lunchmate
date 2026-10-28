// 버튼 모양 클래스 (DESIGN.md 5장 "버튼"). Button(button.tsx)의 cva와 가벼운 화면이 함께 쓰는 단일 출처 (T2.22).
//
// 이 파일은 의존성이 없다(cva, tailwind-merge, Base UI 없음). 루트 오류 경계(error.tsx, global-error.tsx)는
// 모든 라우트 첫 로드에 들어가므로 Button 대신 일반 <button>, <Link>에 buttonClass()를 붙여 쓴다.
// 기본 variant와 size 조합끼리는 충돌하는 클래스가 없어 tailwind-merge 없이 이어 붙여도 결과가 같다.
// 바깥에서 className을 덮어써야 하면 Button과 buttonVariants(cn 적용)를 쓴다.
import { focusRing, hitArea44, pressMotion } from "./interaction";

export const buttonBaseClass = [
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-button border border-transparent type-label whitespace-nowrap select-none",
  "disabled:pointer-events-none aria-disabled:pointer-events-none",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  hitArea44,
  focusRing,
  pressMotion,
].join(" ");

export const buttonVariantClasses = {
  primary:
    "bg-primary text-primary-foreground hover:brightness-97 active:brightness-95 disabled:bg-muted disabled:text-muted-foreground aria-disabled:bg-muted aria-disabled:text-muted-foreground",
  secondary:
    "border-border text-foreground hover:bg-muted active:bg-muted disabled:text-muted-foreground disabled:opacity-60 aria-disabled:opacity-60 aria-expanded:bg-muted",
  ghost:
    "text-foreground hover:bg-muted active:bg-muted disabled:text-muted-foreground disabled:opacity-60 aria-disabled:opacity-60 aria-expanded:bg-muted",
  link: "rounded-sm text-foreground underline decoration-muted-foreground decoration-1 underline-offset-3 hover:decoration-foreground active:scale-100 disabled:text-muted-foreground disabled:opacity-60",
  destructive:
    "border-destructive/40 text-destructive hover:bg-muted active:bg-muted disabled:opacity-60 aria-disabled:opacity-60",
} as const;

export const buttonSizeClasses = {
  default: "h-12 px-6",
  sm: "h-10 px-4",
  icon: "size-12",
  "icon-sm": "size-10",
} as const;

export type ButtonVariant = keyof typeof buttonVariantClasses;
export type ButtonSize = keyof typeof buttonSizeClasses;

/** 가벼운 버튼 클래스: 기본 + variant + size를 이어 붙인다. link는 크기 보정(compoundVariants)이 필요해 Button을 쓴다. */
export function buttonClass(
  variant: Exclude<ButtonVariant, "link"> = "secondary",
  size: ButtonSize = "default",
): string {
  return `${buttonBaseClass} ${buttonVariantClasses[variant]} ${buttonSizeClasses[size]}`;
}
