// 오늘(홈) 카드 조각 (T5.17, G3 D1, DESIGN.md 5장): 숫자 3칸, 배지, 카테고리 줄, 스켈레톤.
// 큰 카드, 대안 카드, 그냥 골라줘 결과 카드가 함께 쓴다. 디자인 랩 D1(card-bits.tsx)을 실제 데이터(TodayCard)로 옮겼다.
// 숫자는 numeric-md 18px(이름과 이유가 먼저, 숫자는 확인용, g3-card-rules.md 1절), tabular-nums.
// 숫자 칸 구분은 문자 대신 1px 세로선(CLAUDE.md 9장). 추정 가격은 가격 칸 라벨 옆 EstimateMark.
import { EstimateMark } from "@/components/badges/estimate-mark";
import { SkeletonLine } from "@/components/states/loading";
import { Skeleton } from "@/components/ui/skeleton";
import { homeCopy } from "@/copy/home";
import {
  categoryLabel,
  type CategorySlug,
} from "@/features/place/categories";
import { lazy, Suspense } from "react";
import type { CategoryIllustrationProps } from "@/features/place/illustrations";
import { cn } from "@/lib/utils";
import type { CardNumber, TodayCard } from "./card-model";

const copy = homeCopy.today.numbers;

/** 카테고리 글자 색(DESIGN.md 6장 cat-<slug>-ink) */
export const CATEGORY_INK: Record<CategorySlug, string> = {
  hansik: "text-cat-hansik-ink",
  jungsik: "text-cat-jungsik-ink",
  ilsik: "text-cat-ilsik-ink",
  yangsik: "text-cat-yangsik-ink",
  bunsik: "text-cat-bunsik-ink",
  gukbap: "text-cat-gukbap-ink",
  gogi: "text-cat-gogi-ink",
  asian: "text-cat-asian-ink",
  fastfood: "text-cat-fastfood-ink",
  salad: "text-cat-salad-ink",
  cafe: "text-cat-cafe-ink",
  pub: "text-cat-pub-ink",
};

/** 숫자 + 단위(기준선 맞춤). 숫자 18px(numeric-md) + 단위 13px(caption). null이면 "후기 모으는 중" */
export function NumberValue({
  cell,
  className,
}: {
  cell: CardNumber;
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

/** 라벨 위, 숫자 아래 3칸 격자. 칸 폭 0.8fr 1.3fr 0.9fr, 칸 사이 1px 세로선 */
export function NumberGrid({
  card,
  className,
}: {
  card: TodayCard;
  className?: string;
}) {
  const cells = [
    { key: "walk", label: copy.walk, cell: card.walk, estimate: false },
    {
      key: "price",
      label: copy.price,
      cell: card.price,
      estimate: card.price.estimate,
    },
    { key: "thumbs", label: copy.thumbs, cell: card.thumbs, estimate: false },
  ] as const;
  return (
    <dl
      className={cn(
        "grid grid-cols-[0.8fr_1.3fr_0.9fr] divide-x divide-border",
        className,
      )}
    >
      {cells.map((c) => (
        <div
          key={c.key}
          className="flex min-w-0 flex-col gap-1.5 px-4 first:pl-0 last:pr-0 @max-[23.75rem]/screen:px-3"
        >
          <dt className="flex items-baseline gap-1.5 type-caption text-muted-foreground">
            {c.label}
            {c.estimate ? <EstimateMark /> : null}
          </dt>
          <dd className="flex min-h-[1.35rem] items-end">
            <NumberValue cell={c.cell} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** 배지 모듈(아이콘, 문구)은 배지가 있는 카드에서만 받는다. 콜드 스타트 카드에는 배지가 없다(홈 첫 로드 예산) */
const PlaceBadges = lazy(() =>
  import("@/components/badges/place-badges").then((m) => ({
    default: m.PlaceBadges,
  })),
);

/** 카드 배지 한 줄. 공용 PlaceBadges(calm, 최대 2개, 툴팁 없음). 받는 동안은 배지 높이(24)만 지킨다 */
export function CardBadges({
  card,
  className,
}: {
  card: TodayCard;
  className?: string;
}) {
  if (card.badges.length === 0) return null;
  return (
    <Suspense fallback={<span aria-hidden className={cn("h-6", className)} />}>
      <PlaceBadges badges={card.badges} className={className} />
    </Suspense>
  );
}

export function CategoryCaption({
  category,
  className,
}: {
  category: CategorySlug;
  className?: string;
}) {
  return (
    <span className={cn("type-caption", CATEGORY_INK[category], className)}>
      {categoryLabel(category)}
    </span>
  );
}

/* ---------- 일러스트 ---------- */

const loadArt = () => import("@/features/place/illustrations");
/** 화면이 마운트되면 바로 받기 시작한다(카카오 응답보다 먼저 끝나 카드와 함께 그려진다) */
export const preloadArt = () => void loadArt();
const LazyArt = lazy(() =>
  loadArt().then((m) => ({ default: m.CategoryIllustration })),
);

/** 카테고리 일러스트(지연 로딩). 받는 동안은 같은 크기의 빈 자리라 카드가 출렁이지 않는다 */
export function CardArt(props: CategoryIllustrationProps) {
  const size = props.size ?? 96;
  return (
    <Suspense
      fallback={
        <svg
          aria-hidden
          width={size}
          height={size}
          className={props.className}
        />
      }
    >
      <LazyArt {...props} />
    </Suspense>
  );
}

/* ---------- 스켈레톤 ---------- */

const NUMBER_SKELETON_WIDTHS = ["w-6", "w-14", "w-9"] as const;

/** NumberGrid 자리. 같은 격자, 같은 줄 높이라 로딩 뒤 출렁이지 않는다 */
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

/** 일러스트 자리의 원. 그림의 옅은 원(중심 40,42 반지름 25 / 96)과 같은 비율 */
export function ArtCircle({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative", className)}>
      <Skeleton className="absolute top-[17.7%] left-[15.6%] size-[52.1%] rounded-full" />
    </div>
  );
}
