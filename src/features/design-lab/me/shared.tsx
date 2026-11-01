"use client";
// 나 탭 시안 공용 조각 (T6.2). 화면 틀, 장소 표시(이름 해석 실패 포함), 기록 줄, 방문 확인,
// 즐겨찾기, 다시 안 갈 곳, 내 후기, 설정 묶음, 상태 화면. 시안 고유 배치는 a, b, c 파일에 둔다.
//
// 데이터 규칙 (CLAUDE.md 7장, T5.12a): 이름과 카테고리는 카카오 세션 메모리 값이라 null일 수 있다.
//   null이면 그림 대신 중립 원, 이름 대신 날짜나 순번, 옆에 카카오맵 링크(place_url).
// 틀: 앱 셸 ShellSplit(좌 리스트 + 우 지도, 하단 탭은 좌 칸 아래). 하단 탭은 '나' 활성 미리보기.
import {
  ChevronLeft,
  ExternalLink,
  Globe,
  Lock,
  MapPin as MapPinIcon,
  Star,
  ThumbsDown,
  ThumbsUp,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { MapPane, ShellSplit, TabBarView } from "@/components/app-shell";
import { ErrorState } from "@/components/states";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing, hitArea44 } from "@/components/ui/interaction";
import { meLabCopy as copy } from "@/copy/design-lab-me";
import { meCopy } from "@/copy/me";
import { MapLines, MapPin } from "@/features/design-lab/system/b/parts";
import { DisplaySettings } from "@/features/me/display-settings";
import { SettingsLinkRow, SettingsSection } from "@/features/me/parts";
import { CategoryIllustration } from "@/features/place/illustrations";
import { formatWon } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  weekdayOf,
  type MyReview,
  type PlaceRef,
  type Rating,
  type SavedPlace,
  type Visit,
  type Ymd,
} from "./mock";

/* ---------- 날짜 문구 ---------- */

export function md(date: Ymd): string {
  return copy.date.md(date.m, date.d);
}

export function mdw(date: Ymd): string {
  return copy.date.mdw(date.m, date.d, copy.weekday[weekdayOf(date)]!);
}

/* ---------- 버튼 ---------- */

export const btn = {
  /** 밑줄 글자 버튼 (터치 44) */
  text: cn(
    "relative inline-flex min-h-11 items-center gap-1.5 type-caption text-foreground underline decoration-border decoration-1 underline-offset-[3px] hover:decoration-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50",
    focusRing,
  ),
  /** 원형 아이콘 버튼 44 (테두리) */
  round: cn(
    "inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors duration-(--lm-duration-fast) ease-standard hover:bg-muted active:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-50 motion-reduce:transition-none",
    focusRing,
  ),
  /** 테두리 없는 아이콘 버튼 44 */
  ghostIcon: cn(
    "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors duration-(--lm-duration-fast) ease-standard hover:bg-muted active:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-50 motion-reduce:transition-none",
    focusRing,
  ),
  small: cn(buttonClass("secondary", "sm"), "aria-disabled:opacity-50"),
  outline: buttonClass("secondary"),
};

/* ---------- 화면 틀 ---------- */

/**
 * 나 탭 화면. 모바일: 본문 칼럼 + 하단 탭. 데스크톱: 좌 칼럼(하단 탭 포함) + 우 side(기본 빈 지도).
 * 하위 화면(view)도 같은 틀이다(탭 안 화면이라 하단 탭이 남는다).
 */
export function MeScreen({
  side,
  children,
  className,
}: {
  side?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <ShellSplit
      className="min-h-dvh"
      list={
        <main className="flex min-w-0 flex-1 flex-col">
          <div
            className={cn(
              "mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-10 pb-12 desktop:max-w-(--lm-layout-desktop-list-max-width) desktop:px-10 desktop:pt-14",
              className,
            )}
          >
            {children}
          </div>
        </main>
      }
      map={side}
      tabBar={<TabBarView activeId="me" preview />}
    />
  );
}

