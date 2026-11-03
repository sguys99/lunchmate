"use client";
// 식당 메모 시안 공용 조각 (T10.15, D-32). 세 안이 같은 메모 모델(장소 하나에 메모 하나, 40자, 본인만)을 쓰고
// 쓰는 곳, 보이는 곳, 이름 대체 모양만 다르다.
//
// 데이터 규칙 (CLAUDE.md 7장, D-32)
// - 입력란은 늘 빈 칸에서 시작한다. 카카오 장소명을 미리 채우거나 "이름 붙여 넣기" 같은 버튼을 두지 않는다.
//   자리표시자도 장소명이 아닌 일반 예시("예: 깍두기가 맛있는 곳")다.
// - 메모는 우리 DB 값(본인만)이라 카카오 이름과 따로 온다. 로딩 상태는 메모 자리만 스켈레톤이다.
// - 저장은 목업: 0.6초 뒤 성공(ready, empty), 실패(error: fail=save|banned|limit). 오프라인은 고치기 aria-disabled.
import { ExternalLink, MoreHorizontal, Star, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MapPane, ShellSplit } from "@/components/app-shell/app-shell";
import { TabBarView } from "@/components/app-shell/tab-bar";
import { PlaceBadges } from "@/components/badges/place-badges";
import { buttonClass } from "@/components/ui/button-classes";
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerHandle,
  DrawerPopup,
  DrawerPortal,
  DrawerTitle,
  DrawerViewport,
} from "@/components/ui/drawer";
import { focusRing } from "@/components/ui/interaction";
import { MEMO_MAX, memoLabCopy } from "@/copy/design-lab-memo";
import { useDesignPortalContainer } from "@/features/design-lab/system/design-scope";
import { PlaceGlyph, SectionHead, type RowPlace } from "@/features/me/history/parts";
import type { CategorySlug } from "@/features/place/categories";
import { categoryLabel } from "@/features/place/categories";
import { CATEGORY_INK } from "@/features/place/category-ink";
import { detailThumbs, type DetailPrice } from "@/features/place/detail-model";
import { CompactNumbers } from "@/features/place/detail/parts";
import { CategoryIllustration } from "@/features/place/illustrations";
import { cn } from "@/lib/utils";
import type { MemoFail, MemoParams } from "./params";

export const copy = memoLabCopy;

/* ---------- 메모 모델 ---------- */

/** 앞뒤 공백을 지우고 줄바꿈과 연속 공백을 한 칸으로 (서버 zod와 같은 규칙으로 둘 예정) */
export function normalizeMemo(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** 글자 수(한글 한 글자 = 1, 이모지 한 개 = 1에 가깝게 코드 포인트로 센다) */
export function memoLength(text: string): number {
  return [...normalizeMemo(text)].length;
}

/** 빈 메모는 저장이 아니라 지우기다. 상한을 넘으면 저장할 수 없다 */
export function memoCheck(text: string): "empty" | "tooLong" | "ok" {
  const n = memoLength(text);
  if (n === 0) return "empty";
  if (n > MEMO_MAX) return "tooLong";
  return "ok";
}

export type SaveStatus = "idle" | "saving" | "saved" | "removed" | MemoFail;

/** 메모 하나의 쓰기 상태. initial은 DB에 있던 메모(없으면 null). 입력란은 늘 사용자가 쓴 글에서 시작한다 */
export function useMemoDraft(p: MemoParams, initial: string | null) {
  const [memo, setMemo] = useState<string | null>(p.state === "empty" ? null : initial);
  const [text, setText] = useState(p.state === "empty" ? "" : (initial ?? ""));
  const [editing, setEditing] = useState(p.edit);
  const [status, setStatus] = useState<SaveStatus>(p.state === "error" ? p.fail : "idle");
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );
  const offline = p.state === "offline";
  const loading = p.state === "loading";
  const check = memoCheck(text);
  const failed = status === "save" || status === "banned" || status === "limit";
  const canSave =
    !offline && status !== "saving" && status !== "limit" && check !== "tooLong" &&
    (check === "ok" || memo !== null);

  function save() {
    if (!canSave) return;
    setStatus("saving");
    timer.current = window.setTimeout(() => {
      if (p.state === "error") {
        setStatus(p.fail);
        return;
      }
      const next = check === "empty" ? null : normalizeMemo(text);
      setMemo(next);
      setText(next ?? "");
      setEditing(false);
      setStatus(next ? "saved" : "removed");
    }, 600);
  }

  function remove() {
    if (offline) return;
    setText("");
    setMemo(null);
    setEditing(false);
    setStatus("removed");
  }

  function start() {
    if (offline) return;
    setText(memo ?? "");
    setStatus("idle");
    setEditing(true);
  }

  function cancel() {
    setText(memo ?? "");
    setStatus("idle");
    setEditing(false);
  }

  return {
    memo,
    text,
    setText,
    editing,
    status,
    failed,
    offline,
    loading,
    check,
    canSave,
    length: memoLength(text),
    save,
    remove,
    start,
    cancel,
  };
}
export type MemoDraft = ReturnType<typeof useMemoDraft>;

