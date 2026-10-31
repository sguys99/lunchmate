"use client";
// 식당 상세 시안 공용 조각 (T5.2). 컨테이너, 행동 버튼, 상태 화면, 후기 머리줄.
// D-10에서 C안을 골라 A, B 코드는 지웠다(CLAUDE.md 6.1-5, 캡처와 비교 문서는 docs/design에 남김). C안 고유 배치는 c 파일에 둔다.
//
// 컨테이너 (모바일)
//   from=map  지도 바텀시트를 끝까지 연 상태. 위에 지도 띠(고정)가 보이고 시트가 그 위로 스크롤된다.
//   from=home 홈 카드 "상세"에서 연 화면. 뒤로 버튼 머리줄 + 본문.
//   두 경우 모두 문서가 스크롤하고, 하단 고정 줄(footer)은 하단 탭 바로 위에 붙는다(홈 D1 행동 줄과 같은 방식).
// 컨테이너 (데스크톱 1024px 이상)
//   좌 상세(최대 460) + 우 지도(이 식당 핀 강조). 앱 셸 ShellSplit과 같은 틀.
import {
  ChevronLeft,
  ExternalLink,
  Phone,
  Share2,
  Star,
  ThumbsDown,
  ThumbsUp,
  Vote,
  WifiOff,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { MapPane, TabBarView } from "@/components/app-shell";
import { ErrorState } from "@/components/states";
import { focusRing, hitArea48 } from "@/components/ui/interaction";
import { placeLabCopy as copy } from "@/copy/design-lab-place";
import { MapLines, MapPin } from "@/features/design-lab/system/b/parts";
import { cn } from "@/lib/utils";
import {
  DETAIL_EMPTY,
  DETAIL_FULL,
  DETAIL_OFFLINE,
  DETAIL_SPARSE,
  MOCK_PLACE_URL,
  NAVER_MAP_SEARCH_URL,
  type DetailReview,
  type PlaceDetail,
} from "./detail-mock";
import type { PlaceFrom, PlaceParams } from "./params";

/* ---------- 상태 → 내용 ---------- */

/** ready: 정상, empty: 후기와 가격 제보 0건, name: 이름 해석 실패(집계는 보임), offline: 세션에 남은 정보 */
export type DetailMode = "ready" | "empty" | "name" | "offline";

export type DetailContent =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "detail"; detail: PlaceDetail; mode: DetailMode };

export function getDetailContent(p: PlaceParams): DetailContent {
  const base = p.data === "sparse" ? DETAIL_SPARSE : DETAIL_FULL;
  switch (p.state) {
    case "loading":
      return { kind: "loading" };
    case "error":
      return p.fail === "name"
        ? { kind: "detail", detail: base, mode: "name" }
        : { kind: "error" };
    case "empty":
      return { kind: "detail", detail: DETAIL_EMPTY, mode: "empty" };
    case "offline":
      return { kind: "detail", detail: DETAIL_OFFLINE, mode: "offline" };
    case "ready":
      return { kind: "detail", detail: base, mode: "ready" };
  }
}

/** 지도 핀과 접근성 이름에 쓸 식당 이름. 이름을 못 찾았으면 null */
export function placeName(content: DetailContent): string | null {
  return content.kind === "detail" && content.mode !== "name"
    ? content.detail.place.name
    : null;
}

/* ---------- 버튼 클래스 ---------- */

