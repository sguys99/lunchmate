"use client";
// 식당 메모 시트 진입점 (T10.15, D-33 B). review-sheet, place-detail-sheet와 같은 방식: 시트 코드(Base UI Drawer, 입력)는
// open()을 처음 부를 때 받는다. 받는 동안은 바닥에 스켈레톤 시트, 받지 못하면 안내 한 줄.
//
//   const editor = useMemoSheet();
//   <NameTag onOpen={(el) => editor.open({ placeId, placeUrl, memo }, el)} />
//   {editor.sheet}  <SavedLine text={editor.result} />
import dynamic from "next/dynamic";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { memoCopy as copy } from "@/copy/memo";
import type {
  MemoSheetDrawerProps,
  MemoSheetTarget,
} from "./memo-sheet-drawer";

export type { MemoSheetTarget } from "./memo-sheet-drawer";

const load = () => import("./memo-sheet-drawer");

function SheetFallback({ error }: { error?: unknown }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] mx-auto flex w-full max-w-(--lm-layout-max-width) flex-col gap-4 rounded-t-sheet bg-popover px-7 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-sheet">
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
          <span className="h-7 w-32 rounded-full bg-skeleton" />
          <span className="mt-2 h-12 w-full rounded-full bg-skeleton" />
        </div>
      )}
    </div>
  );
}

const LazyDrawer = dynamic<MemoSheetDrawerProps>(load, {
  ssr: false,
  loading: ({ error }) => <SheetFallback error={error} />,
});

export function preloadMemoSheet(): void {
  void load().catch(() => undefined);
}

type State = { open: boolean; target: MemoSheetTarget; key: number };

export function useMemoSheet(): {
  open: (target: MemoSheetTarget, opener?: HTMLElement | null) => void;
  preload: () => void;
  /** 마지막 저장 결과 한 줄("메모를 저장했습니다." / "메모를 지웠습니다."). role=status 자리에 둔다 */
  result: string;
  sheet: ReactNode;
} {
  const [state, setState] = useState<State | null>(null);
  const [result, setResult] = useState("");
  const opener = useRef<HTMLElement | null>(null);

  const open = useCallback(
    (target: MemoSheetTarget, el?: HTMLElement | null) => {
      opener.current = el ?? null;
      setResult("");
      // 열 때마다 새 입력 상태(key)
      setState((s) => ({ open: true, target, key: (s?.key ?? 0) + 1 }));
    },
    [],
  );
  const onOpenChange = useCallback(
    (next: boolean) => setState((s) => (s ? { ...s, open: next } : s)),
    [],
  );
  const onSaved = useCallback(
    (memo: string | null) =>
      setResult(memo === null ? copy.result.removed : copy.result.saved),
    [],
  );

  const sheet = state ? (
    <LazyDrawer
      key={state.key}
      open={state.open}
      onOpenChange={onOpenChange}
      target={state.target}
      onSaved={onSaved}
      finalFocus={() => opener.current}
    />
  ) : null;

  return { open, preload: preloadMemoSheet, result, sheet };
}
