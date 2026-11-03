"use client";
// 하단 탭 활성 표시 시안 (T9.15, 사용자 지적 11/03: 지금 탭이 잘 구별되지 않음).
// 본문은 탭 스와이프 시안의 네 탭 목업(TabScreen, 4상태)을 그대로 쓰고 하단 탭 모양만 다르다. 탭을 누르면 시안 안에서 바뀐다.
//
// 지금 모양(DESIGN.md 5장 "하단 탭"): 활성 foreground, 비활성 muted-foreground(밝기 0.30 대 0.47), 위쪽 2px x 20px primary 막대.
// - A 굵게와 넓은 막대: 색은 지금처럼 foreground. 활성 아이콘 선 2px, 라벨 semibold, 막대 3px x 칸 폭 40%(라운드 아래쪽만).
//   면 없음 규칙은 지킨다. 바뀌는 것은 굵기와 막대 크기뿐이다.
// - B 아이콘 알약: 활성 아이콘 뒤 56 x 30 알약(primary 12% 면), 아이콘 primary 선 2px, 라벨 foreground semibold. 막대 없음.
//   "면 색으로 활성을 표시하지 않는다" 규칙을 바꾸는 안이다. 면은 primary 버튼이 아니라 옅은 틴트라 한 화면 primary 버튼 1개 규칙과 겹치지 않는다.
// - C 올리브 글자와 점: 활성 아이콘과 라벨 primary, 선 2px, 라벨 semibold, 라벨 아래 4px 점. 비활성 아이콘은 muted-foreground 60%로 더 옅게
//   (라벨은 muted-foreground 그대로라 글자 대비 4.5:1 유지). 위쪽 막대 없음.
// 전환: 색과 면은 fast(나갈 때) / base(들어올 때) CSS 전환, 축소 모드는 즉시. 세 안 모두 홈 첫 로드 번들 증가 0(CSS 클래스만).
import { APP_TABS, type AppTabId } from "@/components/app-shell/tabs";
import { focusRing } from "@/components/ui/interaction";
import { commonCopy } from "@/copy/common";
import type { DesignState } from "@/features/design-lab/mock";
import { cn } from "@/lib/utils";
import {
  Announcer,
  SwipeFrame,
  TabScreen,
  useLabReduced,
  useLabTabs,
} from "@/features/design-lab/swipe/shared";

export type TabBarVariant = "a" | "b" | "c";

export function TabBarLab({
  variant,
  tab,
  state,
}: {
  variant: TabBarVariant;
  tab: AppTabId;
  state: DesignState;
}) {
  const tabs = useLabTabs(tab);
  const reduced = useLabReduced();
  return (
    <>
      <SwipeFrame
        list={
          <main className="flex min-w-0 flex-1 flex-col">
            <TabScreen tab={tabs.tab.id} state={state} />
          </main>
        }
        tabBar={
          <VariantTabBar
            variant={variant}
            activeIndex={tabs.index}
            onSelect={tabs.go}
            reduced={reduced}
          />
        }
      />
      <Announcer text={tabs.announcement} />
    </>
  );
}

const ENTER = "duration-(--lm-duration-base) ease-standard";
const LEAVE = "duration-(--lm-duration-fast) ease-exit";

function VariantTabBar({
  variant,
  activeIndex,
  onSelect,
  reduced,
}: {
  variant: TabBarVariant;
  activeIndex: number;
  onSelect: (index: number) => void;
  reduced: boolean;
}) {
  const motion = cn(
    "motion-reduce:transition-none",
    reduced && "transition-none",
  );
  return (
    <nav
      aria-label={commonCopy.tabBarLabel}
      data-slot="bottom-tab-bar"
      data-variant={variant}
      className="sticky bottom-0 z-10 shrink-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom,0px)]"
    >
      <ul className="mx-auto grid h-(--lm-layout-tab-bar-height) max-w-(--lm-layout-max-width) grid-cols-4">
        {APP_TABS.map(({ id, label, Icon }, i) => {
          const on = i === activeIndex;
          return (
            <li key={id} className="relative flex min-w-0">
              {variant === "a" ? (
                <span
                  aria-hidden
                  data-slot="tab-indicator"
                  className={cn(
                    "pointer-events-none absolute top-0 left-1/2 h-[3px] w-2/5 -translate-x-1/2 rounded-b-full bg-primary transition-opacity",
                    on ? cn("opacity-100", ENTER) : cn("opacity-0", LEAVE),
                    motion,
                  )}
                />
              ) : null}
              <button
                type="button"
                aria-current={on ? "page" : undefined}
                onClick={() => onSelect(i)}
                className={cn(
                  "relative flex min-w-0 flex-1 flex-col items-center justify-center type-caption whitespace-nowrap transition-colors",
                  variant === "b" ? "gap-0.5" : "gap-1",
                  on ? ENTER : LEAVE,
                  motion,
                  labelClass(variant, on),
                  focusRing,
                  "focus-visible:-outline-offset-4",
                )}
              >
                {variant === "b" ? (
                  <span
                    aria-hidden
                    className={cn(
                      "flex h-[1.875rem] w-14 items-center justify-center rounded-full transition-colors",
                      on
                        ? cn("bg-primary/12 text-primary", ENTER)
                        : cn("bg-transparent", LEAVE),
                      motion,
                    )}
                  >
                    <Icon
                      aria-hidden
                      className="size-[1.375rem]"
                      strokeWidth={on ? 2 : 1.5}
                    />
                  </span>
                ) : (
                  <Icon
                    aria-hidden
                    className={cn(
                      "size-[1.375rem]",
                      variant === "c" && !on && "opacity-60",
                    )}
                    strokeWidth={on ? 2 : 1.5}
                  />
                )}
                <span className="flex flex-col items-center gap-[3px]">
                  {label}
                  {variant === "c" ? (
                    <span
                      aria-hidden
                      data-slot="tab-indicator"
                      className={cn(
                        "size-1 rounded-full bg-primary transition-opacity",
                        on ? cn("opacity-100", ENTER) : cn("opacity-0", LEAVE),
                        motion,
                      )}
                    />
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function labelClass(variant: TabBarVariant, on: boolean): string {
  if (!on) return "text-muted-foreground";
  switch (variant) {
    case "a":
    case "b":
      return "font-semibold text-foreground";
    case "c":
      return "font-semibold text-primary";
  }
}
