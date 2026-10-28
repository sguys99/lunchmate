// shadcn base-vega Input, DESIGN.md 토큰으로 재스타일 (T2.5).
// - 높이 48, 라운드 input(16px), 1px input 테두리, 면 card(바탕보다 한 단계 밝게). 그림자 없음.
// - 글자 body 16px: iOS Safari는 16px 미만 입력란에 포커스하면 화면을 확대하므로 줄이지 않는다.
// - 포커스: 테두리 ring + 바깥 2px ring 선. 오류(aria-invalid): 테두리 destructive.
import { Input as InputPrimitive } from "@base-ui/react/input";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-input border border-input bg-card px-4 type-body text-foreground outline-none placeholder:text-muted-foreground",
        "transition-[border-color,outline-color] duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
        "focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "file:inline-flex file:h-8 file:border-0 file:bg-transparent file:type-label file:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
