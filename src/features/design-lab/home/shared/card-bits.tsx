"use client";
// 홈 D1 카드 조각 (T3.1, T3.2, G3 D-05): 숫자 3개, 배지, 카테고리 줄. 큰 카드, 대안 카드, 결과 카드가 함께 쓴다.
// 숫자는 numeric-md 18px(D 위계: 이름과 이유가 먼저, 숫자는 확인용, docs/design/g3-card-rules.md 1절), 항상 tabular-nums.
// 숫자와 단위는 priceBandParts처럼 포매터가 나눠 준 값을 쓴다(copy-guide 3장). 숫자 칸 구분은 문자 대신 1px 세로선(CLAUDE.md 9장).
// 추정 가격은 배지 줄이 아니라 가격 칸 라벨("1인") 옆 EstimateMark로 표시한다(T3.2). 배지 색은 공용 calm 체계.
import { EstimateMark } from "@/components/badges/estimate-mark";
import type { PlaceBadge } from "@/components/badges/pick-badges";
import { PlaceBadges } from "@/components/badges/place-badges";
import { designLabHomeCopy } from "@/copy/design-lab-home";
import { homeCopy } from "@/copy/home";
import type { MockPlace } from "@/features/design-lab/mock";
import { CATEGORY_INK } from "@/features/design-lab/system/b/parts";
import { categoryLabel } from "@/features/place/categories";
import { priceBandParts } from "@/lib/format";
import { SkeletonLine } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const copy = designLabHomeCopy.screen.numbers;

/* ---------- 숫자 ---------- */

export type NumberCell = {
  key: "walk" | "price" | "thumbs";
  label: string;
  /** null이면 콜드 스타트(후기 3건 미만) */
  value: string | null;
  unit: string;
  /** 가격 칸만: 제보가 없어 카테고리 추정값이다(PLACE-02) */
  estimate?: boolean;
};

/** 도보 분, 1인 가격대, 만족 비율 세 칸. 가격은 "9천" + "원대"처럼 숫자와 단위를 나눈다 */
export function numberCells(place: MockPlace): NumberCell[] {
  const price = priceBandParts(place.priceKRW);
  return [
    {
      key: "walk",
      label: copy.walk,
      value: String(place.walkMinutes),
      unit: copy.walkUnit,
    },
    {
      key: "price",
      label: copy.price,
      // "9" + "천 원대" → "9천" + "원대": 천, 만은 숫자에 붙여 읽는다
      value: `${price.amount}${price.unit.slice(0, 1)}`,
      unit: price.unit.slice(1).trim(),
      estimate: place.priceSource === "estimate",
    },
    {
      key: "thumbs",
      label: copy.thumbs,
      value: place.thumbsUpRate === null ? null : String(place.thumbsUpRate),
      unit: copy.thumbsUnit,
    },
  ];
}

/** 숫자 + 단위 (기준선 맞춤). 숫자 18px(numeric-md) + 단위 13px(caption) */
export function NumberValue({
  cell,
  className,
}: {
  cell: NumberCell;
  className?: string;
}) {
  if (cell.value === null) {
    return (
      <span
        className={cn(
          "type-caption whitespace-nowrap text-muted-foreground",
          className,
        )}
      >
        {homeCopy.thumbsUpEmpty}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-0.5 whitespace-nowrap",
        className,
      )}
    >
      <span className="type-numeric-md text-foreground">{cell.value}</span>
      <span className="type-caption text-muted-foreground">{cell.unit}</span>
    </span>
  );
}

/** 라벨 위, 숫자 아래 3칸 격자 (DESIGN.md 5장). 칸 폭 0.8fr 1.3fr 0.9fr, 칸 사이 1px 세로선 */
export function NumberGrid({
  place,
  className,
}: {
  place: MockPlace;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-[0.8fr_1.3fr_0.9fr] divide-x divide-border",
        className,
      )}
    >
      {numberCells(place).map((c) => (
        <div
          key={c.key}
          className="flex min-w-0 flex-col gap-1.5 px-4 first:pl-0 last:pr-0 @max-[23.75rem]/screen:px-3"
        >
          <dt className="flex items-baseline gap-1.5 type-caption text-muted-foreground">
            {c.label}
            {c.estimate ? <EstimateMark /> : null}
          </dt>
          <dd className="flex min-h-[1.35rem] items-end">
            <NumberValue cell={c} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------- 배지 ---------- */

/** 목업 상태 배지 → 공통 배지 데이터. 웨이팅은 최근 제보 단계와 시각을 붙인다 */
export function placeBadges(place: MockPlace): PlaceBadge[] {
  return place.statusBadges.map((kind): PlaceBadge => {
    if (kind === "waiting") {
      return {
        kind: "waiting",
        level: place.waiting?.level ?? "short",
        minutesAgo: place.waiting?.minutesAgo,
      };
    }
    return { kind };
  });
}

/** 카드 배지 한 줄. 공용 PlaceBadges(calm): 최대 2개, 기피 > 웨이팅 > 할인 > 제보, 추정은 가격 옆이라 여기서 빠진다 */
export function CardBadges({
  place,
  className,
}: {
  place: MockPlace;
  className?: string;
}) {
  return <PlaceBadges badges={placeBadges(place)} className={className} />;
}

/* ---------- 카테고리 ---------- */

export function CategoryCaption({
  place,
  className,
}: {
  place: MockPlace;
  className?: string;
}) {
  return (
    <span
      className={cn("type-caption", CATEGORY_INK[place.category], className)}
    >
      {categoryLabel(place.category)}
    </span>
  );
}

/* ---------- 스켈레톤 (T3.5) ---------- */

const NUMBER_SKELETON_WIDTHS = ["w-6", "w-14", "w-9"] as const;

/**
 * NumberGrid 자리. 같은 격자, 같은 줄 높이(라벨 caption + 숫자 min-h)라 로딩 뒤 출렁이지 않는다.
 * 숫자 막대는 type-numeric-md 줄 상자 안에 둔다.
 */
export function NumberGridSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "grid grid-cols-[0.8fr_1.3fr_0.9fr] divide-x divide-border",
        className,
      )}
    >
      {NUMBER_SKELETON_WIDTHS.map((w) => (
        <div
          key={w}
          className="flex min-w-0 flex-col gap-1.5 px-4 first:pl-0 last:pr-0 @max-[23.75rem]/screen:px-3"
        >
          <SkeletonLine type="caption" className="w-7" />
          <div className="flex min-h-[1.35rem] items-end">
            <Skeleton className={cn("mb-0.5 h-3.5 rounded-badge", w)} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 배지 한 줄 자리(배지 높이 24px). 실제 배지가 없을 카드도 있지만 오늘 덱의 첫 카드는 배지가 있다 */
export function BadgeRowSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex gap-1.5", className)}>
      <Skeleton className="h-6 w-36 rounded-badge" />
      <Skeleton className="h-6 w-11 rounded-badge" />
    </div>
  );
}
