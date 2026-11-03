"use client";
// 탭 스와이프 시안 C "탭 막대 밀기" (T9.14).
// - 본문은 스와이프를 받지 않는다(지도 끌기, 칩 줄, 안쪽 탭, 카드 누르기와 전혀 부딪히지 않는다).
//   하단 탭 막대 위에서 손가락을 좌우로 밀면 렌즈(muted 면)가 손가락을 따라 칸 위를 미끄러지고,
//   손가락이 가리는 탭 이름이 막대 위 말풍선(세리프)으로 떠오른다. 놓은 자리의 탭으로 옮긴다. 누르기는 지금처럼 바로 이동.
// - 처음 한 번 막대 위에 안내 한 줄("탭 막대를 좌우로 밀어도 옮길 수 있습니다.")을 보이고, 한 번 밀면 숨긴다.
// - 놓으면 렌즈가 칸 가운데로 붙었다가(base, enter) 사라지고, 본문은 B와 같은 교차 페이드다.
// - 판정: 처음 10px 동안 방향을 본다(가로가 세로의 1.5배). 세로면 무시. 화면 가장자리 24px 시작은 받지 않는다(iOS 뒤로 가기).
// - 축소 모드: 렌즈가 따라오지만 붙는 전환이 없고 본문은 바로 바뀐다.
import { useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { cn } from "@/lib/utils";
import { canStartAt, lockAxis, type SwipeDir } from "../gesture";
import type { SwipeParams } from "../params";
import {
  Announcer,
  copy,
  LabTabBar,
  SwipeFrame,
  TAB_COUNT,
  TabScreen,
  tabAt,
  useLabReduced,
  useLabTabs,
  useTransitSteps,
  type Transit,
} from "../shared";

type Scrub = {
  /** 렌즈 가운데, 막대 폭 대비 0~1 */
  center: number;
  hover: number;
};

function hoverOf(center: number): number {
  return Math.max(0, Math.min(TAB_COUNT - 1, Math.floor(center * TAB_COUNT)));
}

function demoScrub(demo: SwipeParams["demo"], index: number): Scrub | null {
  const cell = 1 / TAB_COUNT;
  if (demo === "drag") {
    const center = (index + 0.5 + 0.6) * cell;
    return { center, hover: hoverOf(center) };
  }
  if (demo === "armed") {
    const center = (Math.min(index + 1, TAB_COUNT - 1) + 0.5) * cell;
    return { center, hover: hoverOf(center) };
  }
  if (demo === "end") {
    const center = 1 - cell / 2;
    return { center, hover: TAB_COUNT - 1 };
  }
  return null;
}

export function SwipeC({ p }: { p: SwipeParams }) {
  const tabs = useLabTabs(p.tab);
  const reduced = useLabReduced();
  const [demo, setDemo] = useState(p.demo);
  const [scrub, setScrub] = useState<Scrub | null>(null);
  /** 놓은 뒤 렌즈가 칸 가운데로 붙는 동안 */
  const [snap, setSnap] = useState<Scrub | null>(null);
  const [hintSeen, setHintSeen] = useState(p.demo !== "none");
  const [transit, setTransit] = useState<Transit>({ kind: "idle" });
  const track = useRef<{
    id: number;
    x0: number;
    y0: number;
    left: number;
    width: number;
    axis: "x" | "y" | null;
  } | null>(null);
  const suppressClick = useRef(false);

  useTransitSteps(transit, setTransit, (target, dir) => {
    tabs.go(target);
    setTransit({ kind: "in", dir });
  });

  function centerAt(t: { left: number; width: number }, clientX: number) {
    const cell = 1 / TAB_COUNT;
    const raw = (clientX - t.left) / t.width;
    return Math.max(cell / 2, Math.min(1 - cell / 2, raw));
  }

  function select(target: number) {
    if (target === tabs.index) return;
    const dir: SwipeDir = target > tabs.index ? 1 : -1;
    if (reduced) {
      tabs.go(target);
      return;
    }
    setTransit({ kind: "out", dir, target });
  }

  const barHandlers = {
    onPointerDown(e: PointerEvent<HTMLUListElement>) {
      suppressClick.current = false;
      setDemo("none");
      if (track.current) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (!canStartAt(e.clientX, window.innerWidth)) return;
      const rect = e.currentTarget.getBoundingClientRect();
      track.current = {
        id: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        left: rect.left,
        width: rect.width,
        axis: null,
      };
    },
    onPointerMove(e: PointerEvent<HTMLUListElement>) {
      const t = track.current;
      if (!t || e.pointerId !== t.id) return;
      if (t.axis === null) {
        const axis = lockAxis(e.clientX - t.x0, e.clientY - t.y0);
        if (axis === null) return;
        if (axis === "y") {
          track.current = null;
          return;
        }
        t.axis = "x";
        e.currentTarget.setPointerCapture?.(e.pointerId);
        setHintSeen(true);
        setSnap(null);
      }
      const center = centerAt(t, e.clientX);
      setScrub({ center, hover: hoverOf(center) });
    },
    onPointerUp(e: PointerEvent<HTMLUListElement>) {
      const t = track.current;
      if (!t || e.pointerId !== t.id) return;
      track.current = null;
      if (t.axis !== "x") return;
      suppressClick.current = true;
      const hover = hoverOf(centerAt(t, e.clientX));
      setScrub(null);
      if (!reduced) {
        setSnap({ center: (hover + 0.5) / TAB_COUNT, hover });
        window.setTimeout(() => setSnap(null), 300);
      }
      select(hover);
    },
    onPointerCancel() {
      track.current = null;
      setScrub(null);
    },
    onClickCapture(e: MouseEvent<HTMLUListElement>) {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
  };

  const shown = scrub ?? snap ?? demoScrub(demo, tabs.index);

  return (
    <SwipeFrame
      list={
        <main
          className="flex min-w-0 flex-1 flex-col"
          style={contentStyle(transit, reduced)}
        >
          <TabScreen tab={tabs.tab.id} state={p.state} />
          <Announcer text={tabs.announcement} />
        </main>
      }
      tabBar={
        <LabTabBar
          activeIndex={tabs.index}
          highlightIndex={shown ? shown.hover : null}
          onSelect={(i) => {
            setHintSeen(true);
            select(i);
          }}
          className="overflow-visible"
          listClassName="touch-pan-y"
          {...barHandlers}
          lens={
            <Lens scrub={shown} snapping={snap !== null && scrub === null} />
          }
          hint={
            hintSeen ? null : (
              <p className="px-(--lm-layout-gutter) pt-2 text-center type-caption text-muted-foreground">
                {copy.scrubHint}
              </p>
            )
          }
        />
      }
    />
  );
}

function contentStyle(
  transit: Transit,
  reduced: boolean,
): { transform?: string; transition?: string; opacity?: number } {
  if (reduced) return {};
  switch (transit.kind) {
    case "out":
      return {
        opacity: 0,
        transition: "opacity var(--lm-duration-fast) var(--lm-ease-exit)",
      };
    case "in":
      return {
        opacity: 0,
        transform: `translateX(${transit.dir === 1 ? "16px" : "-16px"})`,
        transition: "none",
      };
    case "enter":
      return {
        opacity: 1,
        transform: "translateX(0)",
        transition:
          "transform var(--lm-duration-base) var(--lm-ease-enter), opacity var(--lm-duration-base) var(--lm-ease-enter)",
      };
    default:
      return {};
  }
}

/** 손가락을 따라오는 렌즈와 막대 위 말풍선 */
function Lens({ scrub, snapping }: { scrub: Scrub | null; snapping: boolean }) {
  if (!scrub) return null;
  const tab = tabAt(scrub.hover);
  const left = `${scrub.center * 100}%`;
  const move = snapping
    ? "left var(--lm-duration-base) var(--lm-ease-enter)"
    : "none";
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-1.5 z-0 w-[calc(25%-0.75rem)] -translate-x-1/2 rounded-card bg-muted"
        style={{ left, transition: move }}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute bottom-full z-20 mb-3 -translate-x-1/2 rounded-card border border-border bg-popover px-4 py-2 type-heading font-serif whitespace-nowrap text-popover-foreground",
        )}
        style={{ left, transition: move }}
      >
        {tab.label}
      </span>
    </>
  );
}
