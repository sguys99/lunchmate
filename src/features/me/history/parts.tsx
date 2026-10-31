"use client";
// 나 탭 기록 공용 조각 (T6.13, DESIGN.md 5장 "나 탭"). 시안 A(/design-lab/me/a, design-lab/me/shared.tsx)를 실제 데이터로 옮겼다.
// 장소 그림과 이름(해석 실패 대체 포함), 메타 줄, 내 평가 표시, 버튼 모양, 상태 줄, 오프라인 막기.
//
// 데이터 규칙 (CLAUDE.md 7장, T5.12a): 이름과 카테고리는 카카오 세션 메모리 값이라 없을 수 있다.
//   없으면 그림 대신 점선 원 + 핀, 이름 대신 날짜나 순번(model.ts), 옆에 카카오맵 링크(place_url).
import {
  ExternalLink,
  MapPin as MapPinIcon,
  ThumbsDown,
  ThumbsUp,
  WifiOff,
} from "lucide-react";
import { useCallback, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing, hitArea44 } from "@/components/ui/interaction";
import { toast } from "@/components/ui/lazy-toaster";
import { historyCopy as copy } from "@/copy/history";
import type { CategorySlug } from "@/features/place/categories";
import { CategoryIllustration } from "@/features/place/illustrations";
import type { ResolvedPlace } from "@/features/place/resolve-place-names";
import { kakaoCategorySlug } from "@/features/rec/kakao-category";
import type { KakaoRestaurant } from "@/lib/kakao/local";
import { cn } from "@/lib/utils";

/* ---------- 버튼 ---------- */

export const btn = {
  /** 밑줄 글자 버튼 (터치 44) */
  text: cn(
    "relative inline-flex min-h-11 items-center gap-1.5 type-caption text-foreground underline decoration-border decoration-1 underline-offset-[3px] hover:decoration-foreground aria-disabled:opacity-50",
    focusRing,
  ),
  /** 원형 아이콘 버튼 44 (테두리) */
  round: cn(
    "inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors duration-(--lm-duration-fast) ease-standard hover:bg-muted active:bg-muted aria-disabled:opacity-50 motion-reduce:transition-none",
    focusRing,
  ),
  /** 테두리 없는 아이콘 버튼 44 */
  ghostIcon: cn(
    "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors duration-(--lm-duration-fast) ease-standard hover:bg-muted active:bg-muted aria-disabled:opacity-50 motion-reduce:transition-none",
    focusRing,
  ),
  small: cn(buttonClass("secondary", "sm"), "aria-disabled:opacity-50"),
  outline: buttonClass("secondary"),
};

/**
 * 오프라인 막기: 버튼은 aria-disabled로 두고(포커스는 남김), 누르면 "연결되면 할 수 있습니다" 토스트(g6 6절).
 * guard(fn)은 온라인이면 fn, 오프라인이면 토스트를 띄우는 클릭 처리기를 돌려준다.
 */
export function useOfflineGuard(offline: boolean) {
  return useCallback(
    (fn: () => void) => () => {
      if (offline) {
        void toast(copy.states.offlineToast);
        return;
      }
      fn();
    },
    [offline],
  );
}

/* ---------- 장소 ---------- */

/** 줄 하나가 보여 줄 장소. 이름과 카테고리는 해석됐을 때만 */
export type RowPlace = {
  readonly placeId: string;
  /** 카카오맵 링크(저장된 place_url 또는 id로 만든 링크) */
  readonly link: string;
  readonly name: string | null;
  readonly category: CategorySlug | null;
  readonly kakao: KakaoRestaurant | null;
};

export function toRowPlace(
  placeId: string,
  resolved: ResolvedPlace | undefined,
  fallbackLink: string,
): RowPlace {
  if (resolved?.status === "resolved") {
    return {
      placeId,
      link: resolved.placeUrl,
      name: resolved.place.name,
      category: kakaoCategorySlug(resolved.place.categoryName),
      kakao: resolved.place,
    };
  }
  return {
    placeId,
    link: resolved?.placeUrl ?? fallbackLink,
    name: null,
    category: null,
    kakao: null,
  };
}

