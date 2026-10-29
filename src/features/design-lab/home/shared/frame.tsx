"use client";
// 홈 D1 틀 (T3.1, G3 D-05): 앱 셸 2단(ShellSplit) + 하단 탭 미리보기 + 지도 자리 + 4상태 메시지.
// 모바일: 리스트 칸만, 하단 탭은 sticky. 데스크톱(화면 컨테이너 1024px 이상): 좌 리스트(최대 460px) + 우 지도 자리.
import type { ReactNode } from "react";
import { TabBarView } from "@/components/app-shell";
import type { MockPick } from "@/features/design-lab/mock";
import {
  MapLines,
  MapPin,
  PIN_POSITIONS,
  StateBlock,
} from "@/features/design-lab/system/b/parts";
import {
  DesktopSplit,
  MapPlaceholder,
} from "@/features/design-lab/system/desktop-split";
import type { HomeContent } from "@/features/design-lab/system/states";
import { cn } from "@/lib/utils";

export function HomeFrame({
  children,
  map,
}: {
  children: ReactNode;
  map?: ReactNode;
}) {
  return (
    <DesktopSplit
      list={children}
      map={map ?? <HomeMap />}
      tabBar={<TabBarView activeId="today" preview />}
    />
  );
}

/** 리스트 칸 본문. 모바일 최대 480 + 좌우 24, 데스크톱 최대 460 + 좌우 40 (PageColumn과 같은 폭) */
export function HomeColumn({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-5 pb-8 desktop:max-w-(--lm-layout-desktop-list-max-width) desktop:px-10 desktop:pt-12 desktop:pb-12",
        className,
      )}
    >
      {children}
    </main>
  );
}

/** 데스크톱 지도 자리: 조용한 길 선 + 추천 핀. active 핀만 올리브 */
export function HomeMap({
  picks,
  active = -1,
}: {
  picks?: MockPick;
  active?: number;
}) {
  return (
    <MapPlaceholder className="border-l border-border desktop:sticky desktop:top-0 desktop:max-h-svh">
      <MapLines />
      {picks?.map((p, i) => (
        <MapPin
          key={p.id}
          label={p.name}
          active={i === active}
          position={PIN_POSITIONS[i] ?? PIN_POSITIONS[0]}
        />
      ))}
    </MapPlaceholder>
  );
}

/** 빈 상태, 오류, 오프라인 (공통 컴포넌트 T2.7). 빈 상태만 주 버튼을 쓴다(이 화면에 카드 주 버튼이 없다) */
export function HomeStateMessage({
  content,
  className,
}: {
  content: Extract<HomeContent, { kind: "empty" | "error" | "offline" }>;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-card border border-border bg-card px-7 pt-6 pb-8 @max-[23.75rem]/screen:px-5",
        className,
      )}
    >
      <StateBlock
        kind={content.kind}
        title={content.title}
        body={content.body}
        action={content.action}
        category="gukbap"
      />
    </section>
  );
}
