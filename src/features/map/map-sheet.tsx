"use client";
// 지도 탭 바텀시트 (T5.29, MAP-04, D-09 안건 3, 4, 2026-10-31 실기기 피드백으로 3단 + 접힘). 모바일은 지도 칸 안에 겹치는 비모달 시트, 데스크톱은 좌 리스트 칸.
//
// - 높이 3단: 낮게(손잡이 + 개수 한 줄, 하단 탭도 숨음) / 반쯤(탭 위 지도 칸의 48%) / 끝까지. 계산은 view-state.ts sheetLayout.
//   시트가 놓인 칸은 하단 탭 아래까지 이어진다. 탭이 보이는 단계에서는 탭 위에 앉고(탭이 시트 아랫부분을 덮는다), 낮게에서는 화면 바닥에 앉는다.
// - 손잡이와 머리를 끌어 옮기고, 놓으면 가까운 단계로(빠르게 튕기면 한 단계 더). 끄는 동안은 손가락을 바로 따르고,
//   놓은 뒤는 slow 300 enter(오버슈트 없음). 축소 모드는 즉시(map.css).
// - 끌기 대체: 손잡이가 버튼이다. 낮게 → 반쯤 → 끝까지 → 반쯤. 낮게에서는 개수 줄도 누르면 반쯤으로 올라온다. 바뀐 높이는 aria-live로 알린다.
// - 낮게와 반쯤에서는 본문이 스크롤하지 않는다(어디를 끌어도 시트가 움직임). 끝까지에서만 본문이 스크롤된다.
//   낮게에서는 화면 밖 본문에 초점이 가지 않게 inert로 둔다.
// - footer(상세 하단 행동 줄)는 시트의 "보이는" 바닥에 붙는다. 낮게에서는 그리지 않는다.
// - Base UI Drawer를 쓰지 않는다(모달이 아니고 탭 바 위에 앉으며 데스크톱에서 좌 칸이 된다). 번들 0.
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { focusRing } from "@/components/ui/interaction";
import { mapCopy } from "@/copy/map";
import { cn } from "@/lib/utils";
import {
  SHEET_TOP_GAP_PX,
  sheetLayout,
  snapAfterDrag,
  type SheetSnap,
} from "./view-state";

export type { SheetSnap } from "./view-state";

const copy = mapCopy.sheet;
const DRAG_START_PX = 6;

