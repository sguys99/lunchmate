"use client";
// 바텀시트 공용 래퍼 (Base UI Drawer, tasks.md 2.4절, T0.27). shadcn base 스타일 drawer와 같은 역할.
// API: @base-ui/react 1.9 Drawer (node_modules/@base-ui/react/docs/react/components/drawer.md 기준).
//
// - 기본 스타일은 토큰 유틸리티만 쓴다(bg-popover, bg-overlay, rounded-t-sheet, shadow-sheet, ease-enter).
//   시안마다 className으로 덮어쓴다(cn 병합이라 같은 속성은 뒤의 값이 이긴다).
// - 포털은 기본 document.body. 디자인 랩처럼 토큰 범위(data-design) 안에서 열어야 하면
//   <DrawerPortal container={...}>로 범위 요소를 넘긴다.
// - 스냅: Drawer snapPoints를 쓰면 Popup transform에 --drawer-snap-point-offset을 더한다(아래 기본 클래스에 포함).
// - 스와이프 중 전환 시간 0, 놓을 때는 --drawer-swipe-strength 비례. reduced motion이면 전환 없음.
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type WithClassName<P> = Omit<P, "className"> & { className?: string };

function Drawer(props: ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

function DrawerTrigger(props: ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal(props: ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose(props: ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerBackdrop({
  className,
  ...props
}: WithClassName<ComponentProps<typeof DrawerPrimitive.Backdrop>>) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="drawer-backdrop"
      className={cn(
        "fixed inset-0 bg-overlay opacity-[calc(1-var(--drawer-swipe-progress,0))] transition-opacity duration-(--lm-duration-slow) ease-standard data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*var(--lm-duration-slow,300ms))] data-starting-style:opacity-0 data-swiping:duration-0 motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

function DrawerViewport({
  className,
  ...props
}: WithClassName<ComponentProps<typeof DrawerPrimitive.Viewport>>) {
  return (
    <DrawerPrimitive.Viewport
      data-slot="drawer-viewport"
      className={cn(
        "fixed inset-0 flex touch-none items-end justify-center",
        className,
      )}
      {...props}
    />
  );
}

/** 시트 본체. 손잡이(DrawerHandle), 제목, DrawerContent를 안에 둔다. */
function DrawerPopup({
  className,
  ...props
}: WithClassName<ComponentProps<typeof DrawerPrimitive.Popup>>) {
  return (
    <DrawerPrimitive.Popup
      data-slot="drawer-popup"
      className={cn(
        "relative flex max-h-[calc(100%-2rem)] min-h-0 w-full max-w-(--lm-layout-max-width,30rem) flex-col rounded-t-sheet bg-popover text-popover-foreground shadow-sheet outline-none",
        "[transform:translateY(calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y,0px)))] transition-transform duration-(--lm-duration-slow) ease-enter",
        "data-ending-style:[transform:translateY(100%)] data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*var(--lm-duration-slow,300ms))] data-starting-style:[transform:translateY(100%)] data-swiping:duration-0 data-swiping:select-none motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

/** 스크롤되는 본문 영역 */
function DrawerContent({
  className,
  ...props
}: WithClassName<ComponentProps<typeof DrawerPrimitive.Content>>) {
  return (
    <DrawerPrimitive.Content
      data-slot="drawer-content"
      className={cn(
        "min-h-0 flex-1 touch-auto overflow-y-auto overscroll-contain px-(--lm-layout-gutter,1rem) pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]",
        className,
      )}
      {...props}
    />
  );
}

/** 끌기 손잡이 (장식, 스크린 리더에서 숨김) */
function DrawerHandle({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      data-slot="drawer-handle"
      className={cn(
        "mx-auto mt-2.5 mb-2 h-1 w-10 shrink-0 rounded-full bg-border",
        className,
      )}
      {...props}
    />
  );
}

/** 시트 제목. DESIGN.md 5장 "시트 안 제목은 title 세리프" (Sheet와 같은 기본값) */
function DrawerTitle({
  className,
  ...props
}: WithClassName<ComponentProps<typeof DrawerPrimitive.Title>>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("type-title break-keep text-foreground", className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: WithClassName<ComponentProps<typeof DrawerPrimitive.Description>>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("type-body-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHandle,
  DrawerPopup,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
  DrawerViewport,
};