/** 머리줄: (뒤로) + eyebrow + 세리프 제목 + 오른쪽 자리 */
export function MeHeader({
  title = copy.title,
  eyebrow,
  backHref,
  action,
}: {
  title?: string;
  eyebrow?: string;
  backHref?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4">
      {backHref ? (
        <Link
          href={backHref}
          aria-label={copy.header.back}
          className={cn(btn.ghostIcon, "-ml-2.5 self-start")}
        >
          <ChevronLeft
            aria-hidden
            className="size-[1.375rem]"
            strokeWidth={1.5}
          />
        </Link>
      ) : null}
      <div className="flex items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          {eyebrow ? (
            <p className="type-caption text-muted-foreground">{eyebrow}</p>
          ) : null}
          <h1 className="type-title break-keep">{title}</h1>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}

/** 섹션 제목 줄: caption 제목 + 오른쪽 개수나 링크 */
export function SectionHead({
  title,
  id,
  aside,
  as: Heading = "h2",
  className,
}: {
  title: string;
  id?: string;
  aside?: ReactNode;
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-11 items-center justify-between gap-4",
        className,
      )}
    >
      <Heading id={id} className="type-caption text-muted-foreground">
        {title}
      </Heading>
      {aside}
    </div>
  );
}

/* ---------- 장소 ---------- */

/** 카테고리 그림. 이름을 못 찾았으면 중립 원 + 핀(장식) */
export function PlaceGlyph({
  place,
  size = 40,
  className,
}: {
  place: PlaceRef;
  size?: number;
  className?: string;
}) {
  if (place.category) {
    return (
      <CategoryIllustration
        slug={place.category}
        size={size}
        className={cn("shrink-0", className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-input text-muted-foreground",
        className,
      )}
    >
      <MapPinIcon className="size-4" strokeWidth={1.5} />
    </span>
  );
}

/** 카카오맵 링크 (이름 해석 실패 대체) */
export function KakaoLink({
  place,
  label,
  className,
}: {
  place: PlaceRef;
  /** 스크린 리더용 대상 이름 */
  label: string;
  className?: string;
}) {
  return (
    <a
      href={place.placeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(btn.text, "text-muted-foreground", className)}
    >
      {copy.unresolved.kakaoShort}
      <span className="sr-only">{copy.unresolved.kakaoSr(label)}</span>
      <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.75} />
    </a>
  );
}

function visitTitle(visit: Visit): string {
  return (
    visit.place.name ??
    copy.unresolved.visit(md(visit.date), copy.meal[visit.meal])
  );
}

/** 이름 줄. 이름이 있으면 상세로 가는 버튼, 없으면 대체 이름(muted) + 카카오맵 링크 */
export function PlaceName({
  place,
  fallback,
  className,
  size = "label",
}: {
  place: PlaceRef;
  fallback: string;
  className?: string;
  size?: "label" | "heading";
}) {
  const text = size === "heading" ? "type-heading" : "type-label";
  if (place.name) {
    return (
      <button
        type="button"
        aria-label={copy.history.openPlace(place.name)}
        className={cn(
          "relative min-h-6 truncate text-left",
          text,
          "hover:underline hover:decoration-border hover:underline-offset-[3px]",
          hitArea44,
          focusRing,
          className,
        )}
      >
        {place.name}
      </button>
    );
  }
  return (
    <span
      className={cn("flex min-w-0 flex-wrap items-center gap-x-2", className)}
    >
      <span className={cn("truncate text-muted-foreground", text)}>
        {fallback}
      </span>
      <KakaoLink place={place} label={fallback} className="min-h-6" />
    </span>
  );
}

/* ---------- 메타 줄 (문자 구분자 없이 얇은 세로선) ---------- */

export function MetaLine({
  parts,
  className,
}: {
  parts: ReactNode[];
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-2 type-caption text-muted-foreground",
        className,
      )}
    >
      {parts.map((p, i) => (
        <span key={i} className="inline-flex items-center gap-2">
          {i > 0 ? (
            <>
              <span aria-hidden className="h-3 w-px bg-border" />
              <span className="sr-only">, </span>
            </>
          ) : null}
          {p}
        </span>
      ))}
    </span>
  );
}