/* ---------- 목업 데이터 (이름은 design-lab/mock의 지어낸 값) ---------- */

export const DETAIL_PLACE = {
  id: "1840235701",
  name: "정담국밥",
  category: "gukbap" as CategorySlug,
  walkMinutes: 4,
  reason: "지난주 👍한 국밥",
  memo: "깍두기가 맛있는 곳, 12시 전에 가기",
};

const PRICE: DetailPrice = {
  value: 9000,
  estimate: false,
  reportCount: 7,
  range: null,
  reports: [],
  withinBudget: true,
};
const THUMBS = detailThumbs({ up: 20, down: 3 });

export type FavoriteMock = {
  placeId: string;
  /** null이면 이름 해석 실패(카카오 장애 또는 매칭 실패) */
  name: string | null;
  category: CategorySlug | null;
  memo: string | null;
  savedOn: string;
};

export const FAVORITES: readonly FavoriteMock[] = [
  { placeId: "1840235701", name: "정담국밥", category: "gukbap", memo: DETAIL_PLACE.memo, savedOn: "10월 22일" },
  { placeId: "1840235702", name: "하루미 식당", category: "ilsik", memo: "연어덮밥은 수요일에만", savedOn: "10월 18일" },
  { placeId: "1840235703", name: "소담밥상", category: "hansik", memo: null, savedOn: "10월 15일" },
  { placeId: "1840235704", name: null, category: null, memo: "비 오는 날 칼국수", savedOn: "10월 9일" },
  { placeId: "1840235705", name: null, category: null, memo: null, savedOn: "10월 2일" },
];

export function kakaoLink(placeId: string): string {
  return `https://place.map.kakao.com/${placeId}`;
}

export function rowPlace(f: FavoriteMock): RowPlace {
  return { placeId: f.placeId, link: kakaoLink(f.placeId), name: f.name, category: f.category, kakao: null };
}

/* ---------- 입력 ---------- */

/** 한 줄 메모 입력. 빈 칸에서 시작하고 자동 완성, 맞춤법 제안을 끈다. 붙여 넣기 버튼은 두지 않는다 */
export function MemoInput({
  draft,
  label = copy.memo.label,
  labelHidden = false,
  autoFocus,
  onEnter,
  className,
}: {
  draft: MemoDraft;
  label?: string;
  labelHidden?: boolean;
  autoFocus?: boolean;
  onEnter?: () => void;
  className?: string;
}) {
  const id = useId();
  const countId = `${id}-count`;
  const over = draft.check === "tooLong";
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className={labelHidden ? "sr-only" : "type-label"}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          autoComplete="off"
          autoCorrect="off"
          enterKeyHint="done"
          autoFocus={autoFocus}
          aria-describedby={countId}
          aria-invalid={over || draft.status === "banned" || undefined}
          readOnly={draft.offline}
          placeholder={copy.memo.placeholder}
          value={draft.text}
          onChange={(e) => draft.setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onEnter?.();
            }
          }}
          className={cn(
            "block h-12 w-full rounded-input border border-input bg-card pr-16 pl-4 type-body text-foreground outline-none placeholder:text-muted-foreground",
            "transition-[border-color] duration-(--lm-duration-fast) ease-standard focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid motion-reduce:transition-none",
            (over || draft.status === "banned") && "border-destructive",
          )}
        />
        <span
          id={countId}
          className={cn(
            "pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 type-caption tabular-nums",
            over ? "text-destructive" : "text-muted-foreground",
          )}
        >
          <span aria-hidden>{copy.memo.count(draft.length, MEMO_MAX)}</span>
          <span className="sr-only">{copy.memo.countLabel(draft.length, MEMO_MAX)}</span>
        </span>
      </div>
    </div>
  );
}

