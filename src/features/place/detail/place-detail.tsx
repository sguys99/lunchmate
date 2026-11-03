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
import { EmojiText } from "@/components/a11y/emoji-text";
import {
  ExternalLink,
  Flag,
  Phone,
  Share2,
  Star,
  Tag,
  Vote,
  WifiOff,
} from "lucide-react";
import { lazy, Suspense, useRef, useState, type ReactNode } from "react";
import type { PlaceBadge } from "@/components/badges/pick-badges";
import { PlaceBadges } from "@/components/badges/place-badges";
import { ErrorState, LoadingRegion, SkeletonLine } from "@/components/states";
import { buttonClass } from "@/components/ui/button-classes";
import { Skeleton } from "@/components/ui/skeleton";
import { feedbackCopy } from "@/copy/feedback";
import { placeCopy } from "@/copy/place";
import { useLoginPrompt } from "@/features/auth/login-prompt/use-login-prompt";
import {
  MyReviewBlock,
  PublicReviews,
  ResultLine,
  WriteButton,
  type PublicReviewsState,
} from "@/features/feedback/detail-reviews";
import type { FieldKey } from "@/features/feedback/review-form";
import {
  useReviewSheet,
  type ReviewSheetConfig,
} from "@/features/feedback/review-sheet";
import { useMyReviews } from "@/features/feedback/use-my-records";
import {
  DetailMemoTag,
  MemoNameHeader,
  useDetailMemo,
} from "@/features/memo/detail-memo";
import { reasonWithoutWalk } from "@/features/rec/reason";
import { placeKindToDb } from "@/features/report/flow";
import { nowSummaryText } from "@/features/report/flow";
import { useReportSheet } from "@/features/report/report-sheet";
import { reportCopy } from "@/copy/report";
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
import type { PlaceReview } from "../detail-model";
import { usePlaceDeals, usePlaceDetailStats } from "../use-place-stats";
import { CATEGORY_INK } from "../category-ink";
import {
  detailPrice,
  detailThumbs,
  type PlaceDetailPlace,
  type PlaceDetailStats,
} from "../detail-model";
import { CategoryIllustration } from "../illustrations";
import type { DirectionsResult } from "../launch-directions";
import { MenuBoard } from "@/features/menu/menu-board";
import { menuReportsOn } from "@/features/menu/use-place-menus";
import { PlaceMoreMenu, type MoreMenuAction } from "./more-menu";
export { PlaceDetailSkeleton } from "./place-detail-skeleton";
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

// "지금" 행 안 웨이팅, 할인 목록(T6.20~T6.24). 행을 처음 그릴 때 받는다(지도 첫 로드 밖)
const NowPanel = lazy(() =>
  import("@/features/report/now-panel").then((m) => ({ default: m.NowPanel })),
);

export type ReportKind = "closed" | "price" | "wrong";
export type WaitingReportLevel = "walkIn" | "short" | "long";