/** 내 평가 표시: 👍 / 👎 아이콘 + 읽히는 이름. 없으면 글자 */
export function RatingMark({
  rating,
  notVisited,
  withText = false,
  className,
}: {
  rating: Rating | null;
  notVisited?: boolean;
  withText?: boolean;
  className?: string;
}) {
  if (notVisited) {
    return (
      <span className={cn("type-caption text-muted-foreground", className)}>
        {copy.rating.notVisited}
      </span>
    );
  }
  if (!rating) {
    return (
      <span className={cn("type-caption text-muted-foreground", className)}>
        {copy.rating.none}
      </span>
    );
  }
  const Icon = rating === "up" ? ThumbsUp : ThumbsDown;
  const label = copy.rating[rating];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 type-caption",
        rating === "up" ? "text-foreground" : "text-muted-foreground",
        className,
      )}
    >
      <Icon aria-hidden className="size-4" strokeWidth={1.5} />
      {withText ? label : <span className="sr-only">{label}</span>}
    </span>
  );
}

/* ---------- 방문 확인 (status candidate) ---------- */

type VisitAnswer = Rating | "no";

/** 방문 후보 답 상태. 화면 안에서만(실제는 visits.status, feedback 저장) */
export function useVisitAnswers() {
  const [answers, setAnswers] = useState<Record<string, VisitAnswer>>({});
  return {
    get: (id: string) => answers[id],
    set: (id: string, a: VisitAnswer) =>
      setAnswers((prev) => ({ ...prev, [id]: a })),
  };
}

type VisitAnswers = ReturnType<typeof useVisitAnswers>;

/** 답을 반영한 상태와 평가 */
function effectiveVisit(visit: Visit, answers: VisitAnswers): Visit {
  const a = answers.get(visit.id);
  if (visit.status !== "candidate" || !a) return visit;
  return a === "no"
    ? { ...visit, status: "not_visited", rating: null }
    : { ...visit, status: "visited", rating: a };
}

/** "다녀오셨나요?" 한 줄: 👍 👎 원형 버튼 + "안 갔어요" 글자 버튼 (FB-01과 같은 세 답, 3개 이하) */
function ConfirmVisit({
  visit,
  answers,
  disabled,
  className,
}: {
  visit: Visit;
  answers: VisitAnswers;
  disabled?: boolean;
  className?: string;
}) {
  const answer = answers.get(visit.id);
  const name = visitTitle(visit);
  if (answer) {
    return (
      <p
        role="status"
        className={cn(
          "animate-in type-caption text-muted-foreground duration-(--lm-duration-base) fade-in motion-reduce:animate-none",
          className,
        )}
      >
        {answer === "no" ? copy.confirm.thanksNo : copy.confirm.thanks}
      </p>
    );
  }
  const dis = disabled || undefined;
  return (
    <div
      role="group"
      aria-label={copy.confirm.ask(name)}
      className={cn("flex items-center gap-2", className)}
    >
      <span className="mr-auto type-body-sm">{copy.confirm.title}</span>
      <button
        type="button"
        aria-label={copy.confirm.up}
        aria-disabled={dis}
        onClick={dis ? undefined : () => answers.set(visit.id, "up")}
        className={btn.round}
      >
        <ThumbsUp aria-hidden className="size-[1.125rem]" strokeWidth={1.5} />
      </button>
      <button
        type="button"
        aria-label={copy.confirm.down}
        aria-disabled={dis}
        onClick={dis ? undefined : () => answers.set(visit.id, "down")}
        className={btn.round}
      >
        <ThumbsDown aria-hidden className="size-[1.125rem]" strokeWidth={1.5} />
      </button>
      <button
        type="button"
        aria-disabled={dis}
        onClick={dis ? undefined : () => answers.set(visit.id, "no")}
        className={cn(btn.text, "ml-1")}
      >
        {copy.confirm.no}
      </button>
    </div>
  );
}

