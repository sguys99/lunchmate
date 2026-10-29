"use client";
// 홈 시안 공용 카드 조각 (T3.1, T3.2): 숫자 3개, 배지, 카테고리 줄.
// 숫자 크기와 배치는 시안마다 다르게 고른다(안별 위계는 docs/design/g3-card-rules.md). 숫자는 항상 tabular-nums,
// 숫자와 단위는 priceBandParts처럼 포매터가 나눠 준 값을 쓴다(copy-guide 3장).
// 숫자 칸 구분은 문자 대신 1px 세로선(CLAUDE.md 9장).
// 추정 가격은 배지 줄이 아니라 가격 칸 라벨("1인") 옆 EstimateMark로 표시한다(T3.2).
// 배지 색은 비교 옵션(?badges=current|calm)을 따른다(lab-badges.tsx).
import type { PlaceBadge } from "@/components/badges/pick-badges";
import { designLabHomeCopy } from "@/copy/design-lab-home";
import { homeCopy } from "@/copy/home";
import type { MockPlace } from "@/features/design-lab/mock";
import { CATEGORY_INK } from "@/features/design-lab/system/b/parts";
import { categoryLabel } from "@/features/place/categories";
import { priceBandParts } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EstimateMark, LabPlaceBadges } from "./lab-badges";
import { useHomeLabOptions } from "./lab-options-context";

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

/** 숫자 + 단위 (기준선 맞춤). size lg 28px, md 18px */
export function NumberValue({
  cell,
  size,
  emphasis = true,
  className,
}: {
  cell: NumberCell;
  size: "lg" | "md";
  /** false면 숫자를 보조 색으로(C 비교표에서 최선이 아닌 값) */
  emphasis?: boolean;
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
      <span
        className={cn(
          size === "lg" ? "type-numeric-lg" : "type-numeric-md",
          emphasis ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {cell.value}
      </span>
      <span
        className={cn(
          "text-muted-foreground",
          size === "lg" ? "type-body-sm" : "type-caption",
        )}
      >
        {cell.unit}
      </span>
    </span>
  );
}

/** 라벨 위, 숫자 아래 3칸 격자 (DESIGN.md 5장 해부도). 칸 사이 1px 세로선 */
export function NumberGrid({
  place,
  size = "lg",
  className,
}: {
  place: MockPlace;
  size?: "lg" | "md";
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
            {c.estimate ? <CellEstimateMark /> : null}
          </dt>
          <dd
            className={cn(
              "flex items-end",
              size === "lg" ? "min-h-[1.84rem]" : "min-h-[1.35rem]",
            )}
          >
            <NumberValue cell={c} size={size} />
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

/**
 * 카드 배지 한 줄. 규칙은 공용 pickBadges(T3.2): 최대 2개, 기피 > 웨이팅 > 할인, 추정은 가격 옆이라 여기서 빠진다.
 * 색은 비교 옵션의 배지 체계를 따른다.
 */
export function CardBadges({
  place,
  max,
  className,
}: {
  place: MockPlace;
  max?: number;
  className?: string;
}) {
  const { badges } = useHomeLabOptions();
  return (
    <LabPlaceBadges
      badges={placeBadges(place)}
      palette={badges}
      max={max}
      className={className}
    />
  );
}

/** 가격 칸의 "추정" 표시. 비교 옵션의 배지 체계를 따른다 */
export function CellEstimateMark({ className }: { className?: string }) {
  const { badges } = useHomeLabOptions();
  return <EstimateMark palette={badges} className={className} />;
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