export const btn = {
  primary: cn(
    "inline-flex h-12 items-center justify-center gap-2 rounded-button bg-primary px-6 type-label text-primary-foreground transition-[filter,scale] duration-(--lm-duration-fast) ease-standard active:scale-[0.98] active:brightness-95 motion-reduce:transition-none motion-reduce:active:scale-100",
    focusRing,
  ),
  outline: cn(
    "inline-flex h-12 items-center justify-center gap-2 rounded-button border border-border px-5 type-label text-foreground transition-colors duration-(--lm-duration-fast) ease-standard hover:bg-muted active:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-50",
    focusRing,
  ),
  icon: cn(
    "inline-flex size-12 shrink-0 items-center justify-center rounded-button border border-border text-foreground transition-colors duration-(--lm-duration-fast) ease-standard hover:bg-muted active:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-50",
    focusRing,
  ),
  /** 밑줄 글자 버튼 (터치 44) */
  text: cn(
    "relative inline-flex min-h-11 items-center gap-1.5 type-caption text-foreground underline decoration-border decoration-1 underline-offset-[3px] hover:decoration-foreground",
    focusRing,
  ),
  chip: cn(
    "inline-flex h-10 items-center rounded-chip border border-border px-4 type-label text-foreground transition-colors duration-(--lm-duration-fast) ease-standard hover:bg-muted active:bg-muted",
    hitArea48,
    focusRing,
  ),
};

/* ---------- 컨테이너 ---------- */

export function DetailScreen({
  from,
  pinLabel,
  footer,
  tallMap = false,
  children,
}: {
  from: PlaceFrom;
  pinLabel: string | null;
  footer?: ReactNode;
  /** C안 시트 절반 높이: 지도 띠를 크게 */
  tallMap?: boolean;
  children: ReactNode;
}) {
  const tabBar = (
    <TabBarView activeId={from === "map" ? "map" : "today"} preview />
  );
  const column = (
    <div
      className={cn(
        "mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter)",
        "desktop:max-w-(--lm-layout-desktop-list-max-width) desktop:px-10",
      )}
    >
      {children}
      {footer ? (
        <DetailFooter inSheet={from === "map"}>{footer}</DetailFooter>
      ) : null}
    </div>
  );

  const list =
    from === "map" ? (
      <main className="flex flex-1 flex-col">
        <MapStrip label={pinLabel} tall={tallMap} />
        <section
          aria-label={copy.container.sheetLabel}
          className="relative z-[1] -mt-7 flex flex-1 flex-col rounded-t-sheet border-t border-border bg-popover pt-3 desktop:mt-0 desktop:rounded-none desktop:border-0 desktop:bg-background desktop:pt-10"
        >
          <span
            aria-hidden
            className="mx-auto mb-1 h-1 w-9 shrink-0 rounded-full bg-border desktop:hidden"
          />
          <button
            type="button"
            aria-label={copy.container.close}
            className={cn(
              "absolute top-2 right-3 inline-flex size-11 items-center justify-center rounded-button text-muted-foreground hover:bg-muted hover:text-foreground desktop:hidden",
              focusRing,
            )}
          >
            <X aria-hidden className="size-5" strokeWidth={1.5} />
          </button>
          {column}
        </section>
      </main>
    ) : (
      <>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center bg-background px-(--lm-layout-gutter) desktop:px-12">
          <button
            type="button"
            aria-label={copy.container.back}
            className={cn(
              "-ml-2.5 inline-flex size-11 items-center justify-center rounded-button text-foreground hover:bg-muted",
              focusRing,
            )}
          >
            <ChevronLeft
              aria-hidden
              className="size-[1.375rem]"
              strokeWidth={1.5}
            />
          </button>
        </header>
        <main className="flex flex-1 flex-col">{column}</main>
      </>
    );

  return (
    <div className="flex min-h-dvh flex-1 flex-col desktop:grid desktop:grid-cols-(--lm-layout-desktop-columns)">
      <div className="flex min-w-0 flex-1 flex-col desktop:min-h-dvh">
        <div className="flex min-w-0 flex-1 flex-col">{list}</div>
        {tabBar}
      </div>
      <aside
        aria-label={copy.container.mapPin}
        className="hidden desktop:sticky desktop:top-0 desktop:flex desktop:h-dvh desktop:flex-col desktop:self-start"
      >
        <MapPane>
          <MapLines />
          {pinLabel ? <MapPin label={pinLabel} active position={PIN} /> : null}
        </MapPane>
      </aside>
    </div>
  );
}

