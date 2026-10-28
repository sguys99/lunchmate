// PoC용 추천 카드 (T2.13). 확정 디자인(시안 B "Quiet Stone") 조각을 그대로 쓴다. 카드 배치는 G3에서 정한다.
import type { MockPlace } from "@/features/design-lab/mock";
import {
  Badges,
  CATEGORY_INK,
  NumberRow,
  PlaceHeading,
} from "@/features/design-lab/system/b/parts";
import { categoryLabel } from "@/features/place/categories";
import { CategoryIllustration } from "@/features/place/illustrations";
import { cn } from "@/lib/utils";

export function PocCard({
  place,
  className,
  compact = false,
}: {
  place: MockPlace;
  className?: string;
  /** 셔플 목록처럼 세 장을 한 화면에 둘 때: 일러스트 작게, 숫자 중간 크기 */
  compact?: boolean;
}) {
  return (
    <article
      aria-label={place.name}
      className={cn(
        "flex flex-col rounded-card border border-border bg-card text-card-foreground",
        compact ? "gap-4 p-5" : "gap-6 p-7 @max-[23.75rem]/screen:p-5",
        className,
      )}
    >
      {compact ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span className={cn("type-caption", CATEGORY_INK[place.category])}>
              {categoryLabel(place.category)}
            </span>
            <h3 className="truncate type-heading">{place.name}</h3>
          </div>
          <CategoryIllustration
            slug={place.category}
            size={56}
            className="-my-1 shrink-0"
          />
        </div>
      ) : (
        <PlaceHeading
          place={place}
          as="h3"
          categoryLabel={categoryLabel(place.category)}
        >
          <Badges place={place} />
        </PlaceHeading>
      )}
      <NumberRow place={place} size={compact ? "md" : "lg"} />
      <p className="truncate type-body-sm text-muted-foreground">
        {place.reason}
      </p>
    </article>
  );
}
