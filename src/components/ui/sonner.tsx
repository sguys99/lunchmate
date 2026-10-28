"use client";
// 토스트 (Sonner, T2.5). shadcn sonner 래퍼를 토큰으로 다시 썼다.
//
// - unstyled로 Sonner 기본 색과 그림자를 끄고 토큰 클래스만 입힌다(면 popover, 1px border, 라운드 lg 16px).
//   떠 있는 층이라 shadow-lg(DESIGN.md 팝오버 그림자)를 쓴다. 지도 위에서도 가장자리가 보이게 하기 위해서다.
// - 위치: 아래 가운데. 모바일은 하단 탭(64px) + 하단 safe-area + 12px 위에 뜬다. 탭이 없는 화면은 offset을 덮어쓴다.
// - 테마: 색이 모두 CSS 변수라 .dark 전환을 그대로 따른다(next-themes 불필요).
// - 모션: 등장과 스와이프는 Sonner 내장 전환(약 400ms)을 쓴다. Sonner가 prefers-reduced-motion에서 전환을 끈다.
// - 앱 셸은 이 Toaster를 lazy-toaster.tsx의 <LazyToaster />로 첫 토스트 때 마운트한다(T2.22). 앱 화면 코드는
//   lazy-toaster의 toast()를 쓰고, 여기서 다시 내보내는 toast()는 디자인 랩처럼 첫 로드가 상관없는 곳만 쓴다.
//   문구는 src/copy(예: commonCopy.toasts.linkCopied)에서 가져온다.
import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  LoaderCircleIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, toast, type ToasterProps } from "sonner";
import { commonCopy } from "@/copy/common";

/** 하단 탭 위 간격. 탭 높이 토큰 + safe-area + 12px */
const ABOVE_TAB_BAR =
  "calc(var(--lm-layout-tab-bar-height, 64px) + env(safe-area-inset-bottom, 0px) + 0.75rem)";

const iconClass = "size-5";

function Toaster({ toastOptions, ...props }: ToasterProps) {
  return (
    <Sonner
      position="bottom-center"
      offset={{ bottom: ABOVE_TAB_BAR }}
      mobileOffset={{ bottom: ABOVE_TAB_BAR, left: "1.5rem", right: "1.5rem" }}
      gap={8}
      visibleToasts={3}
      containerAriaLabel={commonCopy.a11y.notifications}
      icons={{
        success: (
          <CircleCheckIcon
            aria-hidden
            className={`${iconClass} text-success`}
          />
        ),
        info: <InfoIcon aria-hidden className={`${iconClass} text-info`} />,
        warning: (
          <TriangleAlertIcon
            aria-hidden
            className={`${iconClass} text-warning`}
          />
        ),
        error: (
          <CircleAlertIcon
            aria-hidden
            className={`${iconClass} text-destructive`}
          />
        ),
        loading: (
          <LoaderCircleIcon
            aria-hidden
            className={`${iconClass} animate-spin text-muted-foreground motion-reduce:animate-none`}
          />
        ),
      }}
      toastOptions={{
        unstyled: true,
        closeButtonAriaLabel: commonCopy.a11y.closeNotification,
        ...toastOptions,
        classNames: {
          toast:
            "group/toast flex w-full items-start gap-3 rounded-lg border border-border bg-popover px-4 py-3.5 text-popover-foreground shadow-lg *:transition-opacity *:duration-(--lm-duration-fast) data-[expanded=false]:data-[front=false]:*:opacity-0",
          content: "flex min-w-0 flex-1 flex-col gap-0.5",
          icon: "mt-px shrink-0",
          title: "type-body-sm text-foreground break-keep",
          description: "type-caption text-muted-foreground break-keep",
          actionButton:
            "relative -my-1 ml-auto shrink-0 self-center rounded-sm px-1 py-1 type-label text-foreground underline decoration-muted-foreground decoration-1 underline-offset-3 outline-none hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring before:absolute before:top-1/2 before:left-1/2 before:h-11 before:w-[max(100%,2.75rem)] before:-translate-x-1/2 before:-translate-y-1/2",
          cancelButton:
            "shrink-0 self-center rounded-sm px-1 py-1 type-label text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  );
}

export { Toaster, toast };
