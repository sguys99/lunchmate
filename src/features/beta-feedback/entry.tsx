"use client";
// 나 탭 머리 아래 "베타 의견 보내기" 줄 (T9.4, D-23 A 진입 자리). betaFeedback 플래그(서버 판정)가 켜져 있고 로그인한 나 탭에서만 그린다.
// 시트 코드(Drawer, 입력, 서버 액션)는 줄을 처음 누를 때 받는다(review-sheet, report-sheet와 같은 방식). 누르기 전에는 이 줄뿐이다.
// 손가락이 닿거나 초점이 오면 미리 받기 시작한다. 받는 동안은 바닥 스켈레톤, 받지 못하면 안내 한 줄.
import { ChevronRight, MessageSquareText } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { focusRing } from "@/components/ui/interaction";
import { rowPress } from "@/components/ui/row-press";
import { betaFeedbackCopy as copy } from "@/copy/beta";
import { cn } from "@/lib/utils";
import type { BetaFeedbackSheetDrawerProps } from "./sheet-drawer";

const load = () => import("./sheet-drawer");

function SheetFallback({ error }: { error?: unknown }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] mx-auto flex w-full max-w-(--lm-layout-max-width) flex-col gap-4 rounded-t-sheet bg-popover px-(--lm-layout-gutter) pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-sheet">
      {error ? (
        <div role="alert" className="flex flex-col gap-1.5">
          <p className="type-label">{copy.sheet.loadFailed}</p>
          <p className="type-caption text-muted-foreground">
            {copy.sheet.loadFailedBody}
          </p>
        </div>
      ) : (
        <div
          role="status"
          aria-busy
          aria-label={copy.sheet.loading}
          className="flex flex-col gap-3"
        >
          <span className="h-7 w-44 rounded-full bg-skeleton" />
          <span className="mt-2 h-10 w-full rounded-full bg-skeleton" />
          <span className="h-32 w-full rounded-md bg-skeleton" />
        </div>
      )}
    </div>
  );
}

const LazySheet = dynamic<BetaFeedbackSheetDrawerProps>(load, {
  ssr: false,
  loading: ({ error }) => <SheetFallback error={error} />,
});

export function BetaFeedbackEntry() {
  // key: 열 때마다 새 입력 상태. 닫아도 마운트를 유지해 닫힘 전환이 끝까지 보인다
  const [state, setState] = useState<{ open: boolean; key: number } | null>(
    null,
  );
  const preload = () => void load().catch(() => undefined);
  return (
    <>
      <button
        type="button"
        onPointerDown={preload}
        onFocus={preload}
        onClick={() =>
          setState((s) => ({ open: true, key: (s?.key ?? 0) + 1 }))
        }
        aria-haspopup="dialog"
        className={cn(
          "mt-6 flex min-h-14 w-full items-center gap-3 border-y border-border py-3 text-left",
          focusRing,
          rowPress,
        )}
      >
        <MessageSquareText
          aria-hidden
          className="size-5 shrink-0 text-muted-foreground"
          strokeWidth={1.5}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-2 type-body">
            {copy.entry.row}
            <span className="inline-flex h-5 items-center rounded-badge border border-border px-1.5 type-caption text-muted-foreground">
              {copy.entry.badge}
            </span>
          </span>
          <span className="truncate type-caption text-muted-foreground">
            {copy.entry.rowHint}
          </span>
        </span>
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
          strokeWidth={1.75}
        />
      </button>
      {state ? (
        <LazySheet
          key={state.key}
          open={state.open}
          onOpenChange={(open) => setState((s) => (s ? { ...s, open } : s))}
        />
      ) : null}
    </>
  );
}
