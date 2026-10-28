"use client";
// shadcn base-vega Sheet(Base UI Dialog 기반 가장자리 패널), DESIGN.md 5장 "바텀시트"로 재스타일 (T2.5).
//
// 언제 무엇을 쓰나
// - 모바일 바텀시트(스와이프로 닫기, 스냅): drawer.tsx(Base UI Drawer).
// - 끌기 없는 가장자리 패널(데스크톱 오른쪽 상세, 필터 패널, 짧은 아래 패널): 이 Sheet.
//
// - 면 popover. 아래 시트는 위쪽 라운드 28px(sheet) + 위쪽 헤어라인(shadow-sheet), 좌우 패널은 1px 선만.
// - 뒤 딤 overlay. 열림 slow(300ms) enter, 닫힘 fast(180ms) exit. reduced motion이면 전환 없음.
// - 아래 시트는 하단 safe-area만큼 안쪽 여백을 더한다.
// - 제목은 title 세리프(DESIGN.md "시트 안 제목은 title 세리프").
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { commonCopy } from "@/copy/common";
import { cn } from "@/lib/utils";
import { Button } from "./button";

function Sheet(props: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger(props: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose(props: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal(props: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-overlay transition-opacity duration-(--lm-duration-slow) ease-standard data-ending-style:opacity-0 data-ending-style:duration-(--lm-duration-fast) data-starting-style:opacity-0 motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

type SheetSide = "top" | "right" | "bottom" | "left";

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  portalContainer,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: SheetSide;
  showCloseButton?: boolean;
  /** 디자인 랩처럼 토큰 범위 안에서 열어야 할 때 포털 대상 */
  portalContainer?: SheetPrimitive.Portal.Props["container"];
}) {
  return (
    <SheetPortal container={portalContainer}>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col gap-5 bg-popover text-popover-foreground outline-none",
          "transition-[translate,opacity] duration-(--lm-duration-slow) ease-enter data-ending-style:duration-(--lm-duration-fast) data-ending-style:ease-exit motion-reduce:transition-none",
          // 아래: 위쪽 라운드 + 헤어라인, 콘텐츠 최대 폭 안에서 가운데
          "data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:mx-auto data-[side=bottom]:max-h-[calc(100%-2rem)] data-[side=bottom]:w-full data-[side=bottom]:max-w-(--lm-layout-max-width,30rem) data-[side=bottom]:rounded-t-sheet data-[side=bottom]:pb-[env(safe-area-inset-bottom,0px)] data-[side=bottom]:shadow-sheet",
          "data-[side=bottom]:data-ending-style:translate-y-full data-[side=bottom]:data-starting-style:translate-y-full",
          // 위
          "data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:rounded-b-sheet data-[side=top]:border-b data-[side=top]:border-border data-[side=top]:pt-[env(safe-area-inset-top,0px)]",
          "data-[side=top]:data-ending-style:-translate-y-full data-[side=top]:data-starting-style:-translate-y-full",
          // 좌우: 1px 선, 폭은 화면 여백을 남기고 최대 26rem
          "data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:w-[calc(100%-3rem)] data-[side=left]:max-w-sm data-[side=left]:border-r data-[side=left]:border-border",
          "data-[side=left]:data-ending-style:-translate-x-full data-[side=left]:data-starting-style:-translate-x-full",
          "data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:w-[calc(100%-3rem)] data-[side=right]:max-w-sm data-[side=right]:border-l data-[side=right]:border-border",
          "data-[side=right]:data-ending-style:translate-x-full data-[side=right]:data-starting-style:translate-x-full",
          showCloseButton && "[&_[data-slot=sheet-header]]:pr-16",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            aria-label={commonCopy.actions.close}
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-5 right-4 text-muted-foreground"
              />
            }
          >
            <XIcon aria-hidden />
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-2 px-6 pt-7", className)}
      {...props}
    />
  );
}

/** 스크롤되는 본문. 블록 사이 lg(28px)는 쓰는 쪽에서 gap-7로 */
function SheetBody({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-body"
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain px-6",
        className,
      )}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 px-6 pb-7", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("type-title break-keep text-foreground", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("type-body-sm break-keep text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