/** 입력 아래 한 줄: 길이 초과, 저장 실패, 금칙어, 한도, 오프라인 */
export function MemoNote({ draft, className }: { draft: MemoDraft; className?: string }) {
  const text = draft.offline
    ? copy.states.offline
    : draft.check === "tooLong"
      ? copy.memo.tooLong(MEMO_MAX)
      : draft.status === "save"
        ? copy.states.saveFailed
        : draft.status === "banned"
          ? copy.states.banned
          : draft.status === "limit"
            ? copy.states.limit
            : null;
  if (!text) return null;
  return (
    <p
      role={draft.offline ? "status" : "alert"}
      className={cn(
        "type-caption break-keep",
        draft.offline ? "text-muted-foreground" : "text-destructive",
        className,
      )}
    >
      {text}
    </p>
  );
}

/** 저장 결과 한 줄(스크린 리더에도 읽힘). 4px 위로 페이드 */
export function SavedLine({ draft, className }: { draft: MemoDraft; className?: string }) {
  const text = draft.status === "saved" ? copy.memo.saved : draft.status === "removed" ? copy.memo.removed : "";
  return (
    <span
      role="status"
      className={cn(
        "type-caption text-muted-foreground",
        text && "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:[animation-duration:var(--lm-duration-slow)]",
        !text && "sr-only",
        className,
      )}
    >
      {text}
    </span>
  );
}

export function saveLabel(draft: MemoDraft): string {
  if (draft.status === "saving") return copy.memo.saving;
  if (draft.failed && draft.status !== "limit") return copy.states.retry;
  return copy.memo.save;
}

/* ---------- 틀 ---------- */

/** 홈과 나 탭 목업 틀(하단 탭 포함, 데스크톱은 우 지도) */
export function ShellFrame({
  tab,
  children,
}: {
  tab: "today" | "me";
  children: ReactNode;
}) {
  return (
    <ShellSplit
      list={
        <main className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-6 pb-6 desktop:max-w-(--lm-layout-desktop-list-max-width) desktop:px-10 desktop:pt-10">
          {children}
        </main>
      }
      map={<MapPane />}
      tabBar={<TabBarView activeId={tab} preview />}
    />
  );
}

/**
 * 상세 시트 정지 화면(홈 "상세"로 끝까지 연 높이). 모바일은 위 12px 딤 아래 시트 면, 데스크톱은 좌 칸 상세 + 우 지도.
 * 실제 구현은 PlaceDetailSheet(Base UI Drawer)이고, 시안은 캡처를 위해 열린 모습을 그대로 그린다.
 */
export function DetailFrame({
  children,
  footer,
  label,
}: {
  children: ReactNode;
  footer: ReactNode;
  label: string;
}) {
  return (
    <ShellSplit
      list={
        <div className="flex min-h-dvh flex-1 flex-col bg-muted desktop:bg-background">
          <section
            aria-label={label}
            className="mt-3 flex flex-1 flex-col rounded-t-sheet border-t border-border bg-popover desktop:mt-0 desktop:rounded-none desktop:border-t-0 desktop:bg-background"
          >
            <div className="flex items-center justify-between px-6 pt-2 desktop:px-10 desktop:pt-8">
              <span aria-hidden className="mx-auto mt-1 h-1 w-9 rounded-full bg-border desktop:hidden" />
            </div>
            <div className="flex justify-end px-4 desktop:px-8">
              <span
                role="img"
                aria-label={copy.detail.close}
                className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground"
              >
                <X aria-hidden className="size-5" strokeWidth={1.5} />
              </span>
            </div>
            <div className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-6 desktop:max-w-(--lm-layout-desktop-list-max-width) desktop:px-10">
              {children}
            </div>
            <div className="sticky bottom-0 z-[5] mt-auto border-t border-border bg-popover py-3 desktop:bg-background">
              <div className="mx-auto w-full max-w-(--lm-layout-max-width) px-6 desktop:max-w-(--lm-layout-desktop-list-max-width) desktop:px-10">
                {footer}
              </div>
            </div>
          </section>
        </div>
      }
      map={<MapPane />}
    />
  );
}