export type PlaceDetailProps = {
  place: PlaceDetailPlace;
  /**
   * place_id 집계. 넘기지 않으면 본문이 직접 불러온다(T6.14: 집계, 공개 후기, 내 방문, 내 후기, 후기 쓰기).
   * 넘기면(디자인 랩 목업) 그 값만 그리고 후기 쓰기와 내 후기는 두지 않는다.
   */
  stats?: PlaceDetailStats;
  meal: Meal;
  /** 이번 끼니 예산(원). 예산 판정과 가격 눈금의 예산 선 */
  budgetKRW: number;
  /** 방문 후보와 분석 이벤트의 출처 (NAV-04) */
  source: DirectionsSource;
  /** 길찾기 출발지: 사무실 핀 또는 현위치. 모르면 null(앱이 현위치에서 출발) */
  origin: DirectionsOrigin | null;
  /** 이름 제목 수준. 시트 안이면 h2 */
  headingLevel?: "h1" | "h2";
  /** 식당 메모 이름표(T10.15, flags.userPlaceMemo). 서버가 판정해 넘긴다. 없거나 false면 메모를 보이지 않는다 */
  placeMemo?: boolean;
  /** 투표에 추가 (pollEntry 플래그가 켜지고 이 값이 있을 때만 메뉴에 보인다, 7단계) */
  onAddToPoll?: () => void;
  /** 제보 3종 (PLACE-05, 6단계). 없으면 "곧 열립니다" 안내 */
  onReport?: (kind: ReportKind) => void;
  /** 웨이팅 한 탭 제보 (PLACE-07, 6단계) */
  onReportWaiting?: (level: WaitingReportLevel) => void;
  /** 후기 모두 보기 (목업 집계를 넘길 때만) */
  onMoreReviews?: () => void;
  /** 다른 사람 후기 신고 (MOD-01, T6.16 신고 시트). 없으면 "곧 열립니다" 안내 */
  onReportReview?: (review: PlaceReview) => void;
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
  stats: givenStats,
  meal,
  budgetKRW,
  headingLevel = "h2",
  placeMemo = false,
  onReportWaiting,
  onMoreReviews,
  onReportReview,
  className,
}: PlaceDetailProps) {
  const online = useOnlineStatus();
  const live = givenStats === undefined;
  // 식당 메모(T10.15): 실제 상세(목업 집계가 아닌 것)에서만, 로그인 사용자에게만
  const memo = useDetailMemo(place.id, placeMemo && live);
  const memoEditor = {
    placeId: place.id,
    placeUrl: place.placeUrl,
    name: place.name,
    online,
  };
  const detail = usePlaceDetailStats(place.id, { enabled: live });
  const stats = givenStats ?? detail.stats;
  const pending = live && detail.status === "pending";
  const Heading = headingLevel;
  const named = place.name !== null;
  const price = detailPrice(stats, place.category, meal, budgetKRW);
  const thumbs = detailThumbs(stats.thumbs);
  const catLabel = categoryLabel(place.category);
  const reason = place.reason ? reasonWithoutWalk(place.reason) : null;
  const naverUrl = named
    ? naverPlaceSearchUrl(place.name ?? "", place.position ?? null)
    : null;
  // 제보와 신고 질문 시트(T6.15~T6.24). 목업 집계(live false)면 쓰지 않는다
  const report = useReportSheet();
  const deals = usePlaceDeals(place.id, live);
  const reportReview =
    onReportReview ??
    (live
      ? (r: PlaceReview) =>
          report.open({
            kind: "flag",
            target: "review",
            placeId: place.id,
            targetId: r.id,
            quote: r.text,
          })
      : undefined);
  const reviews = useDetailReviews({
    live,
    place,
    price,
    online,
    detail,
    onReportReview: reportReview,
  });

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
      ) : memo.show && !memo.loading && memo.memo ? (
        // 이름을 모를 때 내 메모가 제목 자리로(D-33 B 이름표 상자)
        <MemoNameHeader
          {...memoEditor}
          memo={memo.memo}
          heading={headingLevel}
        />
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
      {/* 이름표 알약(D-33 B): 이름 바로 아래. 이름 대체 상자를 그렸으면 그 안에서 고친다 */}
      {named || !(memo.show && !memo.loading && memo.memo) ? (
        <DetailMemoTag {...memoEditor} state={memo} className="mt-3" />
      ) : null}

      {reason ? (
        <p className="mt-4 type-body-sm break-keep text-muted-foreground">
          <EmojiText text={reason} />
        </p>
      ) : null}
      {stats.myVisit ? (
        <p className="mt-1.5 type-caption break-keep text-muted-foreground">
          <EmojiText
            text={copy.detail.myVisit(
              stats.myVisit.dateLabel,
              stats.myVisit.rating,
            )}
          />
        </p>
      ) : null}

      <CompactNumbers
        walkMinutes={named ? place.walkMinutes : null}
        price={price}
        thumbs={thumbs}
        pending={pending}
        className="mt-5"
      />
      <PlaceBadges badges={badgesOf(stats)} className="mt-4" />
      {/* 메뉴판(T10.16, D-35 C): 실제 상세(목업 집계가 아닌 것)에서만, menuReports 플래그가 켜졌을 때 */}
      {live && menuReportsOn() ? (
        <MenuBoard
          placeId={place.id}
          placeUrl={place.placeUrl}
          name={place.name}
          naverUrl={naverUrl}
          estimateKrw={price.value}
          online={online}
          className="mt-6"
        />
      ) : null}

      {/* 내 후기 (T6.10, D-11 안건 6): 내 방문 기록 아래, 근거 접힘 행 위 */}
      {reviews.mine ? <div className="mt-6">{reviews.mine}</div> : null}

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
          summary={
            reviews.summary ?? copy.reviews.titleCount(stats.reviewTotal)
          }
        >
          {() =>
            reviews.list ?? (
              <ReviewsBlock
                reviews={stats.reviews}
                total={stats.reviewTotal}
                onMore={onMoreReviews}
              />
            )
          }
        </Fold>
        <Fold
          title={copy.now.title}
          summary={
            live
              ? nowSummaryText(stats.waiting, deals.data?.length ?? 0)
              : nowSummary(stats)
          }
        >
          {(open) =>
            live && !onReportWaiting ? (
              <Suspense fallback={<NowPanelSkeleton />}>
                <NowPanel
                  placeId={place.id}
                  waiting={stats.waiting}
                  online={online}
                  active={open}
                  onOpenDeal={(opener) =>
                    report.open(
                      {
                        kind: "deal",
                        placeId: place.id,
                        placeUrl: place.placeUrl,
                      },
                      opener,
                    )
                  }
                  onReportDeal={(deal, opener) =>
                    report.open(
                      {
                        kind: "flag",
                        target: "deal",
                        placeId: place.id,
                        targetId: deal.id,
                        quote: deal.content,
                      },
                      opener,
                    )
                  }
                  onSignedOut={report.promptLogin}
                />
              </Suspense>
            ) : (
              <NowBlock
                stats={stats}
                onReportWaiting={onReportWaiting}
                disabled={!online}
              />
            )
          }
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
      {reviews.sheets}
      {live ? report.sheet : null}
    </div>
  );
}

