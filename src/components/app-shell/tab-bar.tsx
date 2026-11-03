"use client";
// 하단 탭 (T2.6, DESIGN.md 5장 "하단 탭").
//
// - 높이 64(--lm-layout-tab-bar-height) + 하단 safe-area, 면 background, 위쪽 1px border.
// - 활성(D-38, T9.15): 아이콘과 라벨 primary, 아이콘 선 2px, 라벨 semibold, 라벨 아래 4px primary 점.
//   비활성: 라벨 muted-foreground, 아이콘은 muted-foreground 60%(라벨이 함께 있어 장식, 글자 대비 4.5:1 유지).
//   면 색으로 활성을 표시하지 않는다. 보조 기술에는 aria-current="page"로 알린다.
// - 아이콘은 Lucide 22px. 라벨은 caption. 칸 전체가 링크라 터치 영역은 칸 폭 x 64px(44px 이상).
// - 모션: 점은 fade 프리셋과 같은 값(나타날 때 base, standard / 사라질 때 fast, exit)으로 나타나고 사라지고, 글자색도 같은 값으로 바뀐다.
//   Motion 대신 CSS 전환으로 그린다(T2.22): 홈 첫 로드에서 Motion domAnimation(약 37KB gzip)을 빼기 위해서다.
//   점은 네 칸에 모두 두고 활성 칸만 불투명하게 한다. 첫 렌더는 그대로 보인다(전환은 값이 바뀔 때만).
//   축소 모드: OS 설정은 motion-reduce:, 앱 설정(MotionProvider preference="reduce")은 data-reduced로 즉시 바꾼다.
// - 데스크톱(화면 컨테이너 1024px 이상)에서도 같은 막대를 좌 리스트 칸 아래에 둔다(AppShell).
// - 앱 화면(dock, T9.10): 모바일은 position: fixed로 화면 아래에 고정하고, 같은 높이의 빈 자리를 문서 흐름에 남긴다.
//   sticky 막대는 iOS Safari에서 문서 끝 고무줄 튕김(rubber-band)과 주소 막대 접힘 때 내용과 함께 끌려 올라가 흔들렸다.
//   데스크톱은 좌 리스트 칸 아래 sticky 그대로다. 디자인 랩 미리보기(여러 개가 한 화면)는 dock 없이 sticky다.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type MouseEvent } from "react";
import { commonCopy } from "@/copy/common";
import { focusRing } from "@/components/ui/interaction";
import { useMotionPreference } from "@/lib/motion/preference";
import { cn } from "@/lib/utils";
import { rememberRoute } from "@/features/beta-feedback/last-route";
import { APP_TABS, matchTab, type AppTabId } from "./tabs";

export type TabBarViewProps = {
  /** 활성 탭. null이면 아무 탭도 활성이 아니다(탭 밖 화면) */
  activeId: AppTabId | null;
  /**
   * 디자인 랩 미리보기: 링크가 이동하지 않고 prefetch도 하지 않는다.
   * 실제 앱 화면에서는 쓰지 않는다.
   */
  preview?: boolean;
  /** nav 랜드마크 이름. 기본 commonCopy.tabBarLabel. 한 화면에 미리보기가 여럿일 때만 바꾼다 */
  label?: string;
  /** 앱 화면: 모바일에서 화면 아래 고정(fixed) + 문서 흐름에 같은 높이 빈 자리. 데스크톱은 sticky */
  dock?: boolean;
  className?: string;
};

const ENTER = "duration-(--lm-duration-base) ease-standard";
const LEAVE = "duration-(--lm-duration-fast) ease-exit";

function preventNavigation(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
}

/** 경로와 무관한 표시 전용 탭 바. 디자인 랩과 테스트가 활성 탭을 직접 준다. */
export function TabBarView({
  activeId,
  preview,
  label = commonCopy.tabBarLabel,
  dock,
  className,
}: TabBarViewProps) {
  const reduced = useMotionPreference() === "reduce";
  const nav = (
    <nav
      aria-label={label}
      data-slot="bottom-tab-bar"
      className={cn(
        "sticky bottom-0 z-10 shrink-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom,0px)]",
        dock && "fixed inset-x-0 desktop:sticky",
        className,
      )}
    >
      <ul className="mx-auto grid h-(--lm-layout-tab-bar-height) max-w-(--lm-layout-max-width) grid-cols-4">
        {APP_TABS.map(({ id, href, label, Icon }) => {
          const isActive = id === activeId;
          return (
            <li key={id} className="relative flex min-w-0">
              <Link
                href={href}
                prefetch={preview ? false : undefined}
                onClick={preview ? preventNavigation : undefined}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 type-caption whitespace-nowrap transition-colors motion-reduce:transition-none",
                  isActive
                    ? cn("font-semibold text-primary", ENTER)
                    : cn(
                        "text-muted-foreground hover:text-foreground active:text-foreground",
                        LEAVE,
                      ),
                  reduced && "transition-none",
                  focusRing,
                  "focus-visible:-outline-offset-4",
                )}
              >
                <Icon
                  aria-hidden
                  className={cn("size-[1.375rem]", !isActive && "opacity-60")}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                <span className="flex flex-col items-center gap-[3px]">
                  {label}
                  <span
                    aria-hidden
                    data-slot="tab-indicator"
                    data-active={isActive ? "" : undefined}
                    className={cn(
                      "size-1 rounded-full bg-primary transition-opacity motion-reduce:transition-none",
                      isActive
                        ? cn("opacity-100", ENTER)
                        : cn("opacity-0", LEAVE),
                      reduced && "transition-none",
                    )}
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
  if (!dock) return nav;
  return (
    <>
      {/* 고정 탭이 가리는 만큼 문서 끝에 남기는 빈 자리. 배경이 없어 지도 화면은 이 아래까지 그대로 보인다 */}
      <div
        aria-hidden
        data-slot="tab-bar-space"
        className="h-[calc(var(--lm-layout-tab-bar-height)+env(safe-area-inset-bottom,0px))] shrink-0 desktop:hidden"
      />
      {nav}
    </>
  );
}

/** 앱 화면용 하단 탭. 현재 경로로 활성 탭을 정한다. */
export function BottomTabBar({ className }: { className?: string }) {
  const pathname = usePathname();
  // 베타 의견의 "지금 보던 화면"(T9.4): 나 탭 직전 경로를 이 탭 메모리에만 적는다
  useEffect(() => rememberRoute(pathname), [pathname]);
  return (
    <TabBarView activeId={matchTab(pathname)} dock className={className} />
  );
}
