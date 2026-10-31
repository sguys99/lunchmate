"use client";
// 후기 시트 진입점 (T6.9, T6.10, D-11 안건 1: Drawer는 누른 뒤 지연 로딩). place-detail-sheet, login-prompt와 같은 방식.
//
//   const review = useReviewSheet();
//   <button onClick={() => review.open(config)} onPointerEnter={review.preload}>가격, 태그 남기기</button>
//   {review.sheet}
//
// - 시트 코드(Base UI Drawer, 입력 부품)는 open()을 처음 부를 때 받는다. 그 전에는 sheet가 null이다.
// - 받는 동안은 바닥에 스켈레톤 시트, 받지 못하면(청크 실패, 오프라인) 안내 한 줄로 대신한다.
import dynamic from "next/dynamic";
import { useCallback, useState, type ReactNode } from "react";
import { feedbackCopy } from "@/copy/feedback";
import type {
  ReviewSheetConfig,
  ReviewSheetDrawerProps,
} from "./review-sheet-drawer";

export type { ReviewSheetConfig } from "./review-sheet-drawer";

const copy = feedbackCopy.sheet;

const load = () => import("./review-sheet-drawer");

function SheetFallback({ error }: { error?: unknown }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] mx-auto flex w-full max-w-(--lm-layout-max-width) flex-col gap-4 rounded-t-sheet bg-popover px-7 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-sheet">
      {error ? (
        <div role="alert" className="flex flex-col gap-1.5">
          <p className="type-label">{copy.loadFailed}</p>
          <p className="type-caption text-muted-foreground">
            {copy.loadFailedBody}
          </p>
        </div>
      ) : (
        <div
          role="status"
          aria-busy
          aria-label={copy.loading}
          className="flex flex-col gap-3"
        >
          <span className="h-7 w-48 rounded-full bg-skeleton" />
          <span className="mt-2 h-12 w-full rounded-full bg-skeleton" />
          <span className="h-10 w-full rounded-md bg-skeleton" />
        </div>
      )}
    </div>
  );
}

const LazyDrawer = dynamic<ReviewSheetDrawerProps>(load, {
  ssr: false,
  loading: ({ error }) => <SheetFallback error={error} />,
});

export function preloadReviewSheet(): void {
  void load().catch(() => undefined);
}

type State = { open: boolean; config: ReviewSheetConfig; key: number };

export function useReviewSheet(): {
  open: (config: ReviewSheetConfig) => void;
  close: () => void;
  preload: () => void;
  isOpen: boolean;
  sheet: ReactNode;
} {
  const [state, setState] = useState<State | null>(null);
  const open = useCallback((config: ReviewSheetConfig) => {
    // 열 때마다 새 입력 상태(key)
    setState((s) => ({ open: true, config, key: (s?.key ?? 0) + 1 }));
  }, []);
  const close = useCallback(
    () => setState((s) => (s ? { ...s, open: false } : s)),
    [],
  );
  const onOpenChange = useCallback(
    (next: boolean) => setState((s) => (s ? { ...s, open: next } : s)),
    [],
  );
  const sheet = state ? (
    <LazyDrawer
      key={state.key}
      open={state.open}
      onOpenChange={onOpenChange}
      config={state.config}
    />
  ) : null;
  return {
    open,
    close,
    preload: preloadReviewSheet,
    isOpen: state?.open ?? false,
    sheet,
  };
}
