// 랜딩 데모 카드 (T3.4, B 데모와 C 둘째 장면). 세 장을 한 화면에 두는 압축형: 왼쪽 선화, 오른쪽 식당명, 숫자 3개, 이유 한 줄.
// 시안 B 조각(system/b/parts)은 Motion을 함께 가져와서 쓰지 않는다. 이 파일은 Motion 의존이 없다.
import { SkeletonLine } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { landingLabCopy } from "@/copy/design-lab-landing";
import type { MockPlace } from "@/features/design-lab/mock";
import { categoryLabel } from "@/features/place/categories";
import { CategoryIllustration } from "@/features/place/illustrations";
import { priceBandParts } from "@/lib/format";
import { cn } from "@/lib/utils";

const copy = landingLabCopy.b;

export function DemoCard({ place }: { place: MockPlace }) {
  const price = priceBandParts(place.priceKRW);
  const cells = [
    {
      key: "walk",
      label: copy.numbers.walk,
      num: String(place.walkMinutes),
      unit: copy.numbers.walkUnit,
    },
    {
      key: "price",
      label: copy.numbers.price,
      num: price.amount,
      unit: price.unit,
    },
    {
      key: "thumbs",
      label: copy.numbers.thumbs,
      num: place.thumbsUpRate === null ? null : String(place.thumbsUpRate),
      unit: copy.numbers.thumbsUnit,
    },
  ];
  return (
    <article
      aria-label={place.name}
      className="flex gap-4 rounded-card border border-border bg-card p-5 text-card-foreground @max-[23.75rem]/screen:gap-3 @max-[23.75rem]/screen:p-4"
    >
      <CategoryIllustration
        slug={place.category}
        size={56}
        className="-mt-1 -ml-1 shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="type-caption text-muted-foreground">
            {categoryLabel(place.category)}
          </span>
          <h3 className="truncate type-heading">{place.name}</h3>
        </div>
        {/* 만족 칸은 "후기 모으는 중"이 한 줄에 들어가는 폭(약 75px)을 360px에서도 남긴다(T3.5). 도보 칸은 두 자리 숫자면 충분하다 */}
        <dl className="grid grid-cols-[0.6fr_1.2fr_1.2fr] divide-x divide-border">
          {cells.map((c) => (
            <div
              key={c.key}
              className="flex min-w-0 flex-col gap-0.5 px-3 first:pl-0 last:pr-0 @max-[23.75rem]/screen:px-2"
            >
              <dt className="type-caption text-muted-foreground">{c.label}</dt>
              <dd className="flex min-h-[1.35rem] items-baseline gap-0.5 whitespace-nowrap">
                {c.num === null ? (
                  <span className="self-end type-caption leading-tight break-keep whitespace-normal text-muted-foreground">
                    {copy.numbers.thumbsEmpty}
                  </span>
                ) : (
                  <>
                    <span className="type-numeric-md">{c.num}</span>
                    <span className="type-caption text-muted-foreground">
                      {c.unit}
                    </span>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
        {/* 이유는 잘리지 않게 두 줄까지(360px에서 긴 이유가 말줄임되던 문제, T3.5) */}
        <p className="line-clamp-2 type-body-sm break-keep text-muted-foreground">
          {place.reason}
        </p>
      </div>
    </article>
  );
}

/**
 * 같은 자리의 스켈레톤. DemoCard와 같은 상자(안쪽 여백, 그림 56px, 줄 높이)를 써서 로딩 뒤 카드 높이가 출렁이지 않는다(T3.5).
 * 그림 자리 원, 카테고리와 식당명 줄, 숫자 3칸, 이유 한 줄.
 */
export function DemoCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex gap-4 rounded-card border border-border bg-card p-5 @max-[23.75rem]/screen:gap-3 @max-[23.75rem]/screen:p-4",
        className,
      )}
    >
      <div className="relative -mt-1 -ml-1 size-14 shrink-0">
        <Skeleton className="absolute inset-1.5 rounded-full" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <SkeletonLine type="caption" className="w-10" />
          <SkeletonLine type="heading" className="w-32" />
        </div>
        <div className="grid grid-cols-[0.6fr_1.2fr_1.2fr] divide-x divide-border">
          {["w-6", "w-14", "w-9"].map((w) => (
            <div
              key={w}
              className="flex min-w-0 flex-col gap-0.5 px-3 first:pl-0 last:pr-0 @max-[23.75rem]/screen:px-2"
            >
              <SkeletonLine type="caption" className="w-7" />
              <div className="flex min-h-[1.35rem] items-end">
                <Skeleton className={cn("mb-0.5 h-3.5 rounded-badge", w)} />
              </div>
            </div>
          ))}
        </div>
        <SkeletonLine type="body-sm" className="w-4/5" />
      </div>
    </div>
  );
}
