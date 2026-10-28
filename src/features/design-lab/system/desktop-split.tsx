// 데스크톱 2단 공용 배치 (CLAUDE.md 6.2): 화면 컨테이너 1024px 이상에서 좌 리스트 + 우 지도.
// 열 비율은 시안 토큰 --lm-layout-desktop-columns. 모바일에서는 리스트만 보이고 지도 자리는 숨긴다.
// 지도 칸은 리스트와 같이 스크롤되지 않게 sticky top-0 + 화면 높이(100dvh)로 고정한다.
// self-start라야 칸이 리스트 높이로 늘어나지 않고 sticky가 동작한다. 스크롤 컨테이너가 문서든
// 스위처 상자(DesignScope overflow-y-auto)든 가장 가까운 스크롤 조상 기준으로 붙는다.
import type { ReactNode } from "react";
import { designLabCopy } from "@/copy/design-lab";
import { cn } from "@/lib/utils";

export function DesktopSplit({
  list,
  map,
  className,
}: {
  list: ReactNode;
  /** 생략하면 MapPlaceholder */
  map?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col desktop:grid desktop:grid-cols-(--lm-layout-desktop-columns)",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">{list}</div>
      <div className="hidden min-h-0 desktop:sticky desktop:top-0 desktop:flex desktop:h-dvh desktop:flex-col desktop:self-start">
        {map ?? <MapPlaceholder />}
      </div>
    </div>
  );
}

/** 실제 지도 없이 토큰 색만 쓴 조용한 면. 시안이 className으로 덮어쓸 수 있다. */
export function MapPlaceholder({
  className,
  children,
}: {
  className?: string;
  /** 핀 같은 시안별 장식을 올릴 자리 */
  children?: ReactNode;
}) {
  return (
    <div
      role="img"
      aria-label={designLabCopy.mapPlaceholder}
      className={cn("relative min-h-64 flex-1 bg-muted", className)}
    >
      {children}
    </div>
  );
}
