"use client";
// 하단 탭 (T2.6, DESIGN.md 5장 "하단 탭").
//
// - 높이 64(--lm-layout-tab-bar-height) + 하단 safe-area, 면 background, 위쪽 1px border.
// - 활성: 아이콘과 라벨 foreground + 탭 위쪽 가장자리 2px x 20px primary 막대. 비활성: muted-foreground.
//   면 색으로 활성을 표시하지 않는다. 보조 기술에는 aria-current="page"로 알린다.
// - 아이콘은 Lucide 1.5px 선, 22px. 라벨은 caption. 칸 전체가 링크라 터치 영역은 칸 폭 x 64px(44px 이상).
// - 모션: 활성 막대만 fade 프리셋으로 나타나고 사라진다(첫 렌더는 그대로 보임). 축소 모드면 즉시 바뀐다.
// - 데스크톱(화면 컨테이너 1024px 이상)에서도 같은 막대를 좌 리스트 칸 아래에 둔다(AppShell).
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";
import { commonCopy } from "@/copy/common";
import { focusRing } from "@/components/ui/interaction";
import { useMotionPreset } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { APP_TABS, matchTab, type AppTabId } from "./tabs";

export type TabBarViewProps = {
  /** 활성 탭. null이면 아무 탭도 활성이 아니다(탭 밖 화면) */
  activeId: AppTabId | null;
  /**
   * 디자인 랩 미리보기: 링크가 이동하지 않고 prefetch도 하지 않는다.
   * 실제 앱 화면에서는 쓰지 않는다.
   */
  preview?: boolean;
  className?: string;
};

function preventNavigation(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
}

/** 경로와 무관한 표시 전용 탭 바. 디자인 랩과 테스트가 활성 탭을 직접 준다. */
export function TabBarView({ activeId, preview, className }: TabBarViewProps) {
  const fade = useMotionPreset("fade");
  return (
    <nav
      aria-label={commonCopy.tabBarLabel}
      data-slot="bottom-tab-bar"
      className={cn(
        "sticky bottom-0 z-10 shrink-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom,0px)]",
        className,
      )}
    >
      <ul className="mx-auto grid h-(--lm-layout-tab-bar-height) max-w-(--lm-layout-max-width) grid-cols-4">
        {APP_TABS.map(({ id, href, label, Icon }) => {
          const isActive = id === activeId;
          return (
            <li key={id} className="relative flex min-w-0">
              <AnimatePresence initial={false}>
                {isActive ? (
                  <m.span
                    key="indicator"
                    aria-hidden
                    data-slot="tab-indicator"
                    className="pointer-events-none absolute top-0 left-1/2 h-0.5 w-5 -translate-x-1/2 bg-primary"
                    {...fade}
                  />
                ) : null}
              </AnimatePresence>
              <Link
                href={href}
                prefetch={preview ? false : undefined}
                onClick={preview ? preventNavigation : undefined}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 type-caption whitespace-nowrap transition-colors duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                  focusRing,
                  "focus-visible:-outline-offset-4",
                )}
              >
                <Icon
                  aria-hidden
                  className="size-[1.375rem]"
                  strokeWidth={1.5}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** 앱 화면용 하단 탭. 현재 경로로 활성 탭을 정한다. */
export function BottomTabBar({ className }: { className?: string }) {
  const pathname = usePathname();
  return <TabBarView activeId={matchTab(pathname)} className={className} />;
}
