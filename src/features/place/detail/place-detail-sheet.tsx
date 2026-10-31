"use client";
// 홈 "상세" 바텀시트 진입점 (D-10 안건 1, D-08 "Drawer는 행동을 누른 뒤 지연 로딩"). login-prompt와 같은 방식.
//
//   const detail = usePlaceDetailSheet();
//   <button onClick={() => detail.open({ kind: "ready", place, stats, meal, budgetKRW, source: "rec", origin })}>상세</button>
//   {detail.sheet}
//
// - 시트(Base UI Drawer, Menu 포함)는 open()을 처음 부를 때 동적 import한다. 그 전에는 sheet가 null이라
//   홈 첫 로드 번들에 들어가지 않는다. preload()를 "상세" 버튼 pointerenter, focus에 걸면 받는 시간을 줄일 수 있다.
// - 받는 동안은 바닥에 스켈레톤 시트, 받지 못하면(청크 실패, 오프라인) 카카오맵 링크가 있는 작은 패널로 대신한다.
// - 열린 동안 내용만 바꿀 때는 update(content)를 부른다(집계가 늦게 오는 경우).
import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { placeCopy } from "@/copy/place";
import { cn } from "@/lib/utils";
import type {
  PlaceDetailDrawerProps,
  PlaceDetailSheetContent,
} from "./place-detail-drawer";

export type { PlaceDetailSheetContent } from "./place-detail-drawer";

const copy = placeCopy;

const load = () => import("./place-detail-drawer");

// 청크를 받지 못했을 때 보일 카카오맵 링크. dynamic의 loading도 같은 트리 안이라 컨텍스트로 넘긴다
const FallbackUrl = createContext<string | null>(null);

function SheetFallback({ error }: { error?: unknown }) {
  const placeUrl = useContext(FallbackUrl);
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-(--lm-layout-max-width) flex-col gap-4 rounded-t-sheet bg-popover px-(--lm-layout-gutter) pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-sheet min-[64rem]:inset-y-0 min-[64rem]:right-auto min-[64rem]:mx-0 min-[64rem]:w-2/5 min-[64rem]:max-w-none min-[64rem]:rounded-none min-[64rem]:px-10 min-[64rem]:pt-20">
      {error ? (
        <div role="alert" className="flex flex-col gap-3">
          <p className="type-label">{copy.states.errorTitle}</p>
          <p className="type-caption break-keep text-muted-foreground">
            {copy.states.errorBody}
          </p>
          {placeUrl ? (
            <a
              href={placeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonClass("secondary"), "w-full")}
            >
              {copy.openKakaoMap}
            </a>
          ) : null}
        </div>
      ) : (
        <div
          role="status"
          aria-busy
          aria-label={copy.states.loading}
          className="flex flex-col gap-3"
        >
          <span className="h-3 w-12 rounded-full bg-skeleton" />
          <span className="h-7 w-48 rounded-full bg-skeleton" />
          <span className="mt-2 h-12 w-full rounded-md bg-skeleton" />
        </div>
      )}
    </div>
  );
}

type LazyProps = PlaceDetailDrawerProps & { fallbackUrl: string | null };

const LazyDrawer = dynamic<PlaceDetailDrawerProps>(load, {
  ssr: false,
  loading: ({ error }) => <SheetFallback error={error} />,
});

/** 선언형으로 쓸 때. open이 처음 true가 될 때까지 시트 코드를 받지 않는다 */
export function PlaceDetailSheet({ fallbackUrl, ...props }: LazyProps) {
  const [mounted, setMounted] = useState(props.open);
  if (props.open && !mounted) setMounted(true);
  if (!mounted) return null;
  return (
    <FallbackUrl value={fallbackUrl}>
      <LazyDrawer {...props} />
    </FallbackUrl>
  );
}

/** 미리 받기. "상세" 버튼에 마우스를 올리거나 포커스할 때 */
export function preloadPlaceDetailSheet(): void {
  void load().catch(() => undefined);
}

type SheetState = { open: boolean; content: PlaceDetailSheetContent };

export function usePlaceDetailSheet(
  options: {
    container?: HTMLElement | null;
  } = {},
): {
  open: (content: PlaceDetailSheetContent) => void;
  update: (content: PlaceDetailSheetContent) => void;
  close: () => void;
  preload: () => void;
  isOpen: boolean;
  sheet: ReactNode;
} {
  const [state, setState] = useState<SheetState | null>(null);

  const open = useCallback((content: PlaceDetailSheetContent) => {
    setState({ open: true, content });
  }, []);
  const update = useCallback(
    (content: PlaceDetailSheetContent) =>
      setState((s) => (s ? { ...s, content } : s)),
    [],
  );
  const close = useCallback(
    () => setState((s) => (s ? { ...s, open: false } : s)),
    [],
  );
  const onOpenChange = useCallback(
    (next: boolean) => setState((s) => (s ? { ...s, open: next } : s)),
    [],
  );

  const sheet = state ? (
    <PlaceDetailSheet
      open={state.open}
      onOpenChange={onOpenChange}
      content={state.content}
      container={options.container}
      fallbackUrl={
        state.content.kind === "ready" ? state.content.place.placeUrl : null
      }
    />
  ) : null;

  return {
    open,
    update,
    close,
    preload: preloadPlaceDetailSheet,
    isOpen: state?.open ?? false,
    sheet,
  };
}
