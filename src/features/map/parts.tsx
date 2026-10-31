"use client";
// 지도 탭 조각 (T5.26~T5.32, D-09 B + 고른 마커에 A의 그림, DESIGN.md 5장 "지도").
// 마커(도보 분 알약, 묶음), 기준 위치 핀, 지도 위 버튼, 필터 칩, 목록 행, 상태 블록.
// 장소 이름은 카카오 세션 메모리 값이라 React 텍스트로만 넣는다(innerHTML 금지).
import {
  Building2,
  LocateFixed,
  MapPinOff,
  RotateCw,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  EmptyState,
  ErrorState,
  ListSkeleton,
  LoadingRegion,
  OfflineState,
  SkeletonLine,
  StateGlyph,
} from "@/components/states";
import { buttonClass } from "@/components/ui/button-classes";
import { Chip } from "@/components/ui/chip";
import { Skeleton } from "@/components/ui/skeleton";
import { focusRing, hitArea44 } from "@/components/ui/interaction";
import { mapCopy } from "@/copy/map";
import { categoryLabel, type CategorySlug } from "@/features/place/categories";
import { CATEGORY_INK } from "@/features/place/category-ink";
import { CategoryIllustration } from "@/features/place/illustrations";
import { priceBandParts, thumbsUpPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  TOP_MIN_REVIEWS,
  type FilterToggleKey,
  type MapFilters,
} from "./filters";
import type { MapPlace } from "./places";

const copy = mapCopy;

/* ---------- 마커 (MAP-02) ---------- */

/**
 * 도보 분 알약. 왼쪽 8px 점이 카테고리 색, 오른쪽 "4분". 아래 8px 꼬리 끝이 좌표.
 * 고르면 면이 primary로 바뀌고 이름이 펼쳐지며, 점 자리에 카테고리 그림을 담은 작은 원이 붙는다(A에서 가져옴).
 */
export function WalkPill({
  place,
  selected,
  onSelect,
}: {
  place: MapPlace;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={copy.markerLabel(
        place.name,
        categoryLabel(place.category),
        place.walkMinutes,
      )}
      className={cn(
        "lm-map-marker flex flex-col items-center rounded-chip",
        focusRing,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "lm-map-pill flex h-9 min-w-11 items-center gap-1.5 rounded-chip border pr-2.5",
          selected
            ? "border-primary bg-primary pl-1 text-primary-foreground"
            : "border-border bg-card pl-2.5 text-foreground",
        )}
      >
        {selected ? (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-card">
            <CategoryIllustration slug={place.category} size={24} />
          </span>
        ) : (
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: `var(--cat-${place.category}-ink)` }}
          />
        )}
        <span
          className={cn(
            "lm-map-pill-name overflow-hidden type-label text-ellipsis whitespace-nowrap",
            selected ? "max-w-40" : "max-w-0",
          )}
        >
          {place.name}
        </span>
        <span className="type-label whitespace-nowrap tabular-nums">
          {place.walkMinutes}
          <span
            className={cn(
              "ml-px type-caption",
              !selected && "text-muted-foreground",
            )}
          >
            {copy.numbers.walkUnit}
          </span>
        </span>
      </span>
      <span
        aria-hidden
        className={cn(
          "lm-map-pill -mt-1 size-2 rotate-45 border-r border-b",
          selected ? "border-primary bg-primary" : "border-border bg-card",
        )}
      />
    </button>
  );
}

/** 묶음: 알약 두 장이 겹친 모양(뒤 장 4px 어긋남) + "3곳" */
export function ClusterPill({
  count,
  onOpen,
}: {
  count: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={copy.clusterLabel(count)}
      className={cn(
        "lm-map-marker relative flex flex-col items-center rounded-chip",
        focusRing,
      )}
    >
      <span
        aria-hidden
        className="absolute top-1 left-1 h-9 w-full rounded-chip border border-border bg-card"
      />
      <span
        aria-hidden
        className="relative flex h-9 min-w-11 items-center justify-center rounded-chip border border-foreground/40 bg-card px-3 type-label tabular-nums"
      >
        {count}
        <span className="ml-0.5 type-caption text-muted-foreground">
          {copy.clusterUnit}
        </span>
      </span>
      <span
        aria-hidden
        className="relative -mt-1 size-2 rotate-45 border-r border-b border-foreground/40 bg-card"
      />
    </button>
  );
}

/**
 * 기준 위치 핀. 회사는 올리브 원 + 건물(온보딩 핀과 같은 모양), 현위치는 점 + 링.
 * 가장 가까운 식당 알약과 겹쳐도 알아보게 작게(28) 두고 알약보다 아래에 쌓는다.
 */
