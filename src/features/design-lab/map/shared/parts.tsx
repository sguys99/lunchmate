"use client";
// 지도 시안 공용 조각 (T5.1): 목록 행, 반쯤 열림 요약, 끝까지 열림 상세 자리, 회사 핀, 지도 위 버튼, 필터 칩, 상태 블록, 화면 틀.
// 반쯤 열림 요약의 세부(배지, 가격 표현, 버튼 배치)는 식당 상세 시안(T5.2)이 정한다. 여기서는 자리와 위계만 맞춘다.
import { Building2, LocateFixed, RotateCw } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { TabBarView } from "@/components/app-shell";
import { buttonClass } from "@/components/ui/button-classes";
import { Chip } from "@/components/ui/chip";
import { focusRing, hitArea44 } from "@/components/ui/interaction";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EmptyState,
  ErrorState,
  ListSkeleton,
  LoadingRegion,
  OfflineState,
  SkeletonLine,
} from "@/components/states";
import { mapLabCopy } from "@/copy/design-lab-map";
import { CATEGORY_INK } from "@/features/design-lab/system/b/parts";
import { categoryLabel, type CategorySlug } from "@/features/place/categories";
import { CategoryIllustration } from "@/features/place/illustrations";
import { priceBandParts } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MapFilters, MapPlace } from "./places";

const copy = mapLabCopy;

/* ---------- 화면 폭 ---------- */

/** 화면 크기와 데스크톱 여부. 데스크톱은 화면 컨테이너(@container/screen) 폭 1024px 이상(desktop: 변형과 같은 기준) */
export function useScreenSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry)
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return { ...size, desktop: size.width >= 1024 };
}

/** 하단 탭 높이(--lm-layout-tab-bar-height). 지도 칸 높이 = 화면 높이 - 탭 */
export const TAB_BAR_PX = 64;

/* ---------- 화면 틀 ---------- */

/**
 * 모바일: 지도 칸(지도 + 겹치는 시트) + 하단 탭. 데스크톱: 좌 460 칸(시트가 리스트가 됨) + 우 지도, 하단 탭은 좌 칸 아래.
 * stage는 display: contents라 데스크톱에서 지도와 시트가 바깥 격자의 칸이 된다.
 */
export function MapScreenFrame({
  rootRef,
  map,
  sheet,
  className,
}: {
  rootRef: RefObject<HTMLElement | null>;
  map: ReactNode;
  sheet: ReactNode;
  className?: string;
}) {
  return (
    <main
      ref={rootRef}
      className={cn(
        "relative flex h-dvh min-h-[36rem] flex-col overflow-hidden",
        "desktop:grid desktop:grid-cols-[minmax(0,28.75rem)_minmax(0,1fr)] desktop:grid-rows-[minmax(0,1fr)_auto]",
        className,
      )}
    >
      <h1 className="sr-only">{copy.screenTitle}</h1>
      <div className="relative min-h-0 flex-1 desktop:contents">
        <div className="absolute inset-0 desktop:relative desktop:col-start-2 desktop:row-span-2 desktop:row-start-1 desktop:border-l desktop:border-border">
          {map}
        </div>
        <div className="contents desktop:col-start-1 desktop:row-start-1 desktop:block desktop:min-h-0">
          {sheet}
        </div>
      </div>
      <div className="relative z-30 desktop:col-start-1 desktop:row-start-2">
        <TabBarView activeId="map" preview />
      </div>
    </main>
  );
}

/* ---------- 숫자 ---------- */

function priceText(place: MapPlace) {
  const { amount, unit } = priceBandParts(place.priceKRW);
  return { amount, unit };
}

