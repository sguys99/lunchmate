"use client";
// 지도 시안 공용 바텀시트 (T5.1, MAP-04). 모바일은 지도 위에 겹치는 시트, 데스크톱(1024px 이상)은 좌 리스트 칸.
//
// - 높이 단계는 시안이 snaps로 정한다(남은 B안은 반쯤, 끝까지. 작게(peek)는 지운 A안이 쓰던 단계). 높이는 px 또는 칸 높이 비율.
// - 손잡이와 머리를 끌어 옮기고, 놓으면 가까운 단계로(빠르게 튕기면 한 단계 더). 끄는 동안은 손가락을 바로 따른다.
//   놓은 뒤는 slow 300 enter(DESIGN.md sheet, 오버슈트 없음). 축소 모드는 즉시.
// - 끌기 대체 조작: 손잡이가 버튼이다. 누르면 한 단계 올리고, 끝까지면 한 단계 내린다. 바뀐 높이는 aria-live로 알린다.
// - 끝까지가 아니면 본문은 스크롤하지 않는다(어디를 끌어도 시트가 움직임). 끝까지에서만 본문이 스크롤된다(PoC T2.13과 같음).
// - 지도를 가리지 않는 비모달 시트다. 뒤 딤이 없고 지도와 함께 조작한다. (지운 C안은 필터에 모달 Base UI Drawer를 썼다.)
//
// 구현 메모: 상시 떠 있는 비모달 시트라 Base UI Drawer(포털, fixed 뷰포트) 대신 지도 칸 안의 절대 위치 요소로 그렸다.
// 하단 탭 위에 자연스럽게 앉고 데스크톱에서는 같은 요소가 좌 칸이 된다. 실제 구현 방식은 비교 자료 안건으로 묻는다.
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import { focusRing } from "@/components/ui/interaction";
import { mapLabCopy } from "@/copy/design-lab-map";
import { cn } from "@/lib/utils";
import type { SheetSnap } from "./params";

const copy = mapLabCopy.sheet;
const FLICK_PX_PER_MS = 0.5;
const TOP_GAP_PX = 8;

export type SnapHeights = Partial<Record<SheetSnap, number>>;

/** 높이 값: 1 이하면 칸 높이 비율, 그보다 크면 px */
function toPx(value: number, stage: number) {
  return value <= 1 ? Math.round(stage * value) : value;
}

export function MapSheet({
  snaps,
  heights,
  snap,
  onSnapChange,
  desktop,
  header,
  children,
  footer,
  label = copy.label,
  className,
  bodyClassName,
}: {
  snaps: readonly SheetSnap[];
  heights: SnapHeights;
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  desktop: boolean;
  /** 손잡이 아래 머리(끌기 영역). 칩이나 개수 */
  header?: ReactNode;
  children: ReactNode;
  /** 시트 바닥에 붙는 줄(주 버튼) */
  footer?: ReactNode;
  label?: string;
  className?: string;
  bodyClassName?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [stage, setStage] = useState(0);
  const [dragY, setDragY] = useState<number | null>(null);
  const [announce, setAnnounce] = useState("");
  const drag = useRef<{
    id: number;
    startY: number;
    startOffset: number;
    lastY: number;
    lastT: number;
    v: number;
    moved: boolean;
  } | null>(null);

  // 시트가 놓인 칸 높이. display: contents인 감싸개는 상자가 없어 건너뛴다
  useEffect(() => {
    let parent = ref.current?.parentElement ?? null;
    while (parent && getComputedStyle(parent).display === "contents") {
      parent = parent.parentElement;
    }
    if (!parent) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setStage(entry.contentRect.height);
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  const sheetHeight = Math.max(0, stage - TOP_GAP_PX);
  const snapPx = (s: SheetSnap) =>
    Math.min(sheetHeight, toPx(heights[s] ?? 0, stage));
  const offsetOf = (s: SheetSnap) => sheetHeight - snapPx(s);
  const offset = dragY ?? offsetOf(snap);
  const index = snaps.indexOf(snap);
  const atTop = index === snaps.length - 1;

  function setSnap(next: SheetSnap) {
    onSnapChange(next);
    setAnnounce(copy.snapAnnounce[next]);
  }

  function onPointerDown(e: PointerEvent<HTMLElement>) {
    if (desktop || e.button !== 0) return;
    drag.current = {
      id: e.pointerId,
      startY: e.clientY,
      startOffset: offset,
      lastY: e.clientY,
      lastT: e.timeStamp,
      v: 0,
      moved: false,
    };
  }
  function onPointerMove(e: PointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.abs(dy) < 6) return;
    if (!d.moved) {
      d.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.v = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    const min = offsetOf(snaps[snaps.length - 1] ?? snap);
    const max = offsetOf(snaps[0] ?? snap);
    setDragY(Math.min(max + 24, Math.max(min - 24, d.startOffset + dy)));
  }
  function onPointerUp(e: PointerEvent<HTMLElement>) {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId || !d.moved) return;
    const pos = dragY ?? offset;
    setDragY(null);
    let best = snaps.reduce((a, b) =>
      Math.abs(offsetOf(b) - pos) < Math.abs(offsetOf(a) - pos) ? b : a,
    );
    // 빠르게 튕기면 그 방향으로 한 단계
    if (Math.abs(d.v) > FLICK_PX_PER_MS) {
      const cur = snaps.indexOf(snap);
      const dir = d.v < 0 ? 1 : -1;
      const next = snaps[Math.min(snaps.length - 1, Math.max(0, cur + dir))];
      if (next) best = next;
    }
    setSnap(best);
  }

  const dragHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: () => {
      drag.current = null;
      setDragY(null);
    },
  };

  return (
    <section
      ref={ref}
      aria-label={label}
      data-snap={snap}
      data-dragging={dragY !== null}
      className={cn(
        // 모바일: 지도 칸 바닥에 붙은 시트. 높이는 칸 전체, 보이는 만큼만 아래에서 올라온다
        "ml-sheet absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-sheet bg-popover text-popover-foreground shadow-sheet",
        // 데스크톱: 좌 리스트 칸
        "desktop:static desktop:z-auto desktop:h-full desktop:min-h-0 desktop:rounded-none desktop:bg-background desktop:shadow-none",
        stage === 0 && !desktop && "invisible",
        className,
      )}
      style={
        desktop
          ? undefined
          : {
              height: sheetHeight,
              transform: `translateY(${offset}px)`,
            }
      }
    >
      <div
        {...dragHandlers}
        className="shrink-0 touch-none select-none desktop:touch-auto desktop:select-auto"
      >
        <button
          type="button"
          onClick={() => {
            const next = atTop ? snaps[index - 1] : snaps[index + 1];
            if (next) setSnap(next);
          }}
          aria-label={atTop ? copy.lower : copy.raise}
          className={cn(
            "mx-auto flex h-6 w-16 items-center justify-center rounded-full desktop:hidden",
            focusRing,
          )}
        >
          <span aria-hidden className="h-1 w-9 rounded-full bg-border" />
        </button>
        {header}
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 overscroll-contain",
          desktop || snap === "full" ? "overflow-y-auto" : "overflow-hidden",
          bodyClassName,
        )}
        // 끝까지가 아니면 본문을 끌어도 시트가 움직인다
        {...(desktop || snap === "full" ? {} : dragHandlers)}
      >
        {children}
      </div>
      {footer}
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
    </section>
  );
}