export function BaseMarker({ kind }: { kind: "office" | "here" }) {
  if (kind === "here") {
    return (
      <span
        role="img"
        aria-label={copy.officeMarker}
        className="lm-map-base pointer-events-none flex size-4 translate-y-2 items-center justify-center rounded-full bg-primary ring-4 ring-primary/20"
      >
        <span className="size-1.5 rounded-full bg-primary-foreground" />
      </span>
    );
  }
  return (
    <span
      role="img"
      aria-label={copy.officeMarker}
      className="lm-map-base pointer-events-none flex flex-col items-center"
    >
      <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground ring-[3px] ring-card">
        <Building2 aria-hidden className="size-3.5" strokeWidth={1.75} />
      </span>
      <span className="h-2.5 w-[1.5px] bg-primary" />
    </span>
  );
}

/* ---------- 지도 위 ---------- */

/** MAP-05: 사용자가 지도를 옮긴 뒤 나타나는 테두리 알약 버튼 */
export function ResearchButton({
  onClick,
  busy,
}: {
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-busy={busy || undefined}
      className={cn(
        "lm-map-rise inline-flex h-10 items-center gap-1.5 rounded-chip border border-border bg-card px-4 type-label text-foreground shadow-sm",
        hitArea44,
        focusRing,
      )}
    >
      <RotateCw aria-hidden className="size-4" strokeWidth={1.75} />
      {copy.research}
    </button>
  );
}

/** 현위치 버튼(원형 44). 지도 중심만 옮긴다(기준점과 저장은 그대로, CLAUDE.md 7장) */
export function LocateButton({
  onClick,
  busy,
}: {
  onClick: () => void;
  busy: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copy.myLocation}
      aria-busy={busy || undefined}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm",
        busy && "text-muted-foreground",
        focusRing,
      )}
    >
      <LocateFixed aria-hidden className="size-5" strokeWidth={1.5} />
    </button>
  );
}

/**
 * 기준 위치 칩. 평소에는 표시만 한다(바꾸기는 오늘 탭 칩, T5.16).
 * 다시 찾은 지역을 보고 있으면 "기준 위치로 돌아가기" 버튼이 된다.
 */
export function BaseChip({
  name,
  kind,
  onReturn,
}: {
  name: string;
  kind: "office" | "here";
  /** 다시 찾은 지역을 보는 중이면 돌아가기 */
  onReturn: (() => void) | null;
}) {
  const Icon = kind === "office" ? Building2 : LocateFixed;
  const inner = (
    <>
      <Icon
        aria-hidden
        className="size-4 shrink-0 text-primary"
        strokeWidth={1.75}
      />
      <span className="truncate">{onReturn ? copy.base.area : name}</span>
      {onReturn ? (
        <Undo2
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
          strokeWidth={1.5}
        />
      ) : null}
    </>
  );
  const cls =
    "inline-flex h-10 max-w-full min-w-0 items-center gap-1.5 rounded-chip border border-border bg-card px-3.5 type-label text-foreground shadow-sm";
  if (onReturn) {
    return (
      <button
        type="button"
        onClick={onReturn}
        aria-label={copy.backToBase}
        className={cn(cls, hitArea44, focusRing)}
      >
        {inner}
      </button>
    );
  }
  return (
    <p className={cls}>
      <span className="sr-only">{copy.base.prefix}</span>
      {inner}
    </p>
  );
}

/* ---------- 필터 칩 (MAP-03) ---------- */

const TOGGLES: readonly { key: FilterToggleKey; label: string }[] = [
  { key: "cheap", label: copy.filters.cheap },
  { key: "near", label: copy.filters.near },
  { key: "top", label: copy.filters.top },
  { key: "favorites", label: copy.filters.favorites },
];