/** 상세 요약 머리: 그림 + 카테고리 + 이름. nameSlot이 있으면 이름 자리를 바꾼다(장애 대체) */
export function DetailHeader({
  eyebrow,
  nameSlot,
  after,
  unresolved = false,
}: {
  eyebrow?: ReactNode;
  nameSlot?: ReactNode;
  after?: ReactNode;
  unresolved?: boolean;
}) {
  const cat = categoryLabel(DETAIL_PLACE.category);
  return (
    <header className="flex items-center gap-3">
      {unresolved ? null : (
        <CategoryIllustration slug={DETAIL_PLACE.category} size={56} className="-ml-1 shrink-0" />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className={cn("flex min-w-0 items-center gap-2 type-caption", CATEGORY_INK[DETAIL_PLACE.category])}>
          {unresolved ? null : <span className="shrink-0">{cat}</span>}
          {eyebrow}
        </span>
        {nameSlot ?? (
          <h2 className="type-title text-balance break-keep">{DETAIL_PLACE.name}</h2>
        )}
      </div>
      {after}
    </header>
  );
}

/** 요약 아래 공통: 이유 한 줄, 내 방문 한 줄, 숫자 3칸, 배지. slot은 내 방문 줄 다음(A안 메모 줄 자리) */
export function DetailBody({
  slotAfterVisit,
  unresolved = false,
}: {
  slotAfterVisit?: ReactNode;
  unresolved?: boolean;
}) {
  return (
    <>
      {/* 이유는 추천 계산(카카오 값 포함) 결과라 이름을 모르면 없다 */}
      {unresolved ? null : (
        <p className="mt-4 type-body-sm break-keep text-muted-foreground">{DETAIL_PLACE.reason}</p>
      )}
      <p className={cn(unresolved ? "mt-4" : "mt-1.5", "type-caption break-keep text-muted-foreground")}>{copy.detail.myVisit}</p>
      {slotAfterVisit}
      <CompactNumbers
        walkMinutes={unresolved ? null : DETAIL_PLACE.walkMinutes}
        price={PRICE}
        thumbs={THUMBS}
        className="mt-5"
      />
      <PlaceBadges badges={[{ kind: "waiting", level: "short", minutesAgo: 12 }]} className="mt-4" />
      <ul aria-hidden className="mt-6 flex flex-col border-t border-border">
        {copy.detail.folds.map((t) => (
          <li key={t} className="flex min-h-14 items-center border-b border-border type-label">
            {t}
          </li>
        ))}
      </ul>
    </>
  );
}

/** 하단 고정 줄: 길찾기(유일한 올리브 면) + 즐겨찾기 + 더 보기 */
export function DetailFooter({
  favorite = true,
  onFavorite,
  unresolved = false,
  offline = false,
}: {
  favorite?: boolean;
  onFavorite?: () => void;
  unresolved?: boolean;
  offline?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {unresolved ? (
        <a
          href={kakaoLink(DETAIL_PLACE.id)}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonClass("primary"), "flex-1 gap-2")}
        >
          <ExternalLink aria-hidden className="size-4" strokeWidth={1.75} />
          {copy.fallback.kakaoMap}
        </a>
      ) : (
        <span className={cn(buttonClass("primary"), "flex-1")}>{copy.detail.directions}</span>
      )}
      <button
        type="button"
        aria-pressed={favorite}
        aria-label={copy.detail.favorite(DETAIL_PLACE.name)}
        aria-disabled={offline || undefined}
        onClick={offline ? undefined : onFavorite}
        className={cn(buttonClass("secondary", "icon"), "rounded-full")}
      >
        <Star
          aria-hidden
          className={cn(
            "size-5 transition-[fill,color] duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
            favorite ? "fill-foreground text-foreground" : "text-muted-foreground",
          )}
          strokeWidth={1.5}
        />
      </button>
      <span
        role="img"
        aria-label={copy.detail.more}
        className={cn(buttonClass("secondary", "icon"), "rounded-full")}
      >
        <MoreHorizontal aria-hidden className="size-5" strokeWidth={1.5} />
      </span>
    </div>
  );
}

