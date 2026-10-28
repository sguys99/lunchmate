// shadcn base-vega Button, DESIGN.md 5장 "버튼"으로 재스타일 (T1.19 토큰 연결, T2.5 variant 정리).
//
// variant
// - primary: 올리브 면. **한 화면에 1개만** 쓴다(CLAUDE.md 6.3). 그래서 기본값이 아니다.
// - secondary(기본): 알약 1px 테두리, 면 없음. 눌림과 hover에 muted 면.
// - ghost: 테두리도 면도 없는 조용한 버튼(아이콘 버튼, 목록 안 보조 동작).
// - link: 텍스트 버튼. 밑줄 1px, 글자 아래 3px.
// - destructive: 지우기 같은 되돌릴 수 없는 동작. 면 없이 글자와 테두리만 destructive.
//
// size: default 48px(하단 액션 영역 기준), sm 40px, icon 48px, icon-sm 40px.
// 보이는 크기가 44px보다 작아도 터치 영역은 hitArea44로 44px 이상이다.
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { focusRing, hitArea44, pressMotion } from "./interaction";

const buttonVariants = cva(
  cn(
    "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-button border border-transparent type-label whitespace-nowrap select-none",
    "disabled:pointer-events-none aria-disabled:pointer-events-none",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
    hitArea44,
    focusRing,
    pressMotion,
  ),
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:brightness-97 active:brightness-95 disabled:bg-muted disabled:text-muted-foreground aria-disabled:bg-muted aria-disabled:text-muted-foreground",
        secondary:
          "border-border text-foreground hover:bg-muted active:bg-muted disabled:text-muted-foreground disabled:opacity-60 aria-disabled:opacity-60 aria-expanded:bg-muted",
        ghost:
          "text-foreground hover:bg-muted active:bg-muted disabled:text-muted-foreground disabled:opacity-60 aria-disabled:opacity-60 aria-expanded:bg-muted",
        link: "rounded-sm text-foreground underline decoration-muted-foreground decoration-1 underline-offset-3 hover:decoration-foreground active:scale-100 disabled:text-muted-foreground disabled:opacity-60",
        destructive:
          "border-destructive/40 text-destructive hover:bg-muted active:bg-muted disabled:opacity-60 aria-disabled:opacity-60",
      },
      size: {
        default: "h-12 px-6",
        sm: "h-10 px-4",
        icon: "size-12",
        "icon-sm": "size-10",
      },
    },
    compoundVariants: [
      // 텍스트 버튼은 글자 폭만 차지한다(터치 영역은 hitArea44가 넓힌다)
      { variant: "link", className: "h-auto px-0.5 py-0.5" },
    ],
    defaultVariants: {
      variant: "secondary",
      size: "default",
    },
  },
);

type ButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants>;

function Button({
  className,
  variant = "secondary",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants, type ButtonProps };
