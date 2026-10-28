// 데스크톱 2단 배치 (CLAUDE.md 6.2). 틀은 앱 셸의 ShellSplit(T2.6)을 그대로 쓰고,
// 여기에는 디자인 랩 전용 지도 자리(핀 장식을 올리는 면)만 남긴다.
import type { ReactNode } from "react";
import { designLabCopy } from "@/copy/design-lab";
import { cn } from "@/lib/utils";

export { ShellSplit as DesktopSplit } from "@/components/app-shell";

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
