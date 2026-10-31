"use client";
// 식당 상세 본문과 하단 고정 줄 (T5.33~T5.38, D-10: C 결정 집중형 + A 가격 점 분포와 예산 선 + B "왜 이 집인지" 한 줄).
// 컨테이너와 분리된 재사용 컴포넌트다. 홈은 PlaceDetailSheet(바텀시트, 끝까지 연 높이), 지도는 지도 시트(T5.29) 안에 넣는다.
//
// 위계 (첫 높이): 카테고리 그림 + 이름 → 이유 한 줄 → 내 방문 한 줄 → 숫자 3칸(도보, 1인 + 예산 판정, 만족) → 배지(웨이팅, 할인)
// 나머지는 한 줄 요약이 붙은 접힘 행: 가격, 만족도(기본 펼침), 태그, 후기, 지금, 정보.
// 하단 고정 줄: 길찾기(포인트 컬러, 화면에 하나) + 즐겨찾기 + 더 보기(전화, 공유, 네이버 플레이스, 투표에 추가, 제보 3종).
// 이름 해석 실패(T5.12a): 이름, 좌표가 없어 주 버튼이 "카카오맵에서 보기", 전화와 네이버 링크는 뺀다.
//
// 데이터 규칙: 이름, 주소, 전화, 좌표는 props로 받은 세션 메모리 값이다. 이 컴포넌트는 저장하지 않는다(CLAUDE.md 7장).
import {
  ExternalLink,
  Flag,
  Phone,
  Share2,
  Star,
  Vote,
  WifiOff,
} from "lucide-react";
import type { ReactNode } from "react";
import type { PlaceBadge } from "@/components/badges/pick-badges";
import { PlaceBadges } from "@/components/badges/place-badges";
import { ErrorState, LoadingRegion, SkeletonLine } from "@/components/states";
import { buttonClass } from "@/components/ui/button-classes";
import { Skeleton } from "@/components/ui/skeleton";
import { placeCopy } from "@/copy/place";
import { reasonWithoutWalk } from "@/features/rec/reason";
import { isEnabled } from "@/lib/flags";
import {
  NAVER_MAP_WEB,
  naverPlaceSearchUrl,
  type DirectionsOrigin,
} from "@/lib/naver/directions";
import { useOnlineStatus } from "@/lib/network";
import type { Meal } from "@/lib/time";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/lazy-toaster";
import { categoryLabel } from "../categories";
import { CATEGORY_INK } from "../category-ink";
import {
  detailPrice,
  detailThumbs,
  type PlaceDetailPlace,
  type PlaceDetailStats,
} from "../detail-model";
import { CategoryIllustration } from "../illustrations";
import type { DirectionsResult } from "../launch-directions";
import { PlaceMoreMenu, type MoreMenuAction } from "./more-menu";
import {
  CompactNumbers,
  Fold,
  InfoBlock,
  NowBlock,
  PriceScale,
  ReviewsBlock,
  TagChips,
  TenMeter,
  nowSummary,
  textAction,
} from "./parts";
import {
  sharePlace,
  useDirections,
  useFavorite,
  type DirectionsSource,
} from "./use-place-actions";

const copy = placeCopy;

export type ReportKind = "closed" | "price" | "wrong";
export type WaitingReportLevel = "walkIn" | "short" | "long";

export type PlaceDetailProps = {
  place: PlaceDetailPlace;
  /** place_id 집계(6단계). 그 전에는 EMPTY_PLACE_STATS */
  stats: PlaceDetailStats;
  meal: Meal;
  /** 이번 끼니 예산(원). 예산 판정과 가격 눈금의 예산 선 */
  budgetKRW: number;
  /** 방문 후보와 분석 이벤트의 출처 (NAV-04) */
  source: DirectionsSource;
  /** 길찾기 출발지: 사무실 핀 또는 현위치. 모르면 null(앱이 현위치에서 출발) */
  origin: DirectionsOrigin | null;
  /** 이름 제목 수준. 시트 안이면 h2 */
  headingLevel?: "h1" | "h2";
  /** 투표에 추가 (pollEntry 플래그가 켜지고 이 값이 있을 때만 메뉴에 보인다, 7단계) */
  onAddToPoll?: () => void;
  /** 제보 3종 (PLACE-05, 6단계). 없으면 "곧 열립니다" 안내 */
  onReport?: (kind: ReportKind) => void;
  /** 웨이팅 한 탭 제보 (PLACE-07, 6단계) */
  onReportWaiting?: (level: WaitingReportLevel) => void;
  /** 후기 모두 보기 (6단계) */
  onMoreReviews?: () => void;
  onDirectionsLaunched?: (result: DirectionsResult) => void;
  className?: string;
  /** 하단 고정 줄 바깥 클래스(컨테이너가 sticky 위치, 면 색을 정한다) */
  footerClassName?: string;
};

