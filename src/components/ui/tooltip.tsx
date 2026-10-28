"use client";
// shadcn base-vega Tooltip, DESIGN.md 토큰으로 재스타일 (T2.5).
// - 면 popover + 1px border + shadow-lg(DESIGN.md: lg 그림자는 떠 있는 팝오버 한 곳에만), 라운드 md(12px), 글자 caption.
// - 화살표 없음. 등장은 페이드 + 4px(fast, enter), 퇴장 fast exit. reduced motion이면 전환 없음.
// - 터치 기기에서는 hover가 없어 툴팁이 거의 보이지 않는다. 꼭 필요한 정보는 툴팁에만 두지 않는다.
//   아이콘 버튼의 이름은 툴팁이 아니라 aria-label로 준다.
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";

/** 여러 툴팁이 지연을 공유한다. 기본 400ms 뒤 열림 */
function TooltipProvider({
  delay = 400,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      {...props}
    />
  );
}

function Tooltip(props: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger(props: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 8,
  align = "center",
  alignOffset = 0,
  portalContainer,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  > & {
    /** 디자인 랩처럼 토큰 범위 안에서 열어야 할 때 포털 대상 */
    portalContainer?: TooltipPrimitive.Portal.Props["container"];
  }) {
  return (
    <TooltipPrimitive.Portal container={portalContainer}>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "z-50 w-fit max-w-64 origin-(--transform-origin) rounded-md border border-border bg-popover px-3 py-2 dark:border-input type-caption break-keep text-popover-foreground shadow-lg",
            "transition-[opacity,translate] duration-(--lm-duration-fast) ease-enter data-ending-style:opacity-0 data-ending-style:ease-exit data-starting-style:opacity-0 motion-reduce:transition-none",
            "data-[side=bottom]:data-starting-style:-translate-y-1 data-[side=left]:data-starting-style:translate-x-1 data-[side=right]:data-starting-style:-translate-x-1 data-[side=top]:data-starting-style:translate-y-1",
            className,
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
