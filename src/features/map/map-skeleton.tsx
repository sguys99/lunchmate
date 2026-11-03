// 지도 탭 첫 스켈레톤 (T5.26). 서버가 저장 값을 읽는 동안 지도 자리와 시트 머리, 목록 자리를 같은 위치에 그린다.
import { ListSkeleton, LoadingRegion } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { mapCopy } from "@/copy/map";

export function MapScreenSkeleton() {
  return (
    <LoadingRegion
      label={mapCopy.states.loading}
      className="relative flex h-[calc(100dvh-var(--lm-layout-tab-bar-height)-env(safe-area-inset-bottom,0px)-env(safe-area-inset-top,0px))] min-h-[30rem] flex-col overflow-hidden desktop:h-auto desktop:flex-1"
    >
      <Skeleton className="absolute inset-0 rounded-none desktop:hidden" />
      <div className="absolute inset-x-0 bottom-0 flex h-[48%] flex-col gap-4 rounded-t-sheet bg-popover px-(--lm-layout-gutter) pt-10 shadow-sheet desktop:static desktop:h-auto desktop:rounded-none desktop:bg-background desktop:px-10 desktop:pt-14 desktop:shadow-none">
        <Skeleton className="h-5 w-36 rounded-full" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20 rounded-chip" />
          <Skeleton className="h-10 w-24 rounded-chip" />
          <Skeleton className="h-10 w-20 rounded-chip" />
        </div>
        <ListSkeleton bare rows={3} />
      </div>
    </LoadingRegion>
  );
}