/** 본문 + 하단 고정 줄. 컨테이너가 스크롤을 맡는다 */
export function PlaceDetail(props: PlaceDetailProps) {
  return (
    <div className={cn("flex min-h-full flex-col", props.className)}>
      <PlaceDetailBody {...props} className="flex-1" />
      <div
        className={cn(
          "sticky bottom-0 z-[5] mt-auto border-t border-border bg-popover py-3",
          props.footerClassName,
        )}
      >
        <PlaceDetailActions {...props} />
      </div>
    </div>
  );
}

/* ---------- 본문 ---------- */

function badgesOf(stats: PlaceDetailStats): PlaceBadge[] {
  const list: PlaceBadge[] = [];
  if (stats.waiting) {
    list.push({
      kind: "waiting",
      level: stats.waiting.level,
      minutesAgo: stats.waiting.minutesAgo,
    });
  }
  if (stats.deal) list.push({ kind: "deal" });
  return list;
}

export function PlaceDetailBody({
  place,
  stats,
  meal,
  budgetKRW,
  headingLevel = "h2",
  onReportWaiting,
  onMoreReviews,
  className,
}: PlaceDetailProps) {
  const online = useOnlineStatus();
  const Heading = headingLevel;
  const named = place.name !== null;
  const price = detailPrice(stats, place.category, meal, budgetKRW);
  const thumbs = detailThumbs(stats.thumbs);
  const catLabel = categoryLabel(place.category);
  const reason = place.reason ? reasonWithoutWalk(place.reason) : null;
  const naverUrl = named
    ? naverPlaceSearchUrl(place.name ?? "", place.position ?? null)
    : null;

  return (
    <div className={cn("flex flex-col pt-2 pb-6", className)}>
      {!online ? <OfflineNote className="mb-5" /> : null}

      {/* 요약 */}
      {named ? (
        <header className="flex items-center gap-3">
          <CategoryIllustration
            slug={place.category}
            size={56}
            className="-ml-1 shrink-0"
          />
          <div className="flex min-w-0 flex-col">
            <span className={cn("type-caption", CATEGORY_INK[place.category])}>
              {catLabel}
            </span>
            <Heading className="type-title text-balance break-keep">
              {place.name}
            </Heading>
          </div>
        </header>
      ) : (
        <header className="flex flex-col gap-2">
          <span className={cn("type-caption", CATEGORY_INK[place.category])}>
            {catLabel}
          </span>
          <Heading className="type-heading break-keep text-muted-foreground">
            {copy.nameUnresolved}
          </Heading>
          <p className="type-body-sm break-keep text-muted-foreground">
            {copy.detail.nameUnresolvedBody}
          </p>
        </header>
      )}

      {reason ? (
        <p className="mt-4 type-body-sm break-keep text-muted-foreground">
          {reason}
        </p>
      ) : null}
      {stats.myVisit ? (
        <p className="mt-1.5 type-caption break-keep text-muted-foreground">
          {copy.detail.myVisit(stats.myVisit.dateLabel, stats.myVisit.rating)}
        </p>
      ) : null}

      <CompactNumbers
        walkMinutes={named ? place.walkMinutes : null}
        price={price}
        thumbs={thumbs}
        className="mt-5"
      />
      <PlaceBadges badges={badgesOf(stats)} className="mt-4" />

      {/* 접힘 행 */}
      <div className="mt-6 flex flex-col border-t border-border">
        <Fold
          title={copy.price.title}
          summary={
            price.estimate
              ? copy.price.estimateOf(catLabel)
              : copy.price.medianOf(price.reportCount)
          }
        >
          {(open) => (
            <PriceScale
              price={price}
              budgetKRW={budgetKRW}
              meal={meal}
              categoryLabel={catLabel}
              active={open}
            />
          )}
        </Fold>
        <Fold
          title={copy.thumbs.title}
          summary={
            thumbs.total === 0
              ? copy.numbers.thumbsEmpty
              : copy.thumbs.reviewsOf(thumbs.total)
          }
          defaultOpen
        >
          {(open) => <TenMeter thumbs={thumbs} active={open} />}
        </Fold>
        <Fold
          title={copy.tags.title}
          summary={
            stats.tags
              .slice(0, 2)
              .map((t) => t.label)
              .join(", ") || copy.tags.none
          }
        >
          {() => <TagChips tags={stats.tags} />}
        </Fold>
        <Fold
          title={copy.reviews.title}
          summary={copy.reviews.titleCount(stats.reviewTotal)}
        >
          {() => (
            <ReviewsBlock
              reviews={stats.reviews}
              total={stats.reviewTotal}
              onMore={onMoreReviews}
            />
          )}
        </Fold>
        <Fold title={copy.now.title} summary={nowSummary(stats)}>
          {() => (
            <NowBlock
              stats={stats}
              onReportWaiting={onReportWaiting}
              disabled={!online}
            />
          )}
        </Fold>
        {named && naverUrl ? (
          <Fold
            title={copy.info.title}
            summary={place.address ?? copy.info.naverNote}
          >
            {() => (
              <InfoBlock
                address={place.address ?? null}
                phone={place.phone ?? null}
                naverUrl={naverUrl}
              />
            )}
          </Fold>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- 하단 고정 줄 ---------- */

const iconButton = cn(buttonClass("secondary", "icon"), "rounded-button");

export function PlaceDetailActions({
  place,
  meal,
  source,
  origin,
  onAddToPoll,
  onReport,
  onDirectionsLaunched,
}: PlaceDetailProps) {
  const online = useOnlineStatus();
  const named = place.name !== null;
  const fav = useFavorite({
    placeId: place.id,
    placeUrl: place.placeUrl,
    online,
  });
  const directions = useDirections({
    placeId: place.id,
    placeUrl: place.placeUrl,
    name: place.name,
    position: place.position ?? null,
    origin,
    meal,
    source,
    signedIn: fav.loading ? null : fav.signedIn,
    online,
    onLaunched: onDirectionsLaunched,
  });

  const actions: MoreMenuAction[] = [];
  if (named && place.phone) {
    actions.push({
      key: "call",
      label: copy.actions.call,
      icon: Phone,
      href: `tel:${place.phone.replace(/[^0-9+]/g, "")}`,
    });
  }
  actions.push({
    key: "share",
    label: copy.actions.share,
    icon: Share2,
    onSelect: () => void sharePlace(place.name, place.placeUrl),
  });
  if (named && place.name) {
    actions.push({
      key: "naver",
      label: copy.actions.naver,
      icon: ExternalLink,
      href: naverPlaceSearchUrl(place.name, place.position ?? null),
      external: true,
    });
  }
  if (onAddToPoll && isEnabled("pollEntry")) {
    actions.push({
      key: "poll",
      label: copy.actions.addToPoll,
      icon: Vote,
      onSelect: onAddToPoll,
      disabled: !online,
    });
  }
  const report = (kind: ReportKind) => () => {
    if (onReport) onReport(kind);
    else void toast(copy.toasts.reportSoon);
  };
  const reports: MoreMenuAction[] = [
    {
      key: "closed",
      label: copy.actions.reportClosed,
      icon: Flag,
      onSelect: report("closed"),
      disabled: !online,
    },
    {
      key: "price",
      label: copy.actions.reportPrice,
      icon: Flag,
      onSelect: report("price"),
      disabled: !online,
    },
    {
      key: "wrong",
      label: copy.actions.reportWrong,
      icon: Flag,
      onSelect: report("wrong"),
      disabled: !online,
    },
  ];

  let primary: ReactNode;
  if (directions.available && place.name) {
    primary = (
      <button
        type="button"
        onClick={directions.open}
        aria-busy={directions.opening || undefined}
        aria-label={copy.actions.directionsTo(place.name)}
        className={cn(buttonClass("primary"), "min-w-0 flex-1")}
      >
        {directions.opening ? copy.actions.opening : copy.actions.directions}
      </button>
    );
  } else {
    primary = (
      <a
        href={place.placeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonClass("primary"), "min-w-0 flex-1")}
      >
        {copy.actions.kakaoMap}
        <ExternalLink aria-hidden className="size-4" strokeWidth={1.75} />
      </a>
    );
  }

  return (
    <div className="flex gap-2">
      {primary}
      <button
        type="button"
        aria-pressed={fav.on}
        aria-label={copy.actions.favorite}
        aria-disabled={!online || fav.pending || undefined}
        onClick={() => void fav.toggle()}
        className={iconButton}
      >
        <Star
          aria-hidden
          className={cn(
            "size-5 transition-[fill,color] duration-(--lm-duration-fast) motion-reduce:transition-none",
            fav.on ? "fill-foreground text-foreground" : "text-foreground",
          )}
          strokeWidth={1.5}
        />
      </button>
      <PlaceMoreMenu
        actions={actions}
        reports={reports}
        triggerClassName={iconButton}
      />
      <span role="status" className="sr-only">
        {fav.message}
      </span>
      {fav.loginSheet}
    </div>
  );
}

/* ---------- 상태 ---------- */

export function OfflineNote({ className }: { className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 border-y border-border py-3",
        className,
      )}
    >
      <WifiOff
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.5}
      />
      <p className="type-body-sm break-keep">
        {copy.states.offlineTitle}
        <span className="block type-caption text-muted-foreground">
          {copy.states.offlineBody}
        </span>
      </p>
    </div>
  );
}

