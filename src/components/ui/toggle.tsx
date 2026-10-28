"use client";
// shadcn base-vega Toggle, DESIGN.md 5장 "칩"으로 재스타일 (T2.5).
// Base UI Toggle은 눌림 상태를 aria-pressed와 data-pressed로 함께 표시한다.
//
// variant
// - chip(기본): 알약, 높이 40(터치 48), 1px border, 글자 label.
//   선택 시 면 틴트 없이 테두리 1.5px primary + 글자 primary. 1.5px는 1px 테두리에 0.5px 안쪽 링을 더해 폭이 흔들리지 않는다.
// - quiet: 아이콘 하나짜리 토글(저장, 다시 안 감 등). 면 없음, 선택 시 글자색만 primary.
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { focusRing, hitArea44, hitArea48, pressMotion } from "./interaction";

const toggleVariants = cva(
  cn(
    "group/toggle inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap select-none",
    "disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    focusRing,
    pressMotion,
  ),
  {
    variants: {
      variant: {
        chip: cn(
          "h-10 rounded-chip border border-border px-4 type-label text-foreground hover:bg-muted",
          "data-pressed:border-primary data-pressed:text-primary data-pressed:ring-[0.5px] data-pressed:ring-primary data-pressed:ring-inset data-pressed:hover:bg-transparent",
          hitArea48,
        ),
        quiet: cn(
          "size-11 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground data-pressed:text-primary data-pressed:[&_svg]:fill-current [&_svg:not([class*='size-'])]:size-5",
          hitArea44,
        ),
      },
    },
    defaultVariants: {
      variant: "chip",
    },
  },
);

type ToggleProps = TogglePrimitive.Props & VariantProps<typeof toggleVariants>;

function Toggle({ className, variant = "chip", ...props }: ToggleProps) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      data-variant={variant}
      className={cn(toggleVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Toggle, toggleVariants, type ToggleProps };