/** 상세 위 오프라인 안내 한 줄(상세 시트 규칙) */
export function OfflineLine({ className }: { className?: string }) {
  return (
    <p role="status" className={cn("type-caption break-keep text-muted-foreground", className)}>
      {copy.states.offline}
    </p>
  );
}

/* ---------- 홈 큰 카드 ---------- */

/** 오늘의 한 곳 큰 카드(D-25 압축 치수). eyebrowEnd는 "오늘의 한 곳" 줄 끝(C안 메모), extraBadge는 배지 줄(B안) */
export function HomeBigCard({
  eyebrowEnd,
  badges,
  loadingSlot,
}: {
  eyebrowEnd?: ReactNode;
  badges?: ReactNode;
  loadingSlot?: ReactNode;
}) {
  const cat = categoryLabel(DETAIL_PLACE.category);
  return (
    <article className="relative overflow-hidden rounded-card border border-border bg-card p-5">
      <div className="flex gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex min-w-0 items-center gap-2 type-caption text-muted-foreground">
            <span className="shrink-0">{copy.home.eyebrow}</span>
            <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
            <span className={cn("shrink-0", CATEGORY_INK[DETAIL_PLACE.category])}>{cat}</span>
            {eyebrowEnd}
          </span>
          <h2 className="mt-2 type-title break-keep">{DETAIL_PLACE.name}</h2>
        </div>
        <CategoryIllustration slug={DETAIL_PLACE.category} size={80} className="-mt-1 -mr-2 shrink-0" />
      </div>
      <p className="mt-2 type-body break-keep">{DETAIL_PLACE.reason}</p>
      <div className="mt-3 flex min-h-6 items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {loadingSlot}
          {badges ?? <PlaceBadges badges={[{ kind: "waiting", level: "short", minutesAgo: 12 }, { kind: "deal" }]} />}
        </div>
        <span className="shrink-0 type-caption underline decoration-border underline-offset-[3px]">{copy.home.detail}</span>
      </div>
      <CompactNumbers walkMinutes={DETAIL_PLACE.walkMinutes} price={PRICE} thumbs={THUMBS} className="mt-3" />
    </article>
  );
}

