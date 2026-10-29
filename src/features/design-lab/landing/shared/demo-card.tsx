// 랜딩 데모 카드 (T3.4, B 데모와 C 둘째 장면). 세 장을 한 화면에 두는 압축형: 왼쪽 선화, 오른쪽 식당명, 숫자 3개, 이유 한 줄.
// 시안 B 조각(system/b/parts)은 Motion을 함께 가져와서 쓰지 않는다. 이 파일은 Motion 의존이 없다.
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
        <dl className="grid grid-cols-[0.8fr_1.4fr_1fr] divide-x divide-border">
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
        <p className="truncate type-body-sm text-muted-foreground">
          {place.reason}
        </p>
      </div>
    </article>
  );
}

/** 같은 자리의 스켈레톤. 그림 자리 원, 식당명 막대, 숫자 3막대, 이유 막대. */
export function DemoCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex gap-4 rounded-card border border-border bg-card p-5",
        className,
      )}
    >
      <Skeleton className="size-12 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 flex-[1.4]" />
          <Skeleton className="h-8 flex-1" />
        </div>
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
}