const PIN = { left: "46%", top: "48%" } as const;

/** 시트 뒤 지도 띠. 고정되어 시트가 그 위로 올라간다 */
function MapStrip({ label, tall }: { label: string | null; tall: boolean }) {
  return (
    <div
      className={cn(
        "sticky top-0 z-0 shrink-0 transition-[height] duration-(--lm-duration-slow) ease-standard motion-reduce:transition-none desktop:hidden",
        tall ? "h-[50dvh]" : "h-28",
      )}
    >
      <MapPane className="h-full min-h-0 border-l-0">
        <MapLines />
        {label ? (
          <MapPin
            label={label}
            active
            position={{ left: "50%", top: tall ? "52%" : "62%" }}
          />
        ) : null}
      </MapPane>
    </div>
  );
}

/** 하단 고정 줄. 하단 탭 바로 위에 붙는다 */
function DetailFooter({
  inSheet,
  children,
}: {
  inSheet: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-[calc(var(--lm-layout-tab-bar-height)+env(safe-area-inset-bottom,0px))] z-[5] -mx-(--lm-layout-gutter) mt-auto border-t border-border px-(--lm-layout-gutter) py-3 desktop:mx-0 desktop:bg-background desktop:px-0",
        inSheet ? "bg-popover" : "bg-background",
      )}
    >
      {children}
    </div>
  );
}

/* ---------- 행동 ---------- */

export type SecondaryAction = {
  key: "favorite" | "call" | "share" | "naver" | "poll";
  icon: LucideIcon;
  label: string;
  longLabel: string;
  href?: string;
  disabled?: boolean;
};

/**
 * 길찾기 밖의 행동 (PLACE-04). 즐겨찾기는 FavoriteToggle이 따로 그린다.
 * 이름을 못 찾았으면(카카오 값 없음) 전화와 네이버 검색을 뺀다. 오프라인이면 서버가 필요한 행동을 끈다.
 */
export function secondaryActions(
  detail: PlaceDetail,
  mode: DetailMode,
  poll: boolean,
): SecondaryAction[] {
  const named = mode !== "name";
  const offline = mode === "offline";
  const list: SecondaryAction[] = [];
  if (named) {
    list.push({
      key: "call",
      icon: Phone,
      label: copy.actions.call,
      longLabel: copy.actions.callLong,
      href: `tel:${detail.place.phone}`,
    });
  }
  list.push({
    key: "share",
    icon: Share2,
    label: copy.actions.share,
    longLabel: copy.actions.share,
  });
  if (named) {
    list.push({
      key: "naver",
      icon: ExternalLink,
      label: copy.actions.naver,
      longLabel: copy.actions.naverLong,
      href: `${NAVER_MAP_SEARCH_URL}${encodeURIComponent(detail.place.name)}`,
    });
  }
  if (poll) {
    list.push({
      key: "poll",
      icon: Vote,
      label: copy.actions.addToPoll,
      longLabel: copy.actions.addToPoll,
      disabled: offline,
    });
  }
  return list;
}