/* ---------- 후기 (T6.10, T6.14) ---------- */

type Note = "saved" | "savedEdit" | "removed" | null;

/**
 * 상세의 내 후기, 다른 사람 후기, 후기 쓰기 시트를 묶는다. 목업 집계를 넘긴 경우(live false)는 아무것도 하지 않는다.
 * - 내 후기: 이 식당의 내 후기 중 가장 최근 것(본인만 읽는 myReviewsAction). 있으면 "후기 쓰기"는 없다.
 * - 쓰기와 고치기는 같은 시트(D-11). 비로그인은 로그인 유도 시트("review").
 * - 결과 한 줄(남김, 고침, 지움)은 내 후기 자리에 두고 시트가 닫히면 그 줄로 초점을 옮긴다.
 */
function useDetailReviews({
  live,
  place,
  price,
  online,
  detail,
  onReportReview,
}: {
  live: boolean;
  place: PlaceDetailPlace;
  price: ReturnType<typeof detailPrice>;
  online: boolean;
  detail: ReturnType<typeof usePlaceDetailStats>;
  onReportReview?: (review: PlaceReview) => void;
}): {
  mine: ReactNode;
  list: ReactNode;
  summary: string | null;
  sheets: ReactNode;
} {
  const mineQuery = useMyReviews(place.id, live);
  const sheet = useReviewSheet();
  const login = useLoginPrompt();
  const [note, setNote] = useState<Note>(null);
  const noteRef = useRef<HTMLParagraphElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  if (!live) return { mine: null, list: null, summary: null, sheets: null };

  const firstPage = mineQuery.data?.pages[0];
  const signedIn = firstPage ? firstPage.signedIn : null;
  const myReview =
    firstPage && firstPage.signedIn ? (firstPage.reviews[0] ?? null) : null;
  const offline = !online;

  const base: Omit<ReviewSheetConfig, "mode"> = {
    placeId: place.id,
    category: place.name ? place.category : null,
    name: place.name,
    price: { value: price.value, kind: price.estimate ? "estimate" : "report" },
    from: "detail",
    // 저장하면 결과 한 줄로, 그냥 닫으면 연 버튼으로 초점이 돌아간다
    finalFocus: () => noteRef.current ?? openerRef.current,
  };
  const open = (opener: HTMLElement, config: ReviewSheetConfig) => {
    openerRef.current = opener;
    setNote(null);
    sheet.open(config);
  };

  const write = (opener: HTMLElement) => {
    if (signedIn === false) {
      login.prompt("review");
      return;
    }
    open(opener, {
      ...base,
      mode: { kind: "write", placeId: place.id, placeUrl: place.placeUrl },
      onSaved: () => setNote("saved"),
    });
  };
  const edit = (field: FieldKey, opener: HTMLElement) => {
    if (!myReview) return;
    open(opener, {
      ...base,
      mode: { kind: "edit", reviewId: myReview.id, review: myReview },
      focus: field,
      onSaved: () => setNote("savedEdit"),
      onDeleted: () => setNote("removed"),
    });
  };

  const noteText =
    note === "saved"
      ? feedbackCopy.detail.saved
      : note === "savedEdit"
        ? feedbackCopy.sheet.savedEdit
        : note === "removed"
          ? feedbackCopy.detail.removed
          : null;

  let mine: ReactNode = null;
  if (myReview) {
    mine = (
      <div className="flex flex-col gap-1">
        {noteText ? <ResultLine ref={noteRef}>{noteText}</ResultLine> : null}
        <MyReviewBlock
          review={myReview}
          offline={offline}
          onEdit={edit}
          onWriteToday={write}
        />
      </div>
    );
  } else if (noteText) {
    mine = <ResultLine ref={noteRef}>{noteText}</ResultLine>;
  }

  const result = detail.reviews;
  let state: PublicReviewsState;
  if (offline && !result) state = { kind: "offline" };
  else if (detail.reviewsStatus === "error" && !result)
    state = { kind: "error", onRetry: detail.retryReviews };
  else if (!result) state = { kind: "loading" };
  else if (result.status === "login_required")
    state = {
      kind: "login",
      ratingCount: result.ratingCount,
      onLogin: () => login.prompt("review"),
    };
  else
    state = {
      kind: "ok",
      reviews: detail.stats.reviews ?? [],
      hasMore: detail.hasMoreReviews,
      loadingMore: detail.loadingMoreReviews,
      onMore: detail.loadMoreReviews,
    };

  const canWrite = !myReview && signedIn !== null;
  const list = (
    <PublicReviews
      state={state}
      write={
        canWrite ? (
          <WriteButton
            offline={offline}
            onWrite={write}
            onIntent={signedIn ? sheet.preload : undefined}
          />
        ) : null
      }
      onReport={(r) => {
        if (onReportReview) onReportReview(r);
        else void toast(feedbackCopy.detail.reportSoon);
      }}
    />
  );
  const summary =
    result?.status === "login_required"
      ? copy.reviews.titleCount(result.ratingCount)
      : result?.status === "ok"
        ? copy.reviews.titleCount(detail.stats.reviewTotal) +
          (detail.hasMoreReviews ? "+" : "")
        : null;

  return {
    mine,
    list,
    summary,
    sheets: (
      <>
        {sheet.sheet}
        {login.sheet}
      </>
    ),
  };
}