/** 카테고리 그림. 이름을 못 찾았으면 점선 원 + 핀(장식) */
export function PlaceGlyph({
  place,
  size = 40,
  pending,
  className,
}: {
  place: RowPlace;
  size?: number;
  /** 이름 해석 중이면 같은 크기의 스켈레톤 원 */
  pending?: boolean;
  className?: string;
}) {
  if (!place.category && pending) {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size }}
        className={cn(
          "inline-block shrink-0 rounded-full bg-skeleton",
          className,
        )}
      />
    );
  }
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
  href,
  label,
  className,
}: {
  href: string;
  /** 스크린 리더용 대상 이름 */
  label: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(btn.text, "text-muted-foreground", className)}
    >
      {copy.unresolved.kakao}
      <span className="sr-only">{copy.unresolved.kakaoSr(label)}</span>
      <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.75} />
    </a>
  );
}

/**
 * 이름 줄. 이름이 있으면 상세를 여는 버튼(D-12 안건 4), 없으면 대체 이름(muted) + 카카오맵 링크.
 * 해석 중(pending)이면 대체 이름 대신 같은 높이의 빈 줄을 둔다(대체 이름이 잠깐 보였다 바뀌지 않게).
 */
export function PlaceName({
  place,
  fallback,
  pending,
  onOpen,
  onPreload,
  className,
}: {
  place: RowPlace;
  fallback: string;
  pending?: boolean;
  onOpen?: (place: RowPlace) => void;
  onPreload?: () => void;
  className?: string;
}) {
  if (place.name) {
    return (
      <button
        type="button"
        aria-label={copy.history.openPlace(place.name)}
        onClick={onOpen ? () => onOpen(place) : undefined}
        onPointerEnter={onPreload}
        onFocus={onPreload}
        className={cn(
          "relative min-h-6 max-w-full truncate text-left type-label hover:underline hover:decoration-border hover:underline-offset-[3px]",
          hitArea44,
          focusRing,
          className,
        )}
      >
        {place.name}
      </button>
    );
  }
  if (pending) {
    return (
      <span
        aria-hidden
        className="my-1 block h-4 w-28 rounded-full bg-skeleton"
      />
    );
  }
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2">
      <span
        className={cn("truncate type-label text-muted-foreground", className)}
      >
        {fallback}
      </span>
      <KakaoLink href={place.link} label={fallback} className="min-h-6" />
    </span>
  );
}

/* ---------- 메타 줄 (문자 구분자 없이 얇은 세로선) ---------- */

export function MetaLine({
  parts,
  className,
}: {
  parts: readonly ReactNode[];
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

/** 내 평가 표시: 👍 / 👎 아이콘 + 읽히는 이름. 안 갔어요, 평가 없음은 글자 */
export function RatingMark({
  rating,
  notVisited,
  withText = false,
  className,
}: {
  rating: "up" | "down" | null;
  notVisited?: boolean;
  withText?: boolean;
  className?: string;
}) {
  if (notVisited || !rating) {
    return (
      <span className={cn("type-caption text-muted-foreground", className)}>
        {notVisited ? copy.rating.notVisited : copy.rating.none}
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

/* ---------- 목록 바닥, 상태 ---------- */

export function MoreButton({
  label,
  onClick,
  busy,
  className,
}: {
  label: string;
  onClick: () => void;
  busy?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={busy ? undefined : onClick}
      aria-disabled={busy || undefined}
      aria-busy={busy || undefined}
      className={cn(
        btn.outline,
        "mt-6 self-stretch aria-disabled:opacity-60",
        className,
      )}
    >
      {label}
    </button>
  );
}

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

/** 오프라인: 세션에 남은 기록을 보이고 위에 한 줄 */
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

/** 목록 위 caption 제목 + 오른쪽 개수 */
export function SectionHead({
  id,
  title,
  count,
}: {
  id: string;
  title: string;
  count?: string;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <h2 id={id} className="type-caption text-muted-foreground">
        {title}
      </h2>
      {count !== undefined ? (
        <span className="type-caption text-muted-foreground tabular-nums">
          {count}
        </span>
      ) : null}
    </div>
  );
}
