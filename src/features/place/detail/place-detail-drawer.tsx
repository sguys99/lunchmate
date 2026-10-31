"use client";
// 홈 위 식당 상세 바텀시트 (D-10 안건 1: 처음부터 끝까지 연 높이). Base UI Drawer.
// 이 파일은 usePlaceDetailSheet가 "상세"를 누른 뒤에 동적 import한다(홈 첫 로드 밖, D-08 지연 로딩 규칙).
// - 모바일: 아래에서 올라오는 시트, 위 라운드 28, 뒤 딤, 끌어 내려 닫기, 초점 가둠, 닫히면 누른 버튼으로 초점 복귀.
// - 데스크톱(뷰포트 1024 이상): 좌 칸(2fr/5fr = 40%) 높이 전체 패널. 포털이 @container/screen 밖이라 desktop: 대신 뷰포트 기준을 쓴다.
// - 본문은 스크롤, 하단 고정 줄(길찾기 + 즐겨찾기 + 더 보기)은 시트 바닥에 붙는다.
import { X } from "lucide-react";
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerHandle,
  DrawerPopup,
  DrawerPortal,
  DrawerTitle,
  DrawerViewport,
} from "@/components/ui/drawer";
import { focusRing } from "@/components/ui/interaction";
import { placeCopy } from "@/copy/place";
import { cn } from "@/lib/utils";
import {
  PlaceDetailActions,
  PlaceDetailBody,
  PlaceDetailError,
  PlaceDetailSkeleton,
  type PlaceDetailProps,
} from "./place-detail";

const copy = placeCopy;

/** 시트에 넣을 내용. 홈은 대개 ready로 바로 연다(세션 메모리에 이미 있는 값) */
export type PlaceDetailSheetContent =
  | { kind: "loading" }
  | { kind: "error"; onRetry?: () => void; searchName?: string | null }
  | ({ kind: "ready" } & PlaceDetailProps);

export type PlaceDetailDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: PlaceDetailSheetContent;
  /** 포털 대상. 기본 document.body (디자인 랩 프레임 안에 가둘 때만) */
  container?: HTMLElement | null;
};

export default function PlaceDetailDrawer({
  open,
  onOpenChange,
  content,
  container,
}: PlaceDetailDrawerProps) {
  const title =
    content.kind === "ready"
      ? (content.place.name ?? copy.detail.unnamedLabel)
      : copy.detail.label;
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPortal container={container ?? undefined}>
        <DrawerBackdrop className="z-40" />
        <DrawerViewport className="z-50 min-[64rem]:items-stretch min-[64rem]:justify-start">
          <DrawerPopup
            className={cn(
              "h-[calc(100%-1.5rem)] max-h-[calc(100%-1.5rem)] data-ending-style:duration-(--lm-duration-fast) data-ending-style:ease-exit",
              "min-[64rem]:h-full min-[64rem]:max-h-full min-[64rem]:w-2/5 min-[64rem]:max-w-none min-[64rem]:rounded-none min-[64rem]:border-r min-[64rem]:border-border min-[64rem]:shadow-none",
            )}
          >
            <DrawerTitle className="sr-only">{title}</DrawerTitle>
            <DrawerHandle className="mt-3 mb-0 h-1 w-9 min-[64rem]:hidden" />
            <div className="flex h-11 shrink-0 items-center justify-end px-3 min-[64rem]:mt-3">
              <DrawerClose
                aria-label={copy.detail.close}
                className={cn(
                  "inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
                  focusRing,
                )}
              >
                <X aria-hidden className="size-5" strokeWidth={1.5} />
              </DrawerClose>
            </div>
            <DrawerContent className="flex flex-col pt-0 pb-0 min-[64rem]:mx-auto min-[64rem]:w-full min-[64rem]:max-w-(--lm-layout-desktop-list-max-width) min-[64rem]:px-10">
              {content.kind === "loading" ? (
                <PlaceDetailSkeleton />
              ) : content.kind === "error" ? (
                <PlaceDetailError
                  onRetry={content.onRetry}
                  searchName={content.searchName}
                />
              ) : (
                <PlaceDetailBody {...content} headingLevel="h2" />
              )}
            </DrawerContent>
            {content.kind === "ready" ? (
              <div className="shrink-0 border-t border-border bg-popover px-(--lm-layout-gutter) pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] min-[64rem]:mx-auto min-[64rem]:w-full min-[64rem]:max-w-(--lm-layout-desktop-list-max-width) min-[64rem]:px-10">
                <PlaceDetailActions {...content} />
              </div>
            ) : null}
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  );
}