/* ---------- 기록 줄 ---------- */

/**
 * 방문 한 줄. 72px 이상, 아래 1px 선.
 * date: column(왼쪽 날짜 칸, A) / meta(메타 줄 앞, C) / none(B 날짜 상세)
 */
export function VisitRow({
  visit: raw,
  answers,
  date = "meta",
  disabled,
  glyph = 40,
  sameDayAsPrev = false,
  className,
}: {
  /** 바로 위 줄과 같은 날이면 날짜 칸을 비운다(A) */
  sameDayAsPrev?: boolean;
  visit: Visit;
  answers: VisitAnswers;
  date?: "column" | "meta" | "none";
  disabled?: boolean;
  glyph?: number;
  className?: string;
}) {
  const visit = effectiveVisit(raw, answers);
  const pending = raw.status === "candidate";
  const notVisited = visit.status === "not_visited";
  const meta: ReactNode[] = [];
  // 이름을 못 찾으면 대체 이름에 날짜와 끼니가 이미 들어 있다
  if (visit.place.name) {
    if (date === "meta") meta.push(md(visit.date));
    meta.push(copy.meal[visit.meal]);
  }
  meta.push(copy.sourceLong[visit.source]);
  return (
    <li
      className={cn(
        "flex flex-col gap-2 border-b border-border py-3",
        className,
      )}
    >
      <div className="flex min-h-12 items-center gap-4">
        {date === "column" ? (
          <span className="flex w-8 shrink-0 flex-col items-center">
            <span className={cn(sameDayAsPrev && "sr-only")}>
              <span className="block type-numeric-md tabular-nums">
                {visit.date.d}
              </span>
              <span className="block text-center type-caption text-muted-foreground">
                {copy.weekday[weekdayOf(visit.date)]}
              </span>
            </span>
          </span>
        ) : null}
        <PlaceGlyph
          place={visit.place}
          size={glyph}
          className={cn(notVisited && "opacity-50")}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <PlaceName
            place={visit.place}
            fallback={visitTitle(visit)}
            className={cn(notVisited && "text-muted-foreground")}
          />
          <MetaLine parts={meta} />
        </div>
        {pending && !answers.get(raw.id) ? (
          <span className="shrink-0 rounded-badge border border-dashed border-input px-2 py-0.5 type-caption text-muted-foreground">
            {copy.calendar.pendingMark}
          </span>
        ) : (
          <RatingMark
            rating={visit.rating}
            notVisited={notVisited}
            className="shrink-0"
          />
        )}
      </div>
      {pending ? (
        <ConfirmVisit
          visit={raw}
          answers={answers}
          disabled={disabled}
          className={date === "column" ? "pl-12" : undefined}
        />
      ) : null}
    </li>
  );
}

/* ---------- 즐겨찾기, 다시 안 갈 곳 (HIS-02) ---------- */

function savedTitle(item: SavedPlace, index: number): string {
  return item.place.name ?? copy.unresolved.saved(index + 1);
}

/** 즐겨찾기 줄: 별 토글(aria-pressed). 끈 줄은 남겨 바로 되돌릴 수 있게 한다 */
export function FavoriteRow({
  item,
  index,
  disabled,
}: {
  item: SavedPlace;
  index: number;
  disabled?: boolean;
}) {
  const [on, setOn] = useState(true);
  const [message, setMessage] = useState("");
  const title = savedTitle(item, index);
  return (
    <li className="flex min-h-18 items-center gap-4 border-b border-border py-3">
      <PlaceGlyph place={item.place} className={cn(!on && "opacity-50")} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <PlaceName
          place={item.place}
          fallback={title}
          className={cn(!on && "text-muted-foreground")}
        />
        <span className="type-caption text-muted-foreground">
          {item.lastVisit
            ? copy.places.lastVisit(md(item.lastVisit))
            : copy.places.noVisit}
        </span>
      </div>
      <button
        type="button"
        aria-label={copy.places.favoriteOn(title)}
        aria-pressed={on}
        aria-disabled={disabled || undefined}
        onClick={
          disabled
            ? undefined
            : () => {
                setMessage(
                  on ? copy.places.favoriteRemoved : copy.places.favoriteAdded,
                );
                setOn(!on);
              }
        }
        className={btn.ghostIcon}
      >
        <Star
          aria-hidden
          className={cn(
            "size-5 transition-[fill,color] duration-(--lm-duration-fast) motion-reduce:transition-none",
            on ? "fill-foreground text-foreground" : "text-muted-foreground",
          )}
          strokeWidth={1.5}
        />
      </button>
      <span role="status" className="sr-only">
        {message}
      </span>
    </li>
  );
}