/** 홈 머리 + 큰 카드 + 대안 두 줄 + 행동 줄 (목업) */
export function HomeMock({ card, below }: { card: ReactNode; below?: ReactNode }) {
  return (
    <>
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="type-heading font-heading">{copy.home.title}</h1>
        <span className="type-caption text-muted-foreground">{copy.home.date}</span>
      </header>
      <div className="mt-3">{card}</div>
      {below ?? (
        <>
          <p className="mt-3 type-caption text-muted-foreground">{copy.home.alternatives}</p>
          <ul className="mt-2 flex flex-col divide-y divide-border rounded-card border border-border bg-card">
            {(
              [
                ["하루미 식당", "ilsik", 8, 78],
                ["소담밥상", "hansik", 5, 91],
              ] as const
            ).map(([name, cat, walk, up]) => (
              <li key={name} className="flex min-h-12 items-center gap-3 px-4 py-2">
                <CategoryIllustration slug={cat} size={28} />
                <span className="min-w-0 flex-1 truncate type-label">{name}</span>
                <span className="flex items-center gap-2 type-caption text-muted-foreground tabular-nums">
                  <span>{walk}분</span>
                  <span aria-hidden className="h-3 w-px bg-border" />
                  <span>{up}%</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <span className={cn(buttonClass("primary"), "flex-1")}>{copy.home.directions}</span>
            <span className={buttonClass("secondary")}>{copy.home.justPick}</span>
          </div>
        </>
      )}
    </>
  );
}

/* ---------- 나 탭 즐겨찾기 ---------- */

export function MeHeader() {
  return (
    <>
      <header className="flex min-w-0 flex-col gap-2 pt-4">
        <p className="truncate type-caption text-muted-foreground">{copy.me.greeting}</p>
        <h1 className="type-title break-keep text-foreground">{copy.me.title}</h1>
      </header>
      <div
        role="tablist"
        aria-label={copy.me.tabsLabel}
        className="relative mt-6 mb-4 grid grid-cols-3 border-b border-border"
      >
        {copy.me.tabs.map((t, i) => (
          <span
            key={t}
            role="tab"
            aria-selected={i === 1}
            className={cn("flex h-12 items-center justify-center type-label", i === 1 ? "text-foreground" : "text-muted-foreground")}
          >
            {t}
          </span>
        ))}
        <span aria-hidden className="absolute bottom-[-1px] left-1/3 h-px w-1/3 bg-foreground" />
      </div>
    </>
  );
}

/** 즐겨찾기 목록 틀. head는 SectionHead 오른쪽(C안 이름표 정리) */
export function FavoritesSection({
  headEnd,
  children,
}: {
  headEnd?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="memo-fav" className="flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <SectionHead id="memo-fav" title={copy.me.favorites} count={copy.me.count(FAVORITES.length)} />
        </div>
        {headEnd}
      </div>
      <ul aria-labelledby="memo-fav" className="flex flex-col border-t border-border">
        {children}
      </ul>
    </section>
  );
}

/** 즐겨찾기 줄 틀: 그림 + 가운데(제목, 둘째 줄) + 별 */
export function FavRow({
  item,
  title,
  sub,
  end,
}: {
  item: FavoriteMock;
  title: ReactNode;
  sub?: ReactNode;
  end?: ReactNode;
}) {
  return (
    <li className="flex min-h-18 items-center gap-4 border-b border-border py-3">
      <PlaceGlyph place={rowPlace(item)} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {title}
        {sub}
      </div>
      {end ?? (
        <span
          role="img"
          aria-label={copy.me.toggle(item.name ?? item.memo ?? copy.fallback.saved(1))}
          className="-mr-2.5 inline-flex size-11 items-center justify-center"
        >
          <Star aria-hidden className="size-5 fill-foreground text-foreground" strokeWidth={1.5} />
        </span>
      )}
    </li>
  );
}

/** 카카오맵 링크(이름 미해결 줄의 둘째 줄) */
export function KakaoLink({ placeId, target }: { placeId: string; target: string }) {
  return (
    <a
      href={kakaoLink(placeId)}
      target="_blank"
      rel="noreferrer"
      className={cn("inline-flex min-h-6 w-fit items-center gap-1 type-caption text-muted-foreground underline decoration-border underline-offset-[3px]", focusRing)}
    >
      {copy.fallback.kakaoMap}
      <span className="sr-only">{target}</span>
      <ExternalLink aria-hidden className="size-3" strokeWidth={1.75} />
    </a>
  );
}

/* ---------- 작은 시트 (B안) ---------- */

export function MemoSheet({
  open,
  onOpenChange,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const container = useDesignPortalContainer();
  if (!container) return null;
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPortal container={container}>
        <DrawerBackdrop className="z-[60]" />
        <DrawerViewport className="z-[70] min-[64rem]:items-center min-[64rem]:p-8">
          <DrawerPopup
            className={cn(
              "border-t border-border data-ending-style:duration-(--lm-duration-fast) data-ending-style:ease-exit",
              "min-[64rem]:max-w-md min-[64rem]:rounded-card min-[64rem]:border min-[64rem]:shadow-none",
              "min-[64rem]:transition-[transform,opacity] min-[64rem]:data-ending-style:[transform:translateY(0.5rem)] min-[64rem]:data-ending-style:opacity-0 min-[64rem]:data-starting-style:[transform:translateY(0.5rem)] min-[64rem]:data-starting-style:opacity-0",
            )}
          >
            <DrawerHandle className="mt-3 mb-0 h-1 w-9 min-[64rem]:hidden" />
            <div className="flex shrink-0 items-center gap-2 px-7 pt-3 pb-1 max-[23.75rem]:px-5 min-[64rem]:pt-6">
              <DrawerTitle className="min-w-0 flex-1 type-heading break-keep outline-none">
                {copy.memo.sheetTitle}
              </DrawerTitle>
              <DrawerClose
                aria-label={copy.memo.close}
                className={cn(
                  "-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted active:text-foreground",
                  focusRing,
                )}
              >
                <X aria-hidden className="size-5" strokeWidth={1.5} />
              </DrawerClose>
            </div>
            <div className="px-7 pt-2 pb-5 max-[23.75rem]:px-5">{children}</div>
            {footer ? (
              <div className="shrink-0 border-t border-border bg-popover px-7 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] max-[23.75rem]:px-5 min-[64rem]:pb-5">
                {footer}
              </div>
            ) : null}
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  );
}