/** 로딩: 요약과 숫자 3칸, 하단 줄 모양 스켈레톤 */
export function PlaceDetailSkeleton({ className }: { className?: string }) {
  return (
    <LoadingRegion
      label={copy.states.loading}
      className={cn("flex min-h-full flex-col", className)}
    >
      <div className="flex flex-1 flex-col pt-2 pb-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-14 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col">
            <SkeletonLine type="caption" className="w-10" />
            <SkeletonLine type="title" className="w-40" />
          </div>
        </div>
        <SkeletonLine type="body" className="mt-4 w-56" />
        <div className="mt-5 grid grid-cols-[0.8fr_1.3fr_0.9fr] divide-x divide-border">
          {["w-6", "w-20", "w-9"].map((w) => (
            <div
              key={w}
              className="flex flex-col gap-1.5 px-4 first:pl-0 last:pr-0"
            >
              <SkeletonLine type="caption" className="w-7" />
              <Skeleton className={cn("mt-1 h-3.5 rounded-badge", w)} />
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-col border-t border-border">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex h-14 items-center justify-between border-b border-border"
            >
              <SkeletonLine type="label" className="w-12" />
              <SkeletonLine type="caption" className="w-24" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-auto flex gap-2 border-t border-border py-3">
        <Skeleton className="h-12 flex-1 rounded-button" />
        <Skeleton className="size-12 rounded-button" />
        <Skeleton className="size-12 rounded-button" />
      </div>
    </LoadingRegion>
  );
}

/** 오류: 카카오 실패(재시도 1회 뒤). 다시 시도 + 네이버 지도 (PRD 12장) */
export function PlaceDetailError({
  onRetry,
  searchName,
  className,
}: {
  onRetry?: () => void;
  /** 알면 네이버 지도 검색어로 쓴다 */
  searchName?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start pt-6 pb-8", className)}>
      <ErrorState
        title={copy.states.errorTitle}
        body={copy.states.errorBody}
        headingLevel="h2"
        action={
          onRetry ? { label: copy.states.retry, onClick: onRetry } : undefined
        }
      />
      <a
        href={
          searchName ? naverPlaceSearchUrl(searchName, null) : NAVER_MAP_WEB
        }
        target="_blank"
        rel="noopener noreferrer"
        className={cn(textAction, "mt-3")}
      >
        {copy.states.naverMap}
        <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.75} />
      </a>
    </div>
  );
}