export function MapSheet({
  snap,
  onSnapChange,
  onLowTap,
  desktop,
  tabLift,
  safeBottom,
  header,
  lowLine,
  children,
  footer,
  className,
  bodyClassName,
}: {
  snap: SheetSnap;
  /** 끌기나 손잡이로 고른 단계 */
  onSnapChange: (snap: SheetSnap) => void;
  /** 낮게 접힌 시트의 개수 줄을 눌렀다 */
  onLowTap: () => void;
  desktop: boolean;
  /** 하단 탭 높이(홈 인디케이터 칸 포함) */
  tabLift: number;
  /** 홈 인디케이터 칸 */
  safeBottom: number;
  /** 손잡이 아래 머리(끌기 영역). 개수와 칩, 또는 목록으로 */
  header?: ReactNode;
  /** 낮게 단계의 한 줄("도보 10분 안 N곳") */
  lowLine: ReactNode;
  children: ReactNode;
  /** 시트의 보이는 바닥에 붙는 줄(상세 행동 줄) */
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [stage, setStage] = useState(0);
  const [dragTop, setDragTop] = useState<number | null>(null);
  const [announce, setAnnounce] = useState("");
  const drag = useRef<{
    id: number;
    startY: number;
    startTop: number;
    lastY: number;
    lastT: number;
    v: number;
    moved: boolean;
  } | null>(null);
  /** 끌기로 끝난 누르기인가(안쪽 버튼 클릭을 막는다) */
  const dragJustEnded = useRef(false);

  // 시트가 놓인 칸(부모) 높이
  useEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setStage(entry.contentRect.height);
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  // 바깥(지도 끌기, 마커 고르기, 탭 초점)이 바꾼 단계도 알린다
  const shownSnap = useRef(snap);
  useEffect(() => {
    if (desktop || shownSnap.current === snap) return;
    shownSnap.current = snap;
    setAnnounce(copy.snapAnnounce[snap]);
  }, [snap, desktop]);

  const layout = sheetLayout({ stage, tabLift, safeBottom });
  const sheetHeight = Math.max(0, stage - SHEET_TOP_GAP_PX);
  const top = dragTop ?? layout.top[snap];
  const offset = top - SHEET_TOP_GAP_PX;
  const floor = layout.floor[snap];
  const low = snap === "low" && !desktop;

  function onPointerDown(e: PointerEvent<HTMLElement>) {
    if (desktop || e.button !== 0) return;
    // 칩 줄 가로 스크롤과 버튼 누르기는 그대로 둔다(움직임이 생기면 그때 끌기로 바꾼다)
    drag.current = {
      id: e.pointerId,
      startY: e.clientY,
      startTop: top,
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
    if (!d.moved && Math.abs(dy) < DRAG_START_PX) return;
    if (!d.moved) {
      d.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.v = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    const min = layout.top.full;
    const max = layout.top.low;
    setDragTop(Math.min(max + 24, Math.max(min - 24, d.startTop + dy)));
  }
  function onPointerUp(e: PointerEvent<HTMLElement>) {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId || !d.moved) return;
    const pos = dragTop ?? top;
    setDragTop(null);
    const next = snapAfterDrag({ layout, start: snap, top: pos, v: d.v });
    if (next === snap) return;
    shownSnap.current = next;
    setAnnounce(copy.snapAnnounce[next]);
    onSnapChange(next);
  }
  function onClickCapture(e: MouseEvent) {
    // 끌기로 끝난 누르기는 안쪽 버튼 클릭으로 이어지지 않게
    if (dragJustEnded.current) {
      e.stopPropagation();
      e.preventDefault();
      dragJustEnded.current = false;
    }
  }
  const dragHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      dragJustEnded.current = Boolean(drag.current?.moved);
      onPointerUp(e);
    },
    onPointerCancel: () => {
      drag.current = null;
      setDragTop(null);
    },
    onClickCapture,
  };

  function onHandle() {
    const next: SheetSnap = snap === "half" ? "full" : "half";
    shownSnap.current = next;
    setAnnounce(copy.snapAnnounce[next]);
    onSnapChange(next);
  }

  const scrollable = desktop || snap === "full";

  return (
    <section
      ref={ref}
      aria-label={copy.label}
      data-snap={snap}
      data-dragging={dragTop !== null}
      className={cn(
        // 모바일: 칸 바닥에 붙은 시트. 높이는 칸 전체, 보이는 만큼만 아래에서 올라온다
        "lm-map-sheet absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-sheet bg-popover text-popover-foreground shadow-sheet",
        // 데스크톱: 좌 리스트 칸(문서 스크롤)
        "desktop:static desktop:z-auto desktop:flex-1 desktop:rounded-none desktop:bg-background desktop:text-foreground desktop:shadow-none",
        stage === 0 && !desktop && "invisible",
        className,
      )}
      style={
        desktop
          ? undefined
          : { height: sheetHeight, transform: `translateY(${offset}px)` }
      }
    >
      <div
        {...dragHandlers}
        className="shrink-0 touch-none select-none desktop:touch-auto desktop:select-auto"
      >
        <button
          type="button"
          onClick={onHandle}
          aria-label={snap === "full" ? copy.lower : copy.raise}
          aria-expanded={snap === "full"}
          className={cn(
            "mx-auto flex h-7 w-16 items-center justify-center rounded-full desktop:hidden",
            focusRing,
          )}
        >
          <span aria-hidden className="h-1 w-9 rounded-full bg-border" />
        </button>
        {low ? (
          <button
            type="button"
            onClick={onLowTap}
            className={cn(
              "flex h-11 w-full items-center px-(--lm-layout-gutter) text-left type-label",
              focusRing,
              "focus-visible:-outline-offset-4",
            )}
          >
            {lowLine}
          </button>
        ) : (
          header
        )}
      </div>
      <div
        inert={low}
        className={cn(
          "min-h-0 flex-1 overscroll-contain",
          scrollable ? "overflow-y-auto" : "overflow-hidden",
          desktop && "overflow-visible",
          bodyClassName,
        )}
        {...(scrollable ? {} : dragHandlers)}
      >
        {children}
        {/* 끝까지 열림에서 마지막 내용이 행동 줄과 하단 탭에 가리지 않게 */}
        {!desktop ? (
          <div aria-hidden style={{ height: floor + (footer ? 80 : 0) }} />
        ) : null}
      </div>
      {footer && !low ? (
        <div
          className={cn(
            "lm-map-sheet-footer absolute inset-x-0 bottom-0 z-[5] border-t border-border bg-popover px-(--lm-layout-gutter) py-3",
            "desktop:sticky desktop:bottom-[calc(var(--lm-layout-tab-bar-height)+env(safe-area-inset-bottom,0px))] desktop:bg-background desktop:px-10",
          )}
          style={
            desktop
              ? undefined
              : { transform: `translateY(${-(offset + floor)}px)` }
          }
        >
          {footer}
        </div>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
    </section>
  );
}