/** 다시 안 갈 곳 줄: "해제" → 한 줄 결과 + 되돌리기 */
export function BlockRow({
  item,
  index,
  disabled,
}: {
  item: SavedPlace;
  index: number;
  disabled?: boolean;
}) {
  const [released, setReleased] = useState(false);
  const title = savedTitle(item, index);
  return (
    <li className="flex min-h-18 items-center gap-4 border-b border-border py-3">
      <PlaceGlyph place={item.place} className={cn(released && "opacity-50")} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <PlaceName
          place={item.place}
          fallback={title}
          className={cn(released && "text-muted-foreground")}
        />
        {released ? (
          <span
            role="status"
            className="animate-in type-caption text-muted-foreground duration-(--lm-duration-base) fade-in motion-reduce:animate-none"
          >
            {copy.places.unblocked}
          </span>
        ) : (
          <span className="type-caption text-muted-foreground">
            {copy.places.blockedOn(md(item.savedOn))}
          </span>
        )}
      </div>
      {released ? (
        <button
          type="button"
          onClick={() => setReleased(false)}
          className={cn(btn.text, "shrink-0")}
        >
          {copy.places.undo}
        </button>
      ) : (
        <button
          type="button"
          aria-label={copy.places.unblockLabel(title)}
          aria-disabled={disabled || undefined}
          onClick={disabled ? undefined : () => setReleased(true)}
          className={cn(btn.small, "shrink-0")}
        >
          {copy.places.unblock}
        </button>
      )}
    </li>
  );
}

/** 목록 + 더 보기. limit 뒤는 버튼으로 연다 */
function useMore(initial: boolean) {
  const [more, setMore] = useState(initial);
  return { more, open: () => setMore(true) };
}

export function MoreButton({
  label = copy.places.more,
  onClick,
  className,
}: {
  label?: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(btn.outline, "mt-4 self-stretch", className)}
    >
      {label}
    </button>
  );
}

export function FavoriteList({
  items,
  limit,
  initialMore,
  disabled,
  labelledBy,
}: {
  items: readonly SavedPlace[];
  limit: number;
  initialMore: boolean;
  disabled?: boolean;
  labelledBy?: string;
}) {
  const { more, open } = useMore(initialMore);
  if (items.length === 0) {
    return (
      <p className="border-y border-border py-5 type-body-sm break-keep text-muted-foreground">
        {copy.places.favoritesEmpty}
      </p>
    );
  }
  const shown = more ? items : items.slice(0, limit);
  return (
    <div className="flex flex-col">
      <ul
        aria-labelledby={labelledBy}
        className="flex flex-col border-t border-border"
      >
        {shown.map((item, i) => (
          <FavoriteRow
            key={item.place.placeId}
            item={item}
            index={i}
            disabled={disabled}
          />
        ))}
      </ul>
      {!more && items.length > limit ? <MoreButton onClick={open} /> : null}
    </div>
  );
}

