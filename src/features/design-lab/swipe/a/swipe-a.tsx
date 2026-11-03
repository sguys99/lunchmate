"use client";
// 탭 스와이프 시안 A "따라오는 페이지" (T9.14).
// - 본문이 손가락을 따라 옆으로 밀리고, 비켜난 자리에 옆 탭 이름(세리프)과 아이콘, 안내 한 줄이 비친다.
//   기준선(폭 30%)을 넘기면 "놓으면 옮깁니다"가 붙고 이름이 진해진다. 표시는 바깥 가장자리에 붙어 있어 비켜난 만큼 드러난다.
// - 놓으면: 넘어가면 지금 본문이 같은 방향으로 빠져나가고(fast, exit) 새 탭 본문이 반대쪽 32px에서 들어온다(base, enter).
//   제자리면 본문이 돌아온다(base, enter). 양 끝 탭은 1/4만 따라오다 48px에서 멈춘다(옆 탭 표시 없음).
// - 축소 모드: 본문이 따라오지 않고(옆 탭 표시만), 놓으면 바로 바뀐다.
// - 본문 가장자리는 1px 선 하나로 뒤 면과 나눈다(그림자 없음).
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

export function SwipeA({ p }: { p: SwipeParams }) {
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

  const { transform, transition, opacity } = contentStyle(
    view,
    transit,
    reduced,
  );

  return (
    <SwipeFrame
      list={
        <div
          {...handlers}
          onPointerDownCapture={() => setDemo("none")}
          className="relative flex min-w-0 flex-1 touch-pan-y flex-col overflow-x-clip select-none desktop:select-auto"
        >
          <Peek view={view} />
          <main
            className={cn(
              "relative z-10 flex min-w-0 flex-1 flex-col bg-background will-change-transform",
              view && "border-x border-border",
            )}
            style={{ transform, transition, opacity }}
          >
            <TabScreen tab={tabs.tab.id} state={p.state} />
          </main>
          <Announcer text={tabs.announcement} />
        </div>
      }
      tabBar={
        <LabTabBar activeIndex={tabs.index} onSelect={(i) => tabs.go(i)} />
      }
    />
  );
}

function contentStyle(
  view: ViewDrag | null,
  transit: Transit,
  reduced: boolean,
): { transform?: string; transition?: string; opacity?: number } {
  if (reduced) return {};
  if (view)
    return { transform: `translateX(${view.offset})`, transition: "none" };
  switch (transit.kind) {
    case "back":
      return {
        transform: "translateX(0)",
        transition: "transform var(--lm-duration-base) var(--lm-ease-enter)",
      };
    case "out":
      return {
        transform: `translateX(${transit.dir === 1 ? "-100%" : "100%"})`,
        transition: "transform var(--lm-duration-fast) var(--lm-ease-exit)",
      };
    case "in":
      return {
        transform: `translateX(${transit.dir === 1 ? "32px" : "-32px"})`,
        opacity: 0,
        transition: "none",
      };
    case "enter":
      return {
        transform: "translateX(0)",
        opacity: 1,
        transition:
          "transform var(--lm-duration-base) var(--lm-ease-enter), opacity var(--lm-duration-base) var(--lm-ease-enter)",
      };
    default:
      return {};
  }
}

/** 본문 뒤 면: 비켜난 쪽에 옆 탭 이름과 안내. 양 끝(옆 탭 없음)이면 빈 면 */
function Peek({ view }: { view: ViewDrag | null }) {
  if (!view || view.target === null || view.dir === null) return null;
  const tab = tabAt(view.target);
  const Icon = tab.Icon;
  const width = `${Math.min(Math.abs(view.ratio), 0.6) * 100}%`;
  return (
    <div
      aria-hidden
      className={cn(
        "absolute inset-y-0 z-0 flex flex-col overflow-x-clip bg-muted",
        // 바깥 가장자리에 붙여, 비켜난 자리가 넓어질수록 바깥에서부터 드러나게 한다
        view.dir === 1 ? "right-0 items-end pr-5" : "left-0 items-start pl-5",
      )}
      style={{ width }}
    >
      <div
        className={cn(
          "sticky top-[38svh] flex flex-col gap-2",
          view.dir === 1 ? "items-end text-right" : "items-start text-left",
        )}
      >
        <Icon
          className={cn(
            "size-7 transition-colors duration-(--lm-duration-fast)",
            view.armed ? "text-foreground" : "text-muted-foreground",
          )}
          strokeWidth={1.5}
        />
        <span
          className={cn(
            "type-heading font-serif whitespace-nowrap transition-colors duration-(--lm-duration-fast)",
            view.armed ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {tab.label}
        </span>
        {/* 안내는 기준선을 넘긴 뒤에만(그 전에는 자리가 좁아 잘린다) */}
        {view.armed ? (
          <span className="type-caption whitespace-nowrap text-muted-foreground">
            {copy.hint.release}
          </span>
        ) : null}
      </div>
    </div>
  );
}
