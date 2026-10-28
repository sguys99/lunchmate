// 데스크톱 2단 공용 배치 (CLAUDE.md 6.2): 화면 컨테이너 1024px 이상에서 좌 리스트 + 우 지도.
// 열 비율은 시안 토큰 --lm-layout-desktop-columns. 모바일에서는 리스트만 보이고 지도 자리는 숨긴다.
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
      <div className="hidden min-h-0 desktop:flex desktop:flex-col">
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
