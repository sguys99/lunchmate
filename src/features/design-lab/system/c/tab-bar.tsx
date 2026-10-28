"use client";
// 시안 C 하단 탭: 56px, 위 헤어라인, 선택은 아이콘 위 16x2 클레이 막대 + 클레이 아이콘과 라벨 (c.DESIGN.md 5절).
// 데스크톱(desktop:)에서는 하단 탭 대신 리스트 위 세그먼트 탭으로 바뀐다.
import * as m from "motion/react-m";
import { homeCopy } from "@/copy/home";
import { cn } from "@/lib/utils";
import { springOf } from "../motion";
import { DESIGN_TABS, type DesignTabId } from "../tabs";
import type { DesignMotionTokens } from "../types";

export function TabBarC({
  active,
  motion,
  className,
}: {
  active: DesignTabId;
  motion: DesignMotionTokens;
  className?: string;
}) {
  return (
    <nav
      aria-label={homeCopy.tabBarLabel}
      className={cn(
        "border-t border-border bg-background pb-[env(safe-area-inset-bottom,0px)] desktop:hidden",
        className,
      )}
    >
      <ul className="grid h-(--lm-layout-tab-bar-height) grid-cols-4">
        {DESIGN_TABS.map(({ id, label, Icon }) => {
          const selected = id === active;
          return (
            <li key={id} className="flex">
              <m.button
                type="button"
                aria-current={selected ? "page" : undefined}
                whileTap={{ scale: 0.92 }}
                transition={springOf(motion, "press")}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-1 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  selected ? "text-primary" : "text-muted-foreground",
                )}
              >
                {selected && (
                  <span
                    aria-hidden
                    className="absolute top-0 h-0.5 w-4 bg-primary"
                  />
                )}
                <Icon aria-hidden className="size-[22px]" strokeWidth={1.75} />
                <span className="type-caption">{label}</span>
              </m.button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** 데스크톱 전용 세그먼트 탭 (리스트 상단) */
export function SegmentTabsC({ active }: { active: DesignTabId }) {
  return (
    <nav
      aria-label={homeCopy.tabBarLabel}
      className="hidden px-(--lm-layout-gutter) pt-4 desktop:block"
    >
      <ul className="grid h-10 grid-cols-4 gap-1 rounded-button border border-border bg-muted p-1">
        {DESIGN_TABS.map(({ id, label, Icon }) => {
          const selected = id === active;
          return (
            <li key={id} className="flex">
              <button
                type="button"
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md type-label outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "border border-border bg-card text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon aria-hidden className="size-4" strokeWidth={1.75} />
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