/** 한 줄 숫자: 도보 N분 | 9천 원대 | 👍 87%. 문자 구분자 없이 얇은 세로선으로 나눈다 (CLAUDE.md 9장) */
export function NumbersInline({
  place,
  className,
}: {
  place: MapPlace;
  className?: string;
}) {
  const price = priceText(place);
  return (
    <p
      className={cn(
        "flex items-center gap-2.5 type-caption whitespace-nowrap text-muted-foreground tabular-nums",
        className,
      )}
    >
      <span>
        {copy.numbers.walk} {place.walkMinutes}
        {copy.numbers.walkUnit}
      </span>
      <span aria-hidden className="h-3 w-px bg-border" />
      <span>
        {price.amount}
        {price.unit}
        {place.priceSource === "estimate" ? (
          <span className="ml-1 text-warning-foreground">
            {copy.numbers.estimate}
          </span>
        ) : null}
      </span>
      {place.thumbsUpRate !== null ? (
        <>
          <span aria-hidden className="h-3 w-px bg-border" />
          <span>
            {copy.numbers.thumbs} {place.thumbsUpRate}
            {copy.numbers.thumbsUnit}
          </span>
        </>
      ) : null}
    </p>
  );
}

/** 숫자 3칸(도보, 가격, 👍). 홈 카드 숫자 줄과 같은 격자 0.8fr 1.3fr 0.9fr */
export function NumberCells({
  place,
  size = "md",
}: {
  place: MapPlace;
  size?: "lg" | "md";
}) {
  const price = priceText(place);
  const cells = [
    {
      key: "walk",
      label: copy.numbers.walk,
      num: String(place.walkMinutes),
      unit: copy.numbers.walkUnit,
    },
    {
      key: "price",
      label:
        place.priceSource === "estimate"
          ? `${copy.numbers.price} ${copy.numbers.estimate}`
          : copy.numbers.price,
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
    <dl className="grid grid-cols-[0.8fr_1.3fr_0.9fr] divide-x divide-border">
      {cells.map((c) => (
        <div
          key={c.key}
          className="flex min-w-0 flex-col gap-1 px-4 first:pl-0 last:pr-0 @max-[23.75rem]/screen:px-3"
        >
          <dt className="type-caption text-muted-foreground">{c.label}</dt>
          <dd className="flex items-baseline gap-0.5 whitespace-nowrap">
            {c.num === null ? (
              <span className="type-body-sm text-muted-foreground">
                {copy.numbers.thumbsEmpty}
              </span>
            ) : (
              <>
                <span
                  className={
                    size === "lg" ? "type-numeric-lg" : "type-numeric-md"
                  }
                >
                  {c.num}
                </span>
                <span className="type-body-sm text-muted-foreground">
                  {c.unit}
                </span>
              </>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------- 목록 행 ---------- */

export function PlaceRow({
  place,
  selected,
  onSelect,
}: {
  place: MapPlace;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected || undefined}
        className={cn(
          "relative flex min-h-18 w-full items-center gap-4 py-3 text-left",
          "before:absolute before:top-3 before:bottom-3 before:-left-(--lm-layout-gutter) before:w-0.5 before:bg-primary before:opacity-0 aria-current:before:opacity-100 desktop:before:-left-10",
          focusRing,
        )}
      >
        <CategoryIllustration slug={place.category} size={40} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate type-label text-foreground">
            {place.name}
          </span>
          <NumbersInline place={place} />
        </span>
        <span
          className={cn("shrink-0 type-caption", CATEGORY_INK[place.category])}
        >
          {categoryLabel(place.category)}
        </span>
      </button>
    </li>
  );
}

export function PlaceList({
  places,
  selectedId,
  onSelect,
}: {
  places: readonly MapPlace[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col">
      {places.map((p) => (
        <PlaceRow
          key={p.id}
          place={p}
          selected={p.id === selectedId}
          onSelect={() => onSelect(p.id)}
        />
      ))}
    </ul>
  );
}

/* ---------- 반쯤 열림: 식당 요약 ---------- */

export function PlaceSummary({
  place,
  onDetail,
  headingRef,
  compact = false,
  className,
}: {
  place: MapPlace;
  onDetail: () => void;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  /** 머리만(이유와 버튼 없이) */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5 pt-1">
          <span className={cn("type-caption", CATEGORY_INK[place.category])}>
            {categoryLabel(place.category)}
          </span>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="type-heading text-balance break-keep outline-none"
          >
            {place.name}
          </h2>
        </div>
        <CategoryIllustration
          slug={place.category}
          size={72}
          className="-mt-1 -mr-1 shrink-0"
        />
      </div>
      <NumberCells place={place} />
      {compact ? null : (
        <>
          <p className="truncate type-body-sm text-muted-foreground">
            {place.reason}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className={cn(buttonClass("primary"), "flex-1")}
            >
              {copy.actions.directions}
            </button>
            <button
              type="button"
              onClick={onDetail}
              className={buttonClass("secondary")}
            >
              {copy.actions.detail}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- 끝까지 열림: 상세 자리 ---------- */

export function DetailPlaceholder({ className }: { className?: string }) {
  return (
    <section
      aria-label={copy.detail.title}
      className={cn("flex flex-col gap-4 pt-2 pb-10", className)}
    >
      <div className="flex flex-col gap-1">
        <h3 className="type-label">{copy.detail.title}</h3>
        <p className="type-body-sm break-keep text-muted-foreground">
          {copy.detail.body}
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {copy.detail.blocks.map((b) => (
          <li
            key={b}
            className="flex min-h-20 items-center rounded-card border border-dashed border-border px-5 type-caption text-muted-foreground"
          >
            {b}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- 지도 위 ---------- */

/** 회사 핀(온보딩 핀과 같은 모양): 올리브 원 + 건물 + 가는 기둥. 끝이 좌표에 닿는다 */
export function OfficeMarker() {
  return (
    <span
      role="img"
      aria-label={copy.officeLabel}
      className="pointer-events-none flex flex-col items-center"
    >
      <span className="flex size-8 items-center justify-center rounded-full border-[1.5px] border-primary bg-primary text-primary-foreground ring-[3px] ring-card">
        <Building2 aria-hidden className="size-4" strokeWidth={1.75} />
      </span>
      <span className="h-3 w-[1.5px] bg-primary" />
    </span>
  );
}

/** MAP-05: 지도를 옮긴 뒤 나타나는 알약 버튼 */
export function ResearchButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "ml-rise inline-flex h-10 items-center gap-1.5 rounded-chip border border-border bg-card px-4 type-label text-foreground",
        hitArea44,
        focusRing,
        className,
      )}
    >
      <RotateCw aria-hidden className="size-4" strokeWidth={1.75} />
      {copy.research}
    </button>
  );
}

/** 현위치 버튼(원형 44). 지도 중심만 옮긴다(저장하지 않음, CLAUDE.md 7장) */
export function LocateButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copy.myLocation}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground",
        focusRing,
        className,
      )}
    >
      <LocateFixed aria-hidden className="size-5" strokeWidth={1.5} />
    </button>
  );
}

/** 기준 위치 칩(표시 전용, 바꾸기는 오늘 탭과 같은 칩 T5.16) */
export function BaseChip({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-chip border border-border bg-card px-3.5 type-label text-foreground",
        className,
      )}
    >
      <Building2
        aria-hidden
        className="size-4 text-primary"
        strokeWidth={1.75}
      />
      <span className="sr-only">{copy.base.label(copy.base.office)}</span>
      <span aria-hidden>{copy.base.office}</span>
    </p>
  );
}

/* ---------- 필터 칩 (MAP-03) ---------- */

export type FilterToggleKey = "cheap" | "near" | "top" | "favorites";

const TOGGLES: readonly { key: FilterToggleKey; label: string }[] = [
  { key: "cheap", label: copy.filters.price },
  { key: "near", label: copy.filters.walk },
  { key: "top", label: copy.filters.top },
  { key: "favorites", label: copy.filters.favorites },
];

/**
 * 가로 스크롤 칩 줄: 카테고리(펼침 버튼) + 토글 4개. 카테고리를 누르면 아래에 카테고리 줄이 펼쳐진다.
 * onMap이면 지도 위라 면을 card로 깔아 글자가 길 그림 위에서도 읽히게 한다.
 */
export function FilterChipRow({
  filters,
  onToggle,
  categoryOpen,
  onCategoryOpen,
  categories,
  onCategory,
  onMap = false,
  className,
  rowClassName,
}: {
  filters: MapFilters;
  onToggle: (key: FilterToggleKey) => void;
  categoryOpen: boolean;
  onCategoryOpen: (open: boolean) => void;
  categories: readonly CategorySlug[];
  onCategory: (slug: CategorySlug | null) => void;
  onMap?: boolean;
  className?: string;
  rowClassName?: string;
}) {
  const surface = onMap ? "bg-card" : "";
  const categoryText = filters.category
    ? categoryLabel(filters.category)
    : copy.filters.category;
  return (
    <div
      role="group"
      aria-label={copy.filters.label}
      className={cn("flex flex-col gap-2", className)}
    >
      <div
        className={cn(
          "-mx-(--lm-layout-gutter) flex [scrollbar-width:none] gap-2 overflow-x-auto px-(--lm-layout-gutter) py-1",
          rowClassName,
        )}
      >
        <Chip
          pressed={categoryOpen || filters.category !== null}
          onPressedChange={(v) => onCategoryOpen(v || !categoryOpen)}
          aria-expanded={categoryOpen}
          className={surface}
        >
          {categoryText}
        </Chip>
        {TOGGLES.map((t) => (
          <Chip
            key={t.key}
            pressed={filters[t.key]}
            onPressedChange={() => onToggle(t.key)}
            className={surface}
          >
            {t.label}
          </Chip>
        ))}
      </div>
      {categoryOpen ? (
        <CategoryChips
          value={filters.category}
          categories={categories}
          onChange={onCategory}
          className={cn("ml-rise", rowClassName)}
          chipClassName={surface}
        />
      ) : null}
    </div>
  );
}

function CategoryChips({
  value,
  categories,
  onChange,
  wrap = false,
  className,
  chipClassName,
}: {
  value: CategorySlug | null;
  categories: readonly CategorySlug[];
  onChange: (slug: CategorySlug | null) => void;
  wrap?: boolean;
  className?: string;
  chipClassName?: string;
}) {
  return (
    <div
      role="group"
      aria-label={copy.filters.categoryGroup}
      className={cn(
        wrap
          ? "flex flex-wrap gap-2"
          : "-mx-(--lm-layout-gutter) flex [scrollbar-width:none] gap-2 overflow-x-auto px-(--lm-layout-gutter) py-1",
        className,
      )}
    >
      <Chip
        pressed={value === null}
        onPressedChange={() => onChange(null)}
        className={chipClassName}
      >
        {copy.filters.categoryAll}
      </Chip>
      {categories.map((slug) => (
        <Chip
          key={slug}
          pressed={value === slug}
          onPressedChange={() => onChange(value === slug ? null : slug)}
          className={chipClassName}
        >
          {categoryLabel(slug)}
        </Chip>
      ))}
    </div>
  );
}

/* ---------- 상태 ---------- */

export function ListLoading({ rows = 4 }: { rows?: number }) {
  return (
    <LoadingRegion label={copy.states.loading} className="flex flex-col gap-3">
      <SkeletonLine type="label" className="w-32" />
      <ListSkeleton bare rows={rows} />
    </LoadingRegion>
  );
}

export function SummarySkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2 pt-1">
          <SkeletonLine type="caption" className="w-12" />
          <SkeletonLine type="heading" className="w-36" />
        </div>
        <Skeleton className="size-16 rounded-full" />
      </div>
      <Skeleton className="h-12 w-full rounded-sm" />
    </div>
  );
}

/** 빈 상태: 걷는 거리 안 0곳(넓히기) 또는 필터로 0곳(필터 풀기). 빈 상태만 주 버튼을 쓴다 */
export function EmptyBlock({
  filtered,
  walkLimit,
  expandTo,
  onExpand,
  onReset,
}: {
  filtered: boolean;
  walkLimit: number;
  expandTo: number;
  onExpand: () => void;
  onReset: () => void;
}) {
  const e = copy.states.empty;
  return filtered ? (
    <EmptyState
      title={e.filteredTitle}
      body={e.filteredBody}
      visual={<CategoryIllustration slug="hansik" size={72} />}
      action={{ label: e.filteredAction, onClick: onReset, variant: "primary" }}
      headingLevel="h2"
    />
  ) : (
    <EmptyState
      title={e.title(walkLimit)}
      body={e.body(expandTo)}
      visual={<CategoryIllustration slug="gukbap" size={72} />}
      action={{
        label: e.action(expandTo),
        onClick: onExpand,
        variant: "primary",
      }}
      headingLevel="h2"
    />
  );
}

export function OfflineBlock({ onRetry }: { onRetry: () => void }) {
  const o = copy.states.offline;
  return (
    <OfflineState
      title={o.title}
      body={o.body}
      action={{ label: o.action, onClick: onRetry }}
      headingLevel="h2"
    />
  );
}

/* ---------- 지도 로딩 실패 → 목록 보기 (T5.32) ---------- */

/**
 * 지도 칸을 접고 화면 전체를 목록으로 쓴다. 맨 위에 실패 안내(role=alert)와 "지도 다시 불러오기".
 * 식당을 고르면 목록 안에서 요약이 펼쳐진다(시트 없이). 안마다 같은 동작이라 공용으로 둔다.
 */
export function ListModeScreen({
  rootRef,
  places,
  selectedId,
  onSelect,
  onRetry,
  header,
}: {
  rootRef: RefObject<HTMLElement | null>;
  places: readonly MapPlace[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onRetry: () => void;
  header?: ReactNode;
}) {
  const selected = places.find((p) => p.id === selectedId) ?? null;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (selected) headingRef.current?.focus({ preventScroll: false });
  }, [selected]);
  const m = copy.states.mapError;
  return (
    <div
      ref={(el) => {
        rootRef.current = el;
      }}
      className="relative flex min-h-dvh flex-col desktop:grid desktop:grid-cols-[minmax(0,28.75rem)_minmax(0,1fr)] desktop:grid-rows-[minmax(0,1fr)_auto]"
    >
      <main className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-5 pb-8 desktop:col-start-1 desktop:max-w-none desktop:overflow-y-auto desktop:px-10 desktop:pt-10">
        <h1 className="sr-only">{copy.screenTitle}</h1>
        <div className="mb-6">
          <ErrorState
            title={m.title}
            body={m.body}
            action={{ label: m.retry, onClick: onRetry }}
            headingLevel="h2"
            className="items-start rounded-card border border-border bg-card px-6 py-6 text-left"
          />
        </div>
        {header}
        {selected ? (
          <div className="ml-rise mb-6 rounded-card border border-border bg-card p-6 @max-[23.75rem]/screen:p-5">
            <PlaceSummary
              place={selected}
              onDetail={() => {}}
              headingRef={headingRef}
            />
            <button
              type="button"
              onClick={() => onSelect(null)}
              className={cn(
                "mt-4 inline-flex h-11 items-center type-label text-muted-foreground underline decoration-border underline-offset-4",
                focusRing,
              )}
            >
              {copy.list.back}
            </button>
          </div>
        ) : null}
        <PlaceList
          places={places}
          selectedId={selectedId}
          onSelect={(id) => onSelect(id)}
        />
      </main>
      <aside
        aria-label={copy.mapLabel}
        className="hidden desktop:col-start-2 desktop:row-span-2 desktop:row-start-1 desktop:flex desktop:items-center desktop:justify-center desktop:border-l desktop:border-border desktop:bg-muted"
      >
        <p className="type-caption text-muted-foreground">{m.title}</p>
      </aside>
      <div className="sticky bottom-0 z-30 desktop:col-start-1 desktop:row-start-2">
        <TabBarView activeId="map" preview />
      </div>
    </div>
  );
}
