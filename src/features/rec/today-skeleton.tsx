// 오늘(홈) 첫 로드 스켈레톤 (T5.17, AC-REC-4). 서버가 저장 값을 읽는 동안 같은 자리, 같은 높이로 보인다.
// 머리(위치 칩, 끼니 토글, 날짜, 제목) + 큰 카드 + 대안 두 장 + 하단 행동 줄. 스피너는 쓰지 않는다.
import { SkeletonLine } from "@/components/states/loading";
import { Skeleton } from "@/components/ui/skeleton";
import { homeCopy } from "@/copy/home";
import { ActionBarSkeleton, TodayPicksSkeleton } from "./today-cards";

export function TodaySkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-5 desktop:max-w-(--lm-layout-desktop-list-max-width) desktop:px-10 desktop:pt-8">
      <div aria-hidden className="flex flex-col gap-6 desktop:gap-4">
        <div className="flex h-11 items-center justify-between gap-3">
          <Skeleton className="h-10 w-28 rounded-chip" />
          <div className="flex gap-3 pr-2">
            <SkeletonLine type="label" className="w-7" />
            <SkeletonLine type="label" className="w-7" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <SkeletonLine type="caption" className="w-36" />
          <SkeletonLine type="title" className="w-36" />
        </div>
      </div>
      <TodayPicksSkeleton
        label={homeCopy.states.loading.label}
        className="mt-5 desktop:mt-4"
      />
      <ActionBarSkeleton />
    </div>
  );
}