/** 링크면 a, 아니면 button. 바깥 링크는 새 탭 */
export function ActionElement({
  action,
  className,
  children,
  ariaLabel,
}: {
  action: SecondaryAction;
  className: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  if (action.href) {
    const external = action.href.startsWith("http");
    return (
      <a
        href={action.href}
        aria-label={ariaLabel}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={className}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-disabled={action.disabled || undefined}
      className={className}
    >
      {children}
    </button>
  );
}

/** 즐겨찾기 토글 상태. 결과는 sr-only status로 알린다(토스트는 실제 화면에서) */
export function useFavorite(initial = false) {
  const [on, setOn] = useState(initial);
  const [message, setMessage] = useState("");
  return {
    on,
    message,
    toggle: () => {
      setOn((v) => {
        setMessage(v ? copy.toasts.favoriteOff : copy.toasts.favoriteOn);
        return !v;
      });
    },
  };
}

export type Favorite = ReturnType<typeof useFavorite>;

export function FavoriteIcon({ on }: { on: boolean }) {
  return (
    <Star
      aria-hidden
      className={cn(
        "size-5 transition-[fill,color] duration-(--lm-duration-fast) motion-reduce:transition-none",
        on ? "fill-foreground text-foreground" : "text-foreground",
      )}
      strokeWidth={1.5}
    />
  );
}

export function FavoriteStatus({ fav }: { fav: Favorite }) {
  return (
    <span role="status" className="sr-only">
      {fav.message}
    </span>
  );
}

/** 주 버튼. 이름을 못 찾았으면 좌표도 없어 길찾기 대신 카카오맵 링크가 주 버튼이 된다 */
export function PrimaryAction({
  detail,
  mode,
  className,
}: {
  detail: PlaceDetail;
  mode: DetailMode;
  className?: string;
}) {
  if (mode === "name") {
    return (
      <a
        href={MOCK_PLACE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(btn.primary, className)}
      >
        {copy.actions.kakaoMap}
        <ExternalLink aria-hidden className="size-4" strokeWidth={1.75} />
      </a>
    );
  }
  return (
    <button
      type="button"
      aria-label={copy.actions.directionsTo(detail.place.name)}
      className={cn(btn.primary, className)}
    >
      {copy.actions.directions}
    </button>
  );
}

/* ---------- 후기 머리줄 ---------- */

export function ReviewByline({
  review,
  className,
}: {
  review: DetailReview;
  className?: string;
}) {
  const Thumb = review.thumb === "up" ? ThumbsUp : ThumbsDown;
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted type-caption text-muted-foreground"
      >
        {review.nickname.slice(0, 1)}
      </span>
      <span className="min-w-0 truncate type-label">{review.nickname}</span>
      <span className="shrink-0 type-caption text-muted-foreground">
        {copy.reviews.visitMonth(review.visitMonth)}
      </span>
      <span className="ml-auto inline-flex shrink-0 items-center text-muted-foreground">
        <Thumb aria-hidden className="size-4" strokeWidth={1.5} />
        <span className="sr-only">
          {review.thumb === "up"
            ? copy.reviews.thumbUp
            : copy.reviews.thumbDown}
        </span>
      </span>
    </div>
  );
}

/* ---------- 상태 화면 ---------- */

/** 카카오 실패(재시도 1회 뒤): 다시 시도 + 네이버 지도 링크 (PRD 12장, T5.24) */
export function DetailError({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-start pt-6", className)}>
      <ErrorState
        title={copy.states.error.title}
        body={copy.states.error.body}
        headingLevel="h1"
        action={{ label: copy.states.error.retry }}
      />
      <a
        href={NAVER_MAP_SEARCH_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(btn.text, "mt-3")}
      >
        {copy.states.error.naver}
        <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.75} />
      </a>
    </div>
  );
}

/** 오프라인: 세션에 남은 정보를 보이고 위에 한 줄로 알린다 */
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
        {copy.states.offline.title}
        <span className="block type-caption text-muted-foreground">
          {copy.states.offline.body}
        </span>
      </p>
    </div>
  );
}

/** 이름을 못 찾았을 때 제목 자리 (T5.12a 3단계) */
export function NameUnresolved({
  as: Heading = "h1",
  className,
}: {
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Heading className="type-heading break-keep text-muted-foreground">
        {copy.states.name.title}
      </Heading>
      <p className="type-body-sm break-keep text-muted-foreground">
        {copy.states.name.body}
      </p>
    </div>
  );
}

/** 후기를 불러오지 못한 자리(오프라인) */
export function ReviewsOffline() {
  return (
    <p className="type-body-sm text-muted-foreground">{copy.reviews.offline}</p>
  );
}

/** 첫 프레임 뒤 true. 막대, 점 같은 CSS 전환을 0에서 시작하게 한다(축소 모드면 CSS가 전환을 끈다) */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return mounted;
}
