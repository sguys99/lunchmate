"use client";
// shadcn base-vega Dialog, DESIGN.md 토큰으로 재스타일 (T2.5).
// 화면 가운데 확인 대화상자. 모바일의 선택지 목록과 상세는 바텀시트(drawer.tsx)를 쓴다.
//
// - 면 popover + 1px border, 라운드 card(24px), 그림자 없음(깊이는 선과 면 톤, DESIGN.md 9장).
// - 뒤 딤은 overlay 토큰. 흐림(backdrop-blur)은 쓰지 않는다(글래스모피즘 금지).
// - 열림: 페이드 + 8px 위로(base, enter), 닫힘: fast, exit. reduced motion이면 전환 없음.
// - 제목은 heading 세리프(22px), 설명은 body-sm muted. 닫기 아이콘 버튼 라벨은 commonCopy.
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { commonCopy } from "@/copy/common";
import { cn } from "@/lib/utils";
import { Button } from "./button";

function Dialog(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal(props: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose(props: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-overlay transition-opacity duration-(--lm-duration-base) ease-standard data-ending-style:opacity-0 data-ending-style:duration-(--lm-duration-fast) data-starting-style:opacity-0 motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  portalContainer,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
  /** 디자인 랩처럼 토큰 범위 안에서 열어야 할 때 포털 대상 */
  portalContainer?: DialogPrimitive.Portal.Props["container"];
}) {
  return (
    <DialogPortal container={portalContainer}>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2*var(--lm-layout-gutter,1.5rem))] max-w-sm -translate-x-1/2 -translate-y-1/2 gap-5 rounded-card border border-border bg-popover p-7 text-popover-foreground outline-none",
          "transition-[opacity,translate] duration-(--lm-duration-base) ease-enter data-starting-style:translate-y-[calc(-50%+0.5rem)] data-starting-style:opacity-0",
          "data-ending-style:translate-y-[calc(-50%+0.5rem)] data-ending-style:opacity-0 data-ending-style:duration-(--lm-duration-fast) data-ending-style:ease-exit motion-reduce:transition-none",
          // 닫기 버튼(40px + 여백)과 제목이 겹치지 않게 머리말만 오른쪽을 비운다
          showCloseButton && "[&_[data-slot=dialog-header]]:pr-10",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            aria-label={commonCopy.actions.close}
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-4 right-4 text-muted-foreground"
              />
            }
          >
            <XIcon aria-hidden />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

/** 버튼 줄. 모바일은 세로로 쌓고(첫 버튼이 맨 아래, 엄지 쪽) 넓은 화면은 오른쪽 정렬 가로 배치 */
function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: ComponentProps<"div"> & { showCloseButton?: boolean }) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="secondary" />}>
          {commonCopy.actions.close}
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("type-heading break-keep text-foreground", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "type-body-sm break-keep text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