/** 가로 스크롤 칩 줄: 카테고리(펼침) + 토글 4개. 카테고리를 누르면 아래에 카테고리 줄이 펼쳐진다 */
export function FilterChipRow({
  filters,
  onToggle,
  categoryOpen,
  onCategoryOpen,
  categories,
  onCategory,
  className,
}: {
  filters: MapFilters;
  onToggle: (key: FilterToggleKey) => void;
  categoryOpen: boolean;
  onCategoryOpen: (open: boolean) => void;
  categories: readonly CategorySlug[];
  onCategory: (slug: CategorySlug | null) => void;
  className?: string;
}) {
  const rowCls =
    "-mx-(--lm-layout-gutter) flex [scrollbar-width:none] gap-2 overflow-x-auto px-(--lm-layout-gutter) py-1 desktop:mx-0 desktop:flex-wrap desktop:overflow-visible desktop:px-0";
  return (
    <div
      role="group"
      aria-label={copy.filters.label}
      className={cn("flex flex-col gap-2", className)}
    >
      <div className={rowCls}>
        <Chip
          pressed={categoryOpen || filters.category !== null}
          onPressedChange={() => onCategoryOpen(!categoryOpen)}
          aria-expanded={categoryOpen}
          className="shrink-0"
        >
          {filters.category
            ? categoryLabel(filters.category)
            : copy.filters.category}
        </Chip>
        {TOGGLES.map((t) => (
          <Chip
            key={t.key}
            pressed={filters[t.key]}
            onPressedChange={() => onToggle(t.key)}
            aria-describedby={t.key === "top" ? "lm-map-top-hint" : undefined}
            className="shrink-0"
          >
            {t.label}
          </Chip>
        ))}
      </div>
      <p id="lm-map-top-hint" className="sr-only">
        {copy.filters.topHint}
      </p>
      {categoryOpen ? (
        <div
          role="group"
          aria-label={copy.filters.categoryGroup}
          className={cn("lm-map-rise", rowCls)}
        >
          <Chip
            pressed={filters.category === null}
            onPressedChange={() => onCategory(null)}
            className="shrink-0"
          >
            {copy.filters.categoryAll}
          </Chip>
          {categories.map((slug) => (
            <Chip
              key={slug}
              pressed={filters.category === slug}
              onPressedChange={() =>
                onCategory(filters.category === slug ? null : slug)
              }
              className="shrink-0"
            >
              {categoryLabel(slug)}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ---------- 목록 ---------- */

/** 한 줄 숫자: 도보 N분 | 9천 원대 추정 | 👍 87%. 문자 구분자 없이 얇은 세로선 (CLAUDE.md 9장) */
/**
 * 시트 머리의 "N곳 숨김"(기피 음식, 다시 안 갈 곳, 2026-10-31 결정). 작은 글자, 터치 영역은 44px.
 * 로그인했으면 나 탭 설정으로 가는 링크, 둘러보기면 글자만(설정할 곳이 없다).
 */
export function HiddenNote({
  count,
  href,
}: {
  count: number;
  href: string | null;
}) {
  if (count === 0) return null;
  const cls = "shrink-0 type-caption text-muted-foreground";
  if (href === null) {
    return (
      <span className={cls}>
        <span aria-hidden>{copy.hidden.short(count)}</span>
        <span className="sr-only">{copy.hidden.guestLabel(count)}</span>
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={copy.hidden.linkLabel(count)}
      className={cn(
        cls,
        "rounded-sm underline decoration-border underline-offset-4 hover:text-foreground",
        hitArea44,
        focusRing,
      )}
    >
      {copy.hidden.short(count)}
    </Link>
  );
}

export function NumbersInline({ place }: { place: MapPlace }) {
  const price = priceBandParts(place.priceKRW);
  const total = place.thumbs.up + place.thumbs.down;
  const pct =
    total >= TOP_MIN_REVIEWS ? thumbsUpPercent(place.thumbs.up, total) : null;
  return (
    <span className="flex items-center gap-2.5 type-caption whitespace-nowrap text-muted-foreground tabular-nums">
      <span>
        {copy.numbers.walk} {place.walkMinutes}
        {copy.numbers.walkUnit}
      </span>
      <span aria-hidden className="h-3 w-px bg-border" />
      <span>
        {price.amount}
        {price.unit}
        {place.priceEstimate ? (
          <span className="ml-1 text-warning-foreground">
            {copy.numbers.estimate}
          </span>
        ) : null}
      </span>
      {pct !== null ? (
        <>
          <span aria-hidden className="h-3 w-px bg-border" />
          <span>
            {copy.numbers.thumbs} {pct}
            {copy.numbers.thumbsUnit}
          </span>
        </>
      ) : null}
    </span>
  );
}

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

/* ---------- 상태 ---------- */

export function ListLoading({
  label = copy.states.loading,
}: {
  label?: string;
}) {
  return (
    <LoadingRegion label={label} className="flex flex-col gap-3">
      <ListSkeleton bare rows={4} />
    </LoadingRegion>
  );
}

export function HeaderSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3 pt-1">
      <SkeletonLine type="label" className="w-36" />
      <div className="flex gap-2">
        {["w-20", "w-24", "w-20", "w-16"].map((w, i) => (
          <Skeleton key={i} className={cn("h-10 rounded-chip", w)} />
        ))}
      </div>
    </div>
  );
}

/** 빈 상태: 걷는 거리 안 0곳(넓히기) 또는 필터로 0곳(필터 풀기). 빈 상태만 주 버튼을 쓴다 */
export function EmptyBlock({
  filtered,
  walk,
  expandTo,
  onExpand,
  onReset,
}: {
  filtered: boolean;
  walk: number;
  expandTo: number | null;
  onExpand: () => void;
  onReset: () => void;
}) {
  const e = copy.states.empty;
  if (filtered) {
    return (
      <EmptyState
        title={e.filteredTitle}
        body={e.filteredBody}
        visual={<CategoryIllustration slug="hansik" size={72} />}
        action={{
          label: e.filteredAction,
          onClick: onReset,
          variant: "primary",
        }}
        headingLevel="h2"
      />
    );
  }
  return (
    <EmptyState
      title={e.title(walk)}
      body={expandTo === null ? e.bodyMax : e.body(expandTo)}
      visual={<CategoryIllustration slug="gukbap" size={72} />}
      action={
        expandTo === null
          ? undefined
          : { label: e.action(expandTo), onClick: onExpand, variant: "primary" }
      }
      headingLevel="h2"
    />
  );
}

/** 화면 전체 상태 카드(위치 없음, 오프라인, 카카오 오류, 설정 읽기 실패) */
export function StateCard({ children }: { children: ReactNode }) {
  return (
    <div className="lm-map-rise rounded-card border border-border bg-card px-6 py-8 @max-[23.75rem]/screen:px-5">
      {children}
    </div>
  );
}

const secondaryText = cn(
  "inline-flex min-h-11 items-center gap-1 type-label text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground",
  focusRing,
);

export function OfflineBlock() {
  const o = copy.states.offline;
  return (
    <StateCard>
      <OfflineState title={o.title} body={o.body} headingLevel="h2" />
    </StateCard>
  );
}

export function KakaoErrorBlock({
  naverHref,
  onRetry,
}: {
  naverHref: string;
  onRetry: () => void;
}) {
  const k = copy.states.kakaoError;
  return (
    <StateCard>
      <ErrorState
        title={k.title}
        body={k.body}
        action={{ label: k.action, onClick: onRetry }}
        headingLevel="h2"
      />
      <a
        href={naverHref}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(secondaryText, "mt-4")}
      >
        {k.naverLink}
      </a>
    </StateCard>
  );
}

export function LoadFailedBlock({ onRetry }: { onRetry: () => void }) {
  const l = copy.states.loadFailed;
  return (
    <StateCard>
      <ErrorState
        title={l.title}
        body={l.body}
        action={{ onClick: onRetry }}
        headingLevel="h2"
      />
    </StateCard>
  );
}

/** 사무실이 없고 현위치도 못 씀 (PRD 12장). 둘러보기는 로그인 유도, 로그인 사용자는 사무실 추가 */
export function NeedLocationBlock({
  reason,
  signedIn,
  onRetry,
  onSaveOffice,
}: {
  reason: "denied" | "unavailable";
  signedIn: boolean;
  onRetry: () => void;
  onSaveOffice: () => void;
}) {
  const t = copy.states.needLocation;
  return (
    <StateCard>
      <EmptyState
        title={t.title}
        body={reason === "denied" ? t.denied : t.unavailable}
        visual={<StateGlyph icon={MapPinOff} />}
        action={
          signedIn
            ? {
                label: t.addOffice,
                href: "/me/offices/new",
                variant: "primary",
              }
            : { label: t.saveOffice, onClick: onSaveOffice, variant: "primary" }
        }
        headingLevel="h2"
      />
      <button
        type="button"
        onClick={onRetry}
        className={cn(secondaryText, "mt-4")}
      >
        {t.retry}
      </button>
    </StateCard>
  );
}

/** T5.32 목록 보기 맨 위 안내: 지도 실패 + 다시 불러오기 */
export function MapFailedNote({ onRetry }: { onRetry: () => void }) {
  const m = copy.states.mapError;
  return (
    <div
      role="alert"
      className="lm-map-rise flex flex-col gap-3 rounded-card border border-border bg-card px-5 py-5"
    >
      <p className="type-label break-keep">{m.title}</p>
      <p className="type-caption break-keep text-muted-foreground">{m.body}</p>
      <button
        type="button"
        onClick={onRetry}
        className={cn(buttonClass("secondary"), "self-start")}
      >
        <RotateCw aria-hidden className="size-4" strokeWidth={1.75} />
        {m.retry}
      </button>
    </div>
  );
}