export function BlockList({
  items,
  disabled,
  labelledBy,
  note = true,
}: {
  items: readonly SavedPlace[];
  disabled?: boolean;
  labelledBy?: string;
  note?: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="border-y border-border py-5 type-body-sm text-muted-foreground">
        {copy.places.blocklistEmpty}
      </p>
    );
  }
  return (
    <div className="flex flex-col">
      {note ? (
        <p className="pb-3 type-body-sm break-keep text-muted-foreground">
          {copy.places.blockNote}
        </p>
      ) : null}
      <ul
        aria-labelledby={labelledBy}
        className="flex flex-col border-t border-border"
      >
        {items.map((item, i) => (
          <BlockRow
            key={item.place.placeId}
            item={item}
            index={i}
            disabled={disabled}
          />
        ))}
      </ul>
    </div>
  );
}

/* ---------- 내 후기 (HIS-03, FB-07) ---------- */

function reviewTitle(review: MyReview): string {
  return review.place.name ?? copy.unresolved.review(md(review.date));
}

/** 후기 한 건: 이름, 날짜 / 평가, 가격, 태그 / 글 2줄 / 공개 여부 + 수정, 삭제(그 자리 확인) */
export function ReviewItem({
  review,
  disabled,
}: {
  review: MyReview;
  disabled?: boolean;
}) {
  const [phase, setPhase] = useState<"idle" | "confirm" | "deleted">("idle");
  const askId = useId();
  const title = reviewTitle(review);
  if (phase === "deleted") {
    return (
      <li className="border-b border-border py-4">
        <p
          role="status"
          className="animate-in type-body-sm text-muted-foreground duration-(--lm-duration-base) fade-in motion-reduce:animate-none"
        >
          {copy.reviews.deleted}
        </p>
      </li>
    );
  }
  const Privacy = review.isPublic ? Globe : Lock;
  return (
    <li className="flex flex-col gap-2 border-b border-border py-4">
      <div className="flex items-center gap-3">
        <PlaceGlyph place={review.place} size={32} />
        <PlaceName
          place={review.place}
          fallback={title}
          className="min-w-0 flex-1"
        />
        <span className="shrink-0 type-caption text-muted-foreground tabular-nums">
          {md(review.date)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pl-11">
        <RatingMark rating={review.rating} withText />
        {review.priceKRW !== null ? (
          <span className="type-caption tabular-nums">
            {copy.reviews.price(formatWon(review.priceKRW))}
          </span>
        ) : null}
        {review.tags.map((t) => (
          <span
            key={t}
            className="rounded-badge border border-input px-2 py-0.5 type-caption"
          >
            {t}
          </span>
        ))}
      </div>
      <p
        className={cn(
          "line-clamp-2 pl-11 type-body-sm break-keep",
          !review.text && "text-muted-foreground",
        )}
      >
        {review.text ?? copy.reviews.noText}
      </p>
      <div className="flex items-center gap-2 pl-11">
        <span className="mr-auto inline-flex items-center gap-1.5 type-caption text-muted-foreground">
          <Privacy aria-hidden className="size-3.5" strokeWidth={1.75} />
          {review.isPublic ? copy.reviews.public : copy.reviews.private}
        </span>
        <button
          type="button"
          aria-label={copy.reviews.editLabel(title)}
          aria-disabled={disabled || undefined}
          className={btn.text}
        >
          {copy.reviews.edit}
        </button>
        <button
          type="button"
          aria-label={copy.reviews.deleteLabel(title)}
          aria-disabled={disabled || undefined}
          aria-expanded={phase === "confirm"}
          aria-controls={askId}
          onClick={disabled ? undefined : () => setPhase("confirm")}
          className={cn(btn.text, "ml-2")}
        >
          {copy.reviews.delete}
        </button>
      </div>
      {phase === "confirm" ? (
        <div
          id={askId}
          role="group"
          aria-label={copy.reviews.deleteAsk}
          className="ml-11 flex animate-in flex-col gap-3 rounded-card border border-border bg-card p-4 duration-(--lm-duration-base) fade-in motion-reduce:animate-none"
        >
          <p className="type-body-sm break-keep">
            {copy.reviews.deleteAsk}
            <span className="block type-caption text-muted-foreground">
              {copy.reviews.deleteBody}
            </span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPhase("deleted")}
              className={buttonClass("destructive", "sm")}
            >
              {copy.reviews.deleteConfirm}
            </button>
            <button
              type="button"
              onClick={() => setPhase("idle")}
              className={buttonClass("ghost", "sm")}
            >
              {copy.reviews.cancel}
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function ReviewList({
  reviews,
  limit,
  initialMore,
  disabled,
  labelledBy,
}: {
  reviews: readonly MyReview[];
  limit: number;
  initialMore: boolean;
  disabled?: boolean;
  labelledBy?: string;
}) {
  const { more, open } = useMore(initialMore);
  if (reviews.length === 0) {
    return (
      <p className="border-y border-border py-5 type-body-sm break-keep text-muted-foreground">
        {copy.reviews.empty}
      </p>
    );
  }
  const shown = more ? reviews : reviews.slice(0, limit);
  return (
    <div className="flex flex-col">
      <ul
        aria-labelledby={labelledBy}
        className="flex flex-col border-t border-border"
      >
        {shown.map((r) => (
          <ReviewItem key={r.id} review={r} disabled={disabled} />
        ))}
      </ul>
      {!more && reviews.length > limit ? <MoreButton onClick={open} /> : null}
      <p className="mt-4 flex items-start gap-2 type-caption break-keep text-muted-foreground">
        <Lock
          aria-hidden
          className="mt-0.5 size-3.5 shrink-0"
          strokeWidth={1.75}
        />
        {copy.reviews.privateHint}
      </p>
    </div>
  );
}

/* ---------- 설정 묶음 (4단계 화면으로) ---------- */

/** 지금 /me 첫 화면의 설정 줄을 그대로 옮긴 묶음. 화면 설정은 하위 화면 하나로 접는다(안건) */
export function SettingsBlock({ className }: { className?: string }) {
  const rows = meCopy.rows;
  return (
    <div className={cn("flex flex-col gap-10", className)}>
      <SettingsSection title={copy.settings.title}>
        <SettingsLinkRow
          href="/me/offices"
          label={rows.offices}
          value={copy.settings.officeValue}
        />
        <SettingsLinkRow
          href="/me/budget"
          label={rows.budget}
          value={copy.settings.budgetValue}
        />
        <SettingsLinkRow
          href="/me/avoid"
          label={rows.avoid}
          value={copy.settings.avoidValue}
        />
        <SettingsLinkRow
          href="/me/craving"
          label={rows.craving}
          value={copy.settings.cravingValue}
        />
        <SettingsLinkRow
          href="/me"
          label={copy.settings.display}
          value={copy.settings.displayValue}
        />
        <SettingsLinkRow
          href="/me/account"
          label={copy.settings.account}
          value={copy.nickname}
        />
      </SettingsSection>
      <SettingsSection title={copy.settings.legal}>
        <SettingsLinkRow href="/terms" label={rows.terms} external />
        <SettingsLinkRow href="/privacy" label={rows.privacy} external />
      </SettingsSection>
    </div>
  );
}

/* ---------- 데스크톱 오른쪽 지도 ---------- */

export function SideMap({
  places,
  activeId,
}: {
  places: readonly PlaceRef[];
  activeId?: string | null;
}) {
  const seen = new Set<string>();
  const pins = places.filter((p) => {
    if (!p.name || seen.has(p.placeId)) return false;
    seen.add(p.placeId);
    return true;
  });
  return (
    <MapPane>
      <MapLines />
      {pins.map((p) => (
        <MapPin
          key={p.placeId}
          label={p.name!}
          active={p.placeId === activeId}
          position={p.pin}
        />
      ))}
    </MapPane>
  );
}

/* ---------- 상태 ---------- */

/** 이름 해석이 모두 실패했을 때 위 한 줄 */
export function NamesFailNote({ className }: { className?: string }) {
  return (
    <p
      role="status"
      className={cn(
        "border-y border-border py-3 type-body-sm break-keep text-muted-foreground",
        className,
      )}
    >
      {copy.unresolved.note}
    </p>
  );
}

/** 오프라인: 세션에 남은 기록을 보이고 위에 한 줄. 해제, 수정, 답하기는 aria-disabled */
export function OfflineBanner({ className }: { className?: string }) {
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
        {copy.states.offline.title}
        <span className="block type-caption text-muted-foreground">
          {copy.states.offline.body}
        </span>
      </p>
    </div>
  );
}

export function MeError({ className }: { className?: string }) {
  return (
    <ErrorState
      className={className}
      title={copy.states.error.title}
      body={copy.states.error.body}
      action={{}}
    />
  );
}

/**
 * 첫 방문 빈 상태: 그릇 세 개가 점선 위에 놓인 그림 + 쌓이는 방법 3단계 + 오늘 추천으로(화면의 유일한 primary).
 * 그림은 실제 카테고리 일러스트(icon 변형)라 번들 증가가 없다.
 */
export function FirstVisit({
  className,
  headingLevel = "h2",
}: {
  className?: string;
  headingLevel?: "h2" | "h3";
}) {
  const H = headingLevel;
  return (
    <section
      aria-labelledby="me-first-visit"
      className={cn(
        "flex animate-in flex-col duration-(--lm-duration-slow) fade-in motion-reduce:animate-none",
        className,
      )}
    >
      <div aria-hidden className="relative flex h-16 items-center gap-6">
        <span className="absolute top-1/2 right-0 left-0 border-t border-dashed border-input" />
        <span className="relative rounded-full bg-background">
          <CategoryIllustration slug="hansik" size={56} />
        </span>
        <span className="relative rounded-full bg-background">
          <CategoryIllustration slug="gukbap" size={56} />
        </span>
        <span className="relative rounded-full bg-background">
          <CategoryIllustration slug="salad" size={56} />
        </span>
      </div>
      <H id="me-first-visit" className="mt-6 type-heading break-keep">
        {copy.states.empty.title}
      </H>
      <p className="mt-2 type-body-sm break-keep text-muted-foreground">
        {copy.states.empty.body}
      </p>
      <ol className="mt-5 flex flex-col gap-3">
        {copy.states.empty.steps.map((s, i) => (
          <li
            key={s}
            className="flex items-start gap-3 type-body-sm break-keep"
          >
            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border type-caption tabular-nums">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
      <p className="mt-6 type-body-sm">{copy.states.empty.ask}</p>
      <Link
        href="/today"
        className={cn(buttonClass("primary"), "mt-3 self-start")}
      >
        {copy.states.empty.cta}
      </Link>
    </section>
  );
}

/**
 * 로그인 꺼짐 둘러보기 (AUTH-07): 안내 + 오늘 추천으로(보조) + 시안 미리보기(흐리게, 보조 기술에서 숨김) + 화면 설정.
 * 지금 /me ComingSoon과 같은 말투. 미리보기는 "로그인하면 이렇게 쌓인다"를 보여 주는 정적 그림이다.
 */
export function AuthOffBlock({ preview }: { preview: ReactNode }) {
  return (
    <div className="flex flex-col">
      <h2 className="type-heading break-keep">{copy.states.authOff.title}</h2>
      <p className="mt-2 type-body-sm break-keep text-muted-foreground">
        {copy.states.authOff.body}
      </p>
      <Link href="/today" className={cn(btn.outline, "mt-5 self-start")}>
        {copy.states.authOff.cta}
      </Link>
      <figure className="mt-10 flex flex-col gap-3">
        <figcaption className="type-caption text-muted-foreground">
          {copy.states.authOff.preview}
        </figcaption>
        <div
          aria-hidden
          inert
          className="pointer-events-none rounded-card border border-dashed border-input p-5 opacity-60 select-none"
        >
          {preview}
        </div>
      </figure>
      <div className="mt-12">
        <DisplaySettings title={copy.states.authOff.displayTitle} />
      </div>
    </div>
  );
}