/* ---------- 하단 고정 줄 ---------- */

const iconButton = cn(buttonClass("secondary", "icon"), "rounded-button");

export function PlaceDetailActions({
  place,
  stats: givenStats,
  meal,
  source,
  origin,
  onAddToPoll,
  onReport,
  onDirectionsLaunched,
}: PlaceDetailProps) {
  const online = useOnlineStatus();
  const live = givenStats === undefined;
  const reportSheet = useReportSheet();
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
  // 노출은 부르는 쪽이 정한다: 서버가 판정한 pollEntry가 켜질 때만 onAddToPoll을 넘긴다(T7.35)
  if (onAddToPoll) {
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
    else if (live)
      reportSheet.open({
        kind: "place",
        placeId: place.id,
        placeUrl: place.placeUrl,
        report: placeKindToDb(kind),
      });
    else void toast(copy.toasts.reportSoon);
  };
  const reports: MoreMenuAction[] = [];
  // 할인 정보 알리기는 제보 묶음 맨 위(D-13 진입점)
  if (live && !onReport) {
    reports.push({
      key: "deal",
      label: reportCopy.deal.entry,
      icon: Tag,
      onSelect: () =>
        reportSheet.open({
          kind: "deal",
          placeId: place.id,
          placeUrl: place.placeUrl,
        }),
      disabled: !online,
    });
  }
  reports.push(
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
  );

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
            "size-5 transition-[fill,color] duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
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
      {live ? reportSheet.sheet : null}
    </div>
  );
}

/* ---------- 상태 ---------- */

/** "지금" 행 내용을 받는 동안(웨이팅 문장 + 버튼 3개 자리) */
function NowPanelSkeleton() {
  return (
    <LoadingRegion
      label={copy.states.loading}
      className="flex flex-col gap-2.5"
    >
      <SkeletonLine type="body" className="w-48" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24 rounded-chip" />
        <Skeleton className="h-10 w-28 rounded-chip" />
        <Skeleton className="h-10 w-24 rounded-chip" />
      </div>
    </LoadingRegion>
  );
}

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
