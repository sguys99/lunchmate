// 로딩 스켈레톤 패턴 (T2.7, DESIGN.md 5장 "추천 카드" 상태). 스피너 대신 같은 자리의 skeleton 면을 그린다.
//
//   <CardSkeleton />                 추천 카드 1장 (count로 여러 장)
//   <ListSkeleton rows={5} />        리스트 행 (지도 목록, 방문 기록, 투표 목록)
//   <SheetSkeleton />                바텀시트 식당 상세의 본문 (시트 안쪽 여백은 시트가 준다)
//   <LoadingRegion>...</LoadingRegion>  여러 스켈레톤을 한 로딩 영역으로 묶을 때. 안의 스켈레톤은 bare로 둔다.
//
// 치수 규칙: 글줄 막대는 SkeletonLine이 실제 글자 스타일(type-*)의 줄 높이를 그대로 차지하고,
// 막대는 그 안에서 글자 높이만큼만 칠한다. 그래서 데이터가 들어와도 줄 높이가 같아 레이아웃이 흔들리지 않는다.
// 일러스트 자리는 96px 상자 안 같은 위치(중심 40,42, 반지름 25)의 원, 숫자 줄은 NumberRow와 같은 3칸 격자.
//
// 접근성: 감싸는 영역은 aria-busy, 안에 role="status" sr-only 로딩 문구 하나. 막대는 모두 aria-hidden(Skeleton 기본).
// 호흡 애니메이션은 Skeleton(CSS)이 맡고, 모든 막대가 같은 박자라 한 개의 효과로 읽힌다. reduced motion이면 정지.
import type { ComponentProps, ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { commonCopy } from "@/copy/common";
import { cn } from "@/lib/utils";

/* ---------- 영역과 글줄 ---------- */

type LoadingRegionProps = ComponentProps<"div"> & {
  /** 스크린리더용 로딩 문구. 기본 commonCopy.states.loading.label */
  label?: string;
};

/** 로딩 중인 영역. aria-busy + 스크린리더용 문구 한 번. */
export function LoadingRegion({
  label = commonCopy.states.loading.label,
  className,
  children,
  ...props
}: LoadingRegionProps) {
  return (
    <div
      aria-busy="true"
      data-slot="loading-region"
      className={className}
      {...props}
    >
      <span role="status" className="sr-only">
        {label}
      </span>
      {children}
    </div>
  );
}

/** Tailwind가 클래스 이름을 찾도록 그대로 적는다 */
const LINE_TYPE = {
  title: "type-title",
  heading: "type-heading",
  body: "type-body",
  "body-sm": "type-body-sm",
  label: "type-label",
  caption: "type-caption",
  "numeric-lg": "type-numeric-lg",
} as const;

export type SkeletonLineType = keyof typeof LINE_TYPE;

/**
 * 글 한 줄 자리. 높이는 type의 줄 높이, 막대는 글자 높이(0.75em)만큼.
 * className은 막대(폭)에, lineClassName은 줄 상자(바깥 여백)에 준다.
 */
export function SkeletonLine({
  type,
  className,
  lineClassName,
}: {
  type: SkeletonLineType;
  className?: string;
  lineClassName?: string;
}) {
  return (
    <div
      aria-hidden
      data-slot="skeleton-line"
      className={cn("flex items-center", LINE_TYPE[type], lineClassName)}
    >
      {/* 폭 0의 공백 한 글자가 줄 상자 높이를 만든다 */}
      <span className="w-0 overflow-hidden">{" "}</span>
      <Skeleton className={cn("h-[0.75em] rounded-badge", className)} />
    </div>
  );
}

/** 일러스트 96px 자리: 같은 위치의 원 하나 */
function IllustrationSlot({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative size-24 shrink-0", className)}>
      <Skeleton className="absolute top-[17px] left-[15px] size-[50px] rounded-full" />
    </div>
  );
}

const NUMBER_WIDTHS = ["w-8", "w-16", "w-10"] as const;

/** 숫자 3칸 (NumberRow와 같은 격자, 라벨 caption + 숫자 numeric-lg 줄) */
function NumberRowSkeleton() {
  return (
    <div
      aria-hidden
      className="grid grid-cols-[0.8fr_1.3fr_0.9fr] divide-x divide-border"
    >
      {NUMBER_WIDTHS.map((w) => (
        <div
          key={w}
          className="flex min-w-0 flex-col gap-1.5 px-4 first:pl-0 last:pr-0"
        >
          <SkeletonLine type="caption" className="w-8" />
          <SkeletonLine
            type="numeric-lg"
            lineClassName="min-h-[1.84rem]"
            className={w}
          />
        </div>
      ))}
    </div>
  );
}

/** bare면 LoadingRegion 없이 막대만 그린다(바깥 LoadingRegion 안에서 조합할 때). */
type SkeletonPatternProps = {
  label?: string;
  bare?: boolean;
  className?: string;
};

function Region({
  bare,
  label,
  className,
  children,
}: SkeletonPatternProps & { children: ReactNode }) {
  if (bare)
    return (
      <div aria-hidden className={className}>
        {children}
      </div>
    );
  return (
    <LoadingRegion label={label} className={className}>
      {children}
    </LoadingRegion>
  );
}

/* ---------- 추천 카드 ---------- */

function CardShape() {
  return (
    // 카드 폭 332px 미만(화면 380px 미만)이면 안쪽 28 → 20 (DESIGN.md 4장 360px 대응)
    <div className="@container">
      <div
        data-slot="card-skeleton"
        className="flex flex-col gap-7 rounded-card border border-border bg-card p-7 @max-[20.75rem]:p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
            <SkeletonLine type="caption" className="w-14" />
            <SkeletonLine type="heading" className="w-36" />
            <SkeletonLine type="heading" className="w-24" />
          </div>
          <IllustrationSlot className="-mt-2 -mr-2" />
        </div>
        <NumberRowSkeleton />
        <SkeletonLine type="body-sm" lineClassName="-mt-1" className="w-4/5" />
        <Skeleton className="h-12 w-full rounded-button" />
      </div>
    </div>
  );
}

/** 추천 카드 자리. 해부도(윗줄, 숫자 3칸, 이유 한 줄, 행동)를 같은 치수로. 여러 장이면 사이 40px. */
export function CardSkeleton({
  count = 1,
  className,
  ...region
}: SkeletonPatternProps & { count?: number }) {
  return (
    <Region {...region} className={cn("flex flex-col gap-10", className)}>
      {Array.from({ length: count }, (_, i) => (
        <CardShape key={i} />
      ))}
    </Region>
  );
}

/* ---------- 리스트 행 ---------- */

/** 행마다 폭을 조금씩 달리해 같은 막대가 줄지어 보이지 않게 한다 */
const ROW_WIDTHS = [
  ["w-32", "w-20"],
  ["w-24", "w-28"],
  ["w-36", "w-16"],
  ["w-28", "w-24"],
] as const;

/**
 * 리스트 행 자리: 카테고리 아이콘(40px 원) + 식당명(label) + 메타(caption) + 오른쪽 도보 분(caption).
 * 행 사이는 1px 선. 실제 행도 같은 치수(min-h 72px, py-3, gap-4)로 만든다.
 */
export function ListSkeleton({
  rows = 5,
  className,
  ...region
}: SkeletonPatternProps & { rows?: number }) {
  return (
    <Region {...region} className={className}>
      <ul data-slot="list-skeleton" className="flex flex-col">
        {Array.from({ length: rows }, (_, i) => {
          const [name, meta] = ROW_WIDTHS[i % ROW_WIDTHS.length]!;
          return (
            <li
              key={i}
              className="flex min-h-18 items-center gap-4 border-b border-border py-3"
            >
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <SkeletonLine type="label" className={name} />
                <SkeletonLine type="caption" className={meta} />
              </div>
              <SkeletonLine type="caption" className="w-12 shrink-0" />
            </li>
          );
        })}
      </ul>
    </Region>
  );
}

/* ---------- 바텀시트 상세 ---------- */

/**
 * 시트 식당 상세 본문 자리: 제목 줄(title 세리프, 오른쪽 위 닫기 버튼 자리 40px 비움, 데스크톱 인라인 상세에서는 비우지 않음) → 숫자 3칸 → 이유 한 줄
 * → children(투표 득표처럼 화면마다 다른 블록) → 정보 행(운영 시간, 주소, 전화).
 * 시트 안쪽 좌우 여백은 시트(DrawerContent)가 준다.
 */
export function SheetSkeleton({
  infoRows = 3,
  className,
  children,
  ...region
}: SkeletonPatternProps & { infoRows?: number; children?: ReactNode }) {
  return (
    <Region {...region} className={cn("flex flex-col pb-10", className)}>
      <div data-slot="sheet-skeleton" className="flex flex-col gap-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
            <SkeletonLine type="caption" className="w-14" />
            <SkeletonLine type="title" className="w-40" />
          </div>
          <IllustrationSlot className="-mt-2 mr-10 desktop:mr-0" />
        </div>
        <NumberRowSkeleton />
        <SkeletonLine type="body-sm" lineClassName="-mt-1" className="w-3/4" />
      </div>
      {children}
      <div className="mt-10 flex flex-col border-t border-border">
        {Array.from({ length: infoRows }, (_, i) => (
          <div
            key={i}
            className="grid grid-cols-[4.5rem_1fr] gap-4 border-b border-border py-3.5"
          >
            <SkeletonLine
              type="caption"
              lineClassName="leading-6"
              className="w-10"
            />
            <SkeletonLine
              type="body-sm"
              className={i % 2 === 0 ? "w-3/4" : "w-1/2"}
            />
          </div>
        ))}
      </div>
    </Region>
  );
}
