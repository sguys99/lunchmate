// 식당 상세 로딩 스켈레톤. place-detail.tsx 본문(Menu, 제보, 후기 의존)과 떼어 둔다(T8.10).
// 지도 탭은 상세 본문을 지연 로딩하고, 받는 동안 이 스켈레톤만 첫 로드에 싣는다(src/features/map/place-detail-lazy.tsx).
import { LoadingRegion, SkeletonLine } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { placeCopy } from "@/copy/place";
import { cn } from "@/lib/utils";

const copy = placeCopy;

/** 로딩: 요약과 숫자 3칸, 하단 줄 모양 스켈레톤 */
export function PlaceDetailSkeleton({ className }: { className?: string }) {
  return (
    <LoadingRegion
      label={copy.states.loading}
      className={cn("flex min-h-full flex-col", className)}
    >
      <div className="flex flex-1 flex-col pt-2 pb-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-14 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col">
            <SkeletonLine type="caption" className="w-10" />
            <SkeletonLine type="title" className="w-40" />
          </div>
        </div>
        <SkeletonLine type="body" className="mt-4 w-56" />
        <div className="mt-5 grid grid-cols-[0.8fr_1.3fr_0.9fr] divide-x divide-border">
          {["w-6", "w-20", "w-9"].map((w) => (
            <div
              key={w}
              className="flex flex-col gap-1.5 px-4 first:pl-0 last:pr-0"
            >
              <SkeletonLine type="caption" className="w-7" />
              <Skeleton className={cn("mt-1 h-3.5 rounded-badge", w)} />
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-col border-t border-border">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex h-14 items-center justify-between border-b border-border"
            >
              <SkeletonLine type="label" className="w-12" />
              <SkeletonLine type="caption" className="w-24" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-auto flex gap-2 border-t border-border py-3">
        <Skeleton className="h-12 flex-1 rounded-button" />
        <Skeleton className="size-12 rounded-button" />
        <Skeleton className="size-12 rounded-button" />
      </div>
    </LoadingRegion>
  );
}
