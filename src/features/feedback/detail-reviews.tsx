"use client";
// 식당 상세의 내 후기와 다른 사람 후기 (T6.10, T6.14, FB-06, FB-07, PLACE-03, PLACE-06, MOD-01 진입점, D-11 안건 6, 7, 9).
// 상세 본문(place-detail.tsx)이 쓴다. 홈에서는 상세 시트 청크 안이라 첫 로드 밖이다.
// - 내 후기(C에서): 제목 + "10월 방문, 공개" + 위아래 선 사이 항목 줄 4개(만족, 1인 가격, 태그, 한 줄 후기).
//   줄 전체가 버튼이고 누르면 같은 시트가 "내 후기 수정"으로 그 항목 위치까지 스크롤된 채 열린다. 오프라인이면 aria-disabled.
//   마지막 후기 뒤에 다시 다녀왔으면(길찾기 후보 포함) 또는 마지막 후기가 오늘 이전 방문이면 항목 줄 아래 "오늘 후기 쓰기"
//   글자 버튼(2026-11-01 사용자 결정, todayWriteOffer). 서버(writeFromDetail)가 답 없는 후보가 있으면 그 방문을 평가한다.
// - 다른 사람 후기: 본문 2줄 말줄임 + 아래 caption 닉네임과 방문 월, 그 줄 끝 ⋯(Base UI Menu "신고", A에서). 내 후기에는 ⋯ 없음.
//   비로그인은 목록 대신 "후기 N건은 로그인하면 볼 수 있습니다" + 로그인(사용자 결정, place_reviews는 로그인만).
// - 내가 신고한 후기는 목록에서 빼지 않고 "신고한 후기입니다" + "보기" 한 줄로 가린다(D-13 안건 11).
// - 비공개 후기 글은 이 목록에 오지 않는다(AC-FB-2, DB 보안 함수가 거른다).
import { Menu } from "@base-ui/react/menu";
import {
  Check,
  ChevronRight,
  Flag,
  MoreHorizontal,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { forwardRef, useId, useMemo, useState, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing, hitArea44 } from "@/components/ui/interaction";
import { rowPress } from "@/components/ui/row-press";
import { Skeleton } from "@/components/ui/skeleton";
import { feedbackCopy, reviewTagLabels } from "@/copy/feedback";
import type { PlaceReview } from "@/features/place/detail-model";
import { formatWon } from "@/lib/format";
import { cn } from "@/lib/utils";
import { todayWriteOffer } from "./feedback-target";
import type { MyReview } from "./my-records";
import type { FieldKey } from "./review-form";
import { usePlaceVisits } from "./use-my-records";

const copy = feedbackCopy.detail;

const textButton = cn(
  "inline-flex h-7 w-fit shrink-0 items-center gap-1 rounded-sm px-0.5 type-caption text-muted-foreground underline decoration-border underline-offset-3 hover:text-foreground active:text-foreground aria-disabled:pointer-events-none aria-disabled:opacity-60",
  hitArea44,
  focusRing,
);

/** 결과 한 줄(남김, 고침, 지움). 나타나면 초점을 받는다(누른 시트가 닫히고 돌아올 자리) */
export const ResultLine = forwardRef<
  HTMLParagraphElement,
  { children: ReactNode }
>(function ResultLine({ children }, ref) {
  return (
    <p
      ref={ref}
      tabIndex={-1}
      role="status"
      className="flex min-h-11 items-center gap-2 type-body-sm ease-enter outline-none motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)]"
    >
      <Check
        aria-hidden
        className="size-4 shrink-0 text-success"
        strokeWidth={1.75}
      />
      <span className="break-keep">{children}</span>
    </p>
  );
});

/* ---------- 내 후기 ---------- */

export function MyReviewBlock({
  review,
  offline,
  onEdit,
  onWriteToday,
}: {
  review: MyReview;
  offline: boolean;
  onEdit: (field: FieldKey, opener: HTMLElement) => void;
  /** 다시 다녀온 뒤 새 후기 쓰기(상세 "후기 쓰기"와 같은 시트). 없으면 버튼을 두지 않는다 */
  onWriteToday?: (opener: HTMLElement) => void;
}) {
  const titleId = useId();
  const visits = usePlaceVisits(review.placeId, onWriteToday !== undefined);
  const offer = useMemo(() => {
    const data = visits.data;
    if (!data?.signedIn) return null;
    return todayWriteOffer(data.visits, review, new Date());
  }, [visits.data, review]);
  const month = Number(review.visitedOn.slice(5, 7));
  const rows: {
    key: FieldKey;
    label: string;
    value: string;
    empty: boolean;
  }[] = [
    {
      key: "rating",
      label: copy.rows.rating,
      value: feedbackCopy.ratings[review.rating],
      empty: false,
    },
    {
      key: "price",
      label: copy.rows.price,
      value:
        review.priceKrw === null ? copy.rowEmpty : formatWon(review.priceKrw),
      empty: review.priceKrw === null,
    },
    {
      key: "tags",
      label: copy.rows.tags,
      value:
        review.tags.length === 0
          ? copy.rowEmpty
          : review.tags.map((t) => reviewTagLabels[t]).join(", "),
      empty: review.tags.length === 0,
    },
    {
      key: "body",
      label: copy.rows.body,
      value: review.body ?? copy.rowEmpty,
      empty: !review.body,
    },
  ];
  return (
    <section aria-labelledby={titleId} className="flex flex-col">
      <div className="flex min-h-11 items-baseline justify-between gap-3">
        <h3 id={titleId} className="type-label">
          {copy.mine}
        </h3>
        <p className="type-caption text-muted-foreground tabular-nums">
          {copy.mineMeta(month, review.isPublic)}
        </p>
      </div>
      {review.hidden ? (
        <p className="pb-2 type-caption break-keep text-muted-foreground">
          {copy.mineHidden}
        </p>
      ) : null}
      <ul className="flex flex-col divide-y divide-border border-y border-border">
        {rows.map((row) => (
          <li key={row.key}>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-disabled={offline || undefined}
              onClick={
                offline ? undefined : (e) => onEdit(row.key, e.currentTarget)
              }
              className={cn(
                "flex min-h-14 w-full items-center gap-3 py-3 text-left transition-colors duration-(--lm-duration-fast) ease-standard hover:bg-muted/50 aria-disabled:pointer-events-none aria-disabled:opacity-60 motion-reduce:transition-none",
                focusRing,
                rowPress,
              )}
            >
              <span className="w-20 shrink-0 type-caption text-muted-foreground">
                {row.label}
                <span className="sr-only"> </span>
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate type-body-sm",
                  row.empty ? "text-muted-foreground" : "text-foreground",
                  row.key === "price" && "tabular-nums",
                )}
              >
                {row.value}
              </span>
              <span className="sr-only">, {copy.edit}</span>
              <ChevronRight
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
                strokeWidth={1.5}
              />
            </button>
          </li>
        ))}
      </ul>
      {onWriteToday && offer ? (
        <div className="flex flex-col items-start gap-1 pt-2">
          <button
            type="button"
            aria-haspopup="dialog"
            aria-disabled={offline || undefined}
            onClick={offline ? undefined : (e) => onWriteToday(e.currentTarget)}
            className={textButton}
          >
            {copy.writeToday}
          </button>
          {offline ? (
            <p className="type-caption text-muted-foreground">
              {copy.writeOffline}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/* ---------- 다른 사람 후기 ---------- */

export type PublicReviewsState =
  | { kind: "loading" }
  | { kind: "error"; onRetry: () => void }
  | { kind: "offline" }
  | { kind: "login"; ratingCount: number; onLogin: () => void }
  | {
      kind: "ok";
      reviews: readonly PlaceReview[];
      hasMore: boolean;
      loadingMore: boolean;
      onMore: () => void;
    };

export function PublicReviews({
  state,
  write,
  onReport,
}: {
  state: PublicReviewsState;
  /** "후기 쓰기" 버튼 자리(내 후기가 있으면 null) */
  write: ReactNode;
  onReport: (review: PlaceReview) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {write}
      <ReviewList state={state} onReport={onReport} />
    </div>
  );
}

function ReviewList({
  state,
  onReport,
}: {
  state: PublicReviewsState;
  onReport: (review: PlaceReview) => void;
}) {
  switch (state.kind) {
    case "loading":
      return (
        <div
          role="status"
          aria-busy
          aria-label={copy.listLoading}
          className="flex flex-col gap-4"
        >
          {[0, 1].map((i) => (
            <div key={i} aria-hidden className="flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      );
    case "offline":
      return (
        <p className="type-body-sm text-muted-foreground">{copy.listOffline}</p>
      );
    case "error":
      return (
        <div className="flex flex-col items-start gap-1">
          <p role="alert" className="type-body-sm">
            {copy.listError}
          </p>
          <button type="button" onClick={state.onRetry} className={textButton}>
            {copy.retry}
          </button>
        </div>
      );
    case "login":
      return (
        <div className="flex flex-col items-start gap-1">
          <p className="type-body-sm break-keep text-muted-foreground">
            {copy.loginToRead(state.ratingCount)}
          </p>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={state.onLogin}
            className={textButton}
          >
            {copy.login}
          </button>
        </div>
      );
    case "ok":
      if (state.reviews.length === 0) {
        return (
          <p className="type-body-sm text-muted-foreground">{copy.listEmpty}</p>
        );
      }
      return (
        <div className="flex flex-col gap-2">
          <ul className="flex flex-col divide-y divide-border">
            {state.reviews.map((r) => (
              <PublicReviewItem key={r.id} review={r} onReport={onReport} />
            ))}
          </ul>
          {state.hasMore ? (
            <button
              type="button"
              aria-busy={state.loadingMore || undefined}
              onClick={state.onMore}
              className={textButton}
            >
              {copy.more}
            </button>
          ) : null}
        </div>
      );
  }
}

/**
 * 다른 사람 후기 한 건. 내가 신고한 후기는 그 자리에서 "신고한 후기입니다" + "보기" 한 줄로 가린다
 * (D-13 안건 11). "보기"를 누르면 본문을 연다. 이미 신고했으므로 ⋯ 메뉴는 두지 않는다.
 */
function PublicReviewItem({
  review: r,
  onReport,
}: {
  review: PlaceReview;
  onReport: (review: PlaceReview) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const reported = r.reportedByMe === true;
  if (reported && !revealed) {
    return (
      <li className="flex min-h-11 items-center gap-2 py-3 first:pt-0">
        <p className="min-w-0 type-caption break-keep text-muted-foreground">
          {copy.reportedHidden}
        </p>
        <button
          type="button"
          aria-label={copy.reportedShowLabel(r.nickname)}
          onClick={() => setRevealed(true)}
          className={textButton}
        >
          {copy.reportedShow}
        </button>
      </li>
    );
  }
  return (
    <li className="flex flex-col gap-1 py-3 first:pt-0">
      <p className="line-clamp-2 type-body-sm break-keep">{r.text}</p>
      <div className="-mr-2.5 flex min-h-11 items-center gap-2">
        {r.thumb === "up" ? (
          <ThumbsUp
            aria-hidden
            className="size-3.5 shrink-0 text-muted-foreground"
            strokeWidth={1.5}
          />
        ) : (
          <ThumbsDown
            aria-hidden
            className="size-3.5 shrink-0 text-muted-foreground"
            strokeWidth={1.5}
          />
        )}
        <span className="sr-only">{feedbackCopy.ratings[r.thumb]}</span>
        <span className="min-w-0 truncate type-caption text-foreground">
          {r.nickname}
        </span>
        <span className="shrink-0 type-caption text-muted-foreground tabular-nums">
          {copy.visitMonth(r.visitMonth)}
        </span>
        {reported ? null : <ReviewMenu review={r} onReport={onReport} />}
      </div>
    </li>
  );
}

/** 후기 머리줄 ⋯ → 메뉴 "신고" (D-11 안건 7). 화살표 키, 밖 누르면 닫힘, 닫히면 ⋯로 초점 복귀 */
function ReviewMenu({
  review,
  onReport,
}: {
  review: PlaceReview;
  onReport: (review: PlaceReview) => void;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={copy.menuLabel(review.nickname)}
        className={cn(
          "ml-auto inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted active:text-foreground data-popup-open:bg-muted",
          focusRing,
        )}
      >
        <MoreHorizontal aria-hidden className="size-5" strokeWidth={1.5} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="end"
          sideOffset={4}
          collisionPadding={12}
          className="z-[60] outline-none"
        >
          <Menu.Popup
            className={cn(
              "min-w-40 origin-(--transform-origin) rounded-card border border-border bg-popover p-1.5 text-popover-foreground outline-none",
              "transition-[opacity,translate] duration-(--lm-duration-fast) ease-enter data-ending-style:-translate-y-1 data-ending-style:opacity-0 data-starting-style:-translate-y-1 data-starting-style:opacity-0 motion-reduce:transition-none",
            )}
          >
            <Menu.Item
              onClick={() => onReport(review)}
              className="flex min-h-11 w-full cursor-default items-center gap-3 rounded-lg px-3 text-left type-body-sm text-foreground outline-none select-none data-highlighted:bg-muted"
            >
              <Flag
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
                strokeWidth={1.5}
              />
              {copy.report}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/** "후기 쓰기" 테두리 버튼 (작은 크기). 오프라인이면 끄고 이유 한 줄 */
export function WriteButton({
  offline,
  onWrite,
  onIntent,
}: {
  offline: boolean;
  onWrite: (opener: HTMLElement) => void;
  onIntent?: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-disabled={offline || undefined}
        onPointerEnter={onIntent}
        onFocus={onIntent}
        onClick={offline ? undefined : (e) => onWrite(e.currentTarget)}
        className={buttonClass("secondary", "sm")}
      >
        {copy.write}
      </button>
      {offline ? (
        <p className="type-caption text-muted-foreground">
          {copy.writeOffline}
        </p>
      ) : null}
    </div>
  );
}
