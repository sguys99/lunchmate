// 앱 셸 (T2.6, DESIGN.md 4장 "레이아웃", CLAUDE.md 6.2).
//
// 모바일: 콘텐츠(세로 스크롤은 문서) + 아래 붙는 하단 탭.
// 데스크톱(화면 컨테이너 1024px 이상, desktop: 변형): 좌 리스트 2fr(내용 최대 460px) + 우 지도 3fr,
//   사이는 1px 선 하나. 하단 탭은 좌 리스트 칸 아래에 붙는다. 지도 칸을 가리지 않고, 모바일과 같은
//   위치 감각(엄지 쪽 아래)을 유지하기 위해서다. 지도 칸은 sticky + 화면 높이라 리스트만 스크롤된다.
// 360px: 좌우 여백 24px(--lm-layout-gutter)를 유지하고 탭 4칸은 같은 폭이라 줄바꿈 없이 들어간다.
//
// safe-area: (app) 레이아웃이 viewport-fit=cover를 켠다. 위와 좌우는 이 셸이, 아래는 하단 탭이 env()로 비운다.
// desktop: 변형은 뷰포트가 아니라 @container/screen 기준이다(globals.css). AppShell 루트가 그 컨테이너다.
import type { ReactNode } from "react";
import { shellCopy } from "@/copy/shell";
import { cn } from "@/lib/utils";

/**
 * 좌 리스트 + 우 지도 2단 틀. AppShell과 디자인 랩 화면이 함께 쓴다.
 * 모바일에서는 리스트 칸만 보이고 지도 칸은 숨긴다. 가장 가까운 @container/screen 조상이 있어야 한다.
 */
export function ShellSplit({
  list,
  map,
  tabBar,
  className,
}: {
  list: ReactNode;
  /** 생략하면 MapPane(빈 지도 자리) */
  map?: ReactNode;
  /** 리스트 칸 맨 아래에 붙는 하단 탭 */
  tabBar?: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="shell-split"
      className={cn(
        "flex min-h-0 flex-1 flex-col desktop:grid desktop:grid-cols-(--lm-layout-desktop-columns)",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col desktop:min-h-dvh">
        <div className="flex min-w-0 flex-1 flex-col">{list}</div>
        {tabBar}
      </div>
      {/* self-start라야 칸이 리스트 높이로 늘어나지 않고 sticky가 동작한다.
          aside 랜드마크: 모든 내용이 랜드마크 안에 있어야 스크린 리더 사용자가 칸 단위로 오갈 수 있다(axe region, T2.17) */}
      <aside
        aria-label={shellCopy.mapRegion}
        className="hidden min-h-0 desktop:sticky desktop:top-0 desktop:flex desktop:h-dvh desktop:flex-col desktop:self-start"
      >
        {map ?? <MapPane />}
      </aside>
    </div>
  );
}

/** 실제 지도(T5)가 들어오기 전 데스크톱 오른쪽 자리. 토큰 면 한 장과 왼쪽 1px 선. */
export function MapPane({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      role="img"
      aria-label={shellCopy.mapPane}
      data-slot="map-pane"
      className={cn(
        "relative min-h-64 flex-1 border-l border-border bg-muted",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * 앱 화면 전체 틀. (app) 레이아웃이 한 번 마운트한다.
 * children은 탭 화면(페이지)이고 <main>으로 감싼다. 페이지 안 여백과 폭은 PageColumn이 맡는다.
 */
export function AppShell({
  children,
  map,
  tabBar,
}: {
  children: ReactNode;
  map?: ReactNode;
  tabBar: ReactNode;
}) {
  return (
    <div
      data-slot="app-shell"
      className="@container/screen flex min-h-dvh flex-1 flex-col bg-background pt-[env(safe-area-inset-top,0px)] pr-[env(safe-area-inset-right,0px)] pl-[env(safe-area-inset-left,0px)] text-foreground"
    >
      <ShellSplit
        list={<main className="flex min-w-0 flex-1 flex-col">{children}</main>}
        map={map}
        tabBar={tabBar}
      />
    </div>
  );
}

/**
 * 탭 화면 본문 칼럼. 모바일 최대 480px + 좌우 24px, 데스크톱 최대 460px + 좌우 40px.
 * 시안 B 홈 칼럼과 같은 여백(위 40, 데스크톱 위 56)이다.
 */
export function PageColumn({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-10 pb-6 desktop:max-w-(--lm-layout-desktop-list-max-width) desktop:px-10 desktop:pt-14 desktop:pb-14",
        className,
      )}
    >
      {children}
    </div>
  );
}
