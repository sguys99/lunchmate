"use client";
// 탭 스와이프 시안 B "가장자리 표시" (T9.14).
// - 본문은 거의 그대로다(민 거리의 1/8만, 최대 20px 기울듯 밀린다). 미는 쪽 화면 가장자리에서 알약 하나가
//   손가락만큼 나와 옆 탭 이름을 보인다. 기준선을 넘기면 알약이 진한 면(foreground)으로 바뀌고 "놓으면 옮깁니다"가 붙는다.
//   그 순간 하단 탭에서도 옮겨 갈 탭 글자가 진해진다(활성 막대는 놓을 때 옮긴다).
// - 놓으면: 넘어가면 본문이 흐려졌다가(fast, exit) 새 탭이 미는 쪽에서 16px 들어오며 나타난다(base, enter). 제자리면 알약이 들어간다.
// - 양 끝 탭은 알약이 나오지 않고 본문만 1/8 버틴다.
// - 알약은 화면 세로 38% 자리에 머문다(sticky). 올리브 면은 쓰지 않는다(화면의 주 버튼 자리를 뺏지 않게).
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { SwipeParams } from "../params";
import {
  Announcer,
  copy,
  demoView,
  LabTabBar,
  SwipeFrame,
  TAB_COUNT,
  TabScreen,
  tabAt,
  useLabReduced,
  useLabTabs,
  useTransitSteps,
  viewOf,
  type Transit,
  type ViewDrag,
} from "../shared";
import { useTabSwipe, type SwipeRelease } from "../use-tab-swipe";

const NUDGE_FACTOR = 0.125;
const NUDGE_MAX_PX = 20;

export function SwipeB({ p }: { p: SwipeParams }) {
  const tabs = useLabTabs(p.tab);
  const reduced = useLabReduced();
  const [demo, setDemo] = useState(p.demo);
  const [transit, setTransit] = useState<Transit>({ kind: "idle" });

  function onRelease({ target, last }: SwipeRelease) {
    if (target === null || last.dir === null) {
      setTransit(reduced ? { kind: "idle" } : { kind: "back" });
      return;
    }
    if (reduced) {
      tabs.go(target);
      return;
    }
    setTransit({ kind: "out", dir: last.dir, target });
  }

  const { drag, width, handlers } = useTabSwipe({
    index: tabs.index,
    count: TAB_COUNT,
    enabled: transit.kind === "idle" || transit.kind === "back",
    onRelease,
  });

  useTransitSteps(transit, setTransit, (target, dir) => {
    tabs.go(target);
    setTransit({ kind: "in", dir });
  });

  const view: ViewDrag | null = drag
    ? viewOf(drag, width)
    : demoView(demo, tabs.index);

  return (
    <SwipeFrame
      list={
        <div
          {...handlers}
          onPointerDownCapture={() => setDemo("none")}
          className="relative flex min-w-0 flex-1 touch-pan-y flex-col overflow-x-clip select-none desktop:select-auto"
        >
          <EdgePill view={view} reduced={reduced} />
          <main
            className="flex min-w-0 flex-1 flex-col"
            style={contentStyle(view, transit, reduced, width)}
          >
            <TabScreen tab={tabs.tab.id} state={p.state} />
          </main>
          <Announcer text={tabs.announcement} />
        </div>
      }
      tabBar={
        <LabTabBar
          activeIndex={tabs.index}
          highlightIndex={view?.armed ? view.target : null}
          onSelect={(i) => tabs.go(i)}
        />
      }
    />
  );
}

function contentStyle(
  view: ViewDrag | null,
  transit: Transit,
  reduced: boolean,
  width: number,
): { transform?: string; transition?: string; opacity?: number } {
  if (reduced) return {};
  if (view) {
    // demo(폭 모름)는 비율로, 손가락은 px로
    const px = view.ratio * (width || 390) * NUDGE_FACTOR;
    const nudge = Math.max(-NUDGE_MAX_PX, Math.min(NUDGE_MAX_PX, px));
    return { transform: `translateX(${nudge}px)`, transition: "none" };
  }
  switch (transit.kind) {
    case "back":
      return {
        transform: "translateX(0)",
        transition: "transform var(--lm-duration-base) var(--lm-ease-enter)",
      };
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

/** 미는 쪽 가장자리 알약. 손가락만큼(기준선에서 다 나옴) 나온다 */
function EdgePill({
  view,
  reduced,
}: {
  view: ViewDrag | null;
  reduced: boolean;
}) {
  const show = view !== null && view.target !== null && view.dir !== null;
  const tab = show ? tabAt(view.target!) : null;
  const next = view?.dir === 1;
  // 다 숨었을 때는 알약 폭 + 여백만큼 바깥, progress 1이면 제자리
  const hidden = 1 - (view?.progress ?? 0);
  const shift = next
    ? `calc(${hidden} * (100% + 16px))`
    : `calc(${-hidden} * (100% + 16px))`;
  return (
    <div
      aria-hidden
      className="pointer-events-none sticky top-[38svh] z-20 h-0"
    >
      {tab ? (
        <span
          className={cn(
            "absolute flex h-11 items-center gap-1.5 rounded-full border px-4 type-label whitespace-nowrap",
            "transition-colors duration-(--lm-duration-fast) ease-standard",
            next ? "right-3 flex-row" : "left-3 flex-row-reverse",
            view!.armed
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-card text-foreground",
          )}
          style={{
            transform: reduced ? undefined : `translateX(${shift})`,
            opacity: reduced ? view!.progress : 1,
          }}
        >
          <span className="flex flex-col leading-tight">
            <span>{tab.label}</span>
            {view!.armed ? (
              <span className="type-caption">{copy.hint.release}</span>
            ) : null}
          </span>
          {next ? (
            <ChevronRight aria-hidden className="size-4" strokeWidth={1.5} />
          ) : (
            <ChevronLeft aria-hidden className="size-4" strokeWidth={1.5} />
          )}
        </span>
      ) : null}
    </div>
  );
}
