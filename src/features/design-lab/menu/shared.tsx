"use client";
// 메뉴 제보 시안 공용 조각 (T10.16b, D-34). 세 안이 같은 메뉴 모델(식당별 메뉴 제보 집계: 메뉴별 가격 중앙값, 제보 수)을 쓰고
// 보이는 곳(카드, 상세)과 남기는 모양(피드백 시트, 알려주기 시트)만 다르다.
//
// 데이터 규칙 (CLAUDE.md 7장, PRD 6.6B)
// - 메뉴 이름 칸은 늘 빈 칸에서 시작한다. 카카오 장소명이나 카테고리 이름을 미리 채우지 않는다.
//   자리표시자는 일반 예시("예: 김치찌개")다. 이미 제보된 메뉴 칩은 우리 DB 집계라 미리 보여도 된다.
// - 메뉴 집계는 우리 DB 값이라 카카오 이름과 따로 온다. 로딩 상태는 메뉴 자리만 스켈레톤이다.
// - 저장은 목업: 0.6초 뒤 성공(ready, empty), 실패(error: fail=save|banned|limit). 오프라인은 남기기 aria-disabled.
// - 추천 점수에 쓰지 않는다. 카드의 대표 메뉴는 표시만 한다.
import { ExternalLink, Minus, MoreHorizontal, Plus, Star, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MapPane, ShellSplit } from "@/components/app-shell/app-shell";
import { TabBarView } from "@/components/app-shell/tab-bar";
import { PlaceBadges } from "@/components/badges/place-badges";
import { LoadingRegion } from "@/components/states";
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
import { focusRing, pressMotion } from "@/components/ui/interaction";
import { MENU_NAME_MAX, menuLabCopy } from "@/copy/design-lab-menu";
import { useDesignPortalContainer } from "@/features/design-lab/system/design-scope";
import { clampPrice, stepPrice } from "@/features/feedback/review-draft";
import type { CategorySlug } from "@/features/place/categories";
import { categoryLabel } from "@/features/place/categories";
import { CATEGORY_INK } from "@/features/place/category-ink";
import { detailThumbs, type DetailPrice } from "@/features/place/detail-model";
import { CompactNumbers } from "@/features/place/detail/parts";
import { CategoryIllustration } from "@/features/place/illustrations";
import { naverPlaceSearchUrl } from "@/lib/naver/directions";
import { cn } from "@/lib/utils";
import type { MenuFail, MenuParams } from "./params";

export const copy = menuLabCopy;

/* ---------- 메뉴 모델 ---------- */

/** NFC, 앞뒤 공백 제거, 연속 공백 한 칸 (서버 zod normalizeMenuName과 같은 규칙으로 둘 예정, PRD MENU-05) */
export function normalizeMenuName(text: string): string {
  return text.normalize("NFC").replace(/\s+/g, " ").trim();
}

/** 같은 메뉴 판정 비교 키: 공백을 모두 지우고 소문자 ("김치 찌개" = "김치찌개") */
export function menuKey(text: string): string {
  return normalizeMenuName(text).replace(/\s/g, "").toLowerCase();
}

export function menuNameLength(text: string): number {
  return [...normalizeMenuName(text)].length;
}

export function menuNameCheck(text: string): "empty" | "tooLong" | "ok" {
  const n = menuNameLength(text);
  if (n === 0) return "empty";
  if (n > MENU_NAME_MAX) return "tooLong";
  return "ok";
}

/** 집계 한 줄(보안 함수 place_menus가 돌려줄 모양). 제보한 사람은 없다 */
export type MenuStat = {
  readonly key: string;
  readonly name: string;
  readonly medianKrw: number;
  readonly count: number;
};

/** 대표 메뉴 3개(제보 수 많은 순). 홈 카드는 1위만 쓴다 */
export const MENUS: readonly MenuStat[] = [
  { key: "돼지국밥", name: "돼지국밥", medianKrw: 9000, count: 12 },
  { key: "순대국밥", name: "순대국밥", medianKrw: 9500, count: 7 },
  { key: "수육백반", name: "수육 백반", medianKrw: 12000, count: 3 },
];
export const MENU_TOTAL = MENUS.reduce((n, m) => n + m.count, 0);
export const MENU_MONTH = "10월";

/** 카드에 대표 메뉴를 보일 최소 제보 수(안건 1 기본안). 한 사람의 잘못 쓴 제보가 카드에 바로 오르지 않게 */
export const CARD_MIN_REPORTS = 2;

export function cardMenu(state: MenuParams["state"]): MenuStat | null {
  if (state === "empty") return null;
  const top = MENUS[0];
  return top && top.count >= CARD_MIN_REPORTS ? top : null;
}

export function menusFor(state: MenuParams["state"]): readonly MenuStat[] {
  return state === "empty" ? [] : MENUS;
}

/** 9000 → "9,000원" */
export function won(krw: number): string {
  return `${krw.toLocaleString("ko-KR")}${copy.menu.priceUnit}`;
}

export type SaveStatus = "idle" | "saving" | "saved" | MenuFail;

/**
 * 메뉴 하나 남기기 상태. picked는 고른 기존 메뉴 키(null이면 직접 쓰기 또는 안 고름).
 * 이름 칸은 빈 칸에서 시작한다. 기존 메뉴를 고르면 가격이 그 메뉴 중앙값에서 시작한다.
 */
export function useMenuDraft(
  p: MenuParams,
  opts: { estimate: number; typedOnly?: boolean; menuOptional?: boolean },
) {
  const errorStart = p.state === "error";
  const [picked, setPicked] = useState<string | null>(null);
  // typedOnly: 알려주기 시트처럼 칩 없이 이름 칸만 쓰는 곳
  const [typing, setTyping] = useState(errorStart || opts.typedOnly === true);
  const [name, setName] = useState(errorStart ? "콩나물국밥" : "");
  const [price, setPrice] = useState<number | null>(errorStart ? 8500 : null);
  const [status, setStatus] = useState<SaveStatus>(errorStart ? p.fail : "idle");
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );
  const offline = p.state === "offline";
  const loading = p.state === "loading";
  const menus = menusFor(p.state);
  const pickedMenu = menus.find((m) => m.key === picked) ?? null;
  const nameCheck = typing ? menuNameCheck(name) : pickedMenu ? "ok" : "empty";
  const hasMenu = nameCheck === "ok";
  const failed = status === "save" || status === "banned" || status === "limit";
  const canSave =
    !offline &&
    status !== "saving" &&
    status !== "limit" &&
    nameCheck !== "tooLong" &&
    // 피드백 시트(menuOptional)는 만족만으로도 저장된다(가격, 메뉴 모두 선택, FB-02). 메뉴를 고르면 가격은 필수(MENU-01)
    (opts.menuOptional === true ? !hasMenu || price !== null : hasMenu && price !== null);

  function pick(key: string | null) {
    if (offline) return;
    const m = menus.find((x) => x.key === key) ?? null;
    setPicked(m ? m.key : null);
    setTyping(false);
    setName("");
    if (m) setPrice(clampPrice(m.medianKrw));
    if (status !== "limit") setStatus("idle");
  }

  function startTyping() {
    if (offline) return;
    setPicked(null);
    setTyping(true);
    if (status !== "limit") setStatus("idle");
  }

  function step(dir: 1 | -1) {
    if (offline) return;
    setPrice((v) => stepPrice(v, pickedMenu?.medianKrw ?? opts.estimate, dir));
  }

  function save() {
    if (!canSave) return;
    setStatus("saving");
    timer.current = window.setTimeout(() => {
      setStatus(p.state === "error" ? p.fail : "saved");
    }, 600);
  }

  return {
    menus,
    picked,
    pickedMenu,
    typing,
    name,
    setName: (v: string) => {
      setName(v);
      if (status === "banned" || status === "save") setStatus("idle");
    },
    price,
    shownPrice: price ?? clampPrice(pickedMenu?.medianKrw ?? opts.estimate),
    status,
    failed,
    offline,
    loading,
    nameCheck,
    canSave,
    nameLength: menuNameLength(name),
    pick,
    startTyping,
    step,
    save,
  };
}
export type MenuDraft = ReturnType<typeof useMenuDraft>;

/* ---------- 목업 식당 (이름은 design-lab/mock의 지어낸 값) ---------- */

export const PLACE = {
  id: "1840235701",
  name: "정담국밥",
  category: "gukbap" as CategorySlug,
  walkMinutes: 4,
  reason: "지난주 👍한 국밥",
  position: { lat: 37.5662, lng: 126.9779 },
};

export const PRICE: DetailPrice = {
  value: 9000,
  estimate: false,
  reportCount: 7,
  range: null,
  reports: [],
  withinBudget: true,
};
/** 제보가 없을 때 가격 스테퍼 시작값(카테고리 추정) */
export const ESTIMATE = 9000;
export const THUMBS = detailThumbs({ up: 20, down: 3 });

export function naverLink(): string {
  return naverPlaceSearchUrl(PLACE.name, PLACE.position);
}

/* ---------- 입력 ---------- */

/** 메뉴 이름 한 줄 입력. 빈 칸에서 시작하고 자동 완성, 맞춤법 제안을 끈다. 붙여 넣기 버튼은 두지 않는다 */
export function MenuNameInput({
  draft,
  autoFocus,
  onEnter,
  className,
}: {
  draft: MenuDraft;
  autoFocus?: boolean;
  onEnter?: () => void;
  className?: string;
}) {
  const id = useId();
  const countId = `${id}-count`;
  const over = draft.nameCheck === "tooLong";
  const bad = over || draft.status === "banned";
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="type-label">
        {copy.menu.nameLabel}
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
          aria-invalid={bad || undefined}
          readOnly={draft.offline}
          placeholder={copy.menu.namePlaceholder}
          value={draft.name}
          onChange={(e) => draft.setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onEnter?.();
            }
          }}
          className={cn(
            "block h-12 w-full rounded-input border border-input bg-card pr-16 pl-4 type-body text-foreground outline-none placeholder:text-muted-foreground",
            "transition-[border-color] duration-(--lm-duration-fast) ease-standard focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid motion-reduce:transition-none",
            bad && "border-destructive",
          )}
        />
        <span
          id={countId}
          className={cn(
            "pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 type-caption tabular-nums",
            over ? "text-destructive" : "text-muted-foreground",
          )}
        >
          <span aria-hidden>{copy.menu.count(draft.nameLength, MENU_NAME_MAX)}</span>
          <span className="sr-only">{copy.menu.countLabel(draft.nameLength, MENU_NAME_MAX)}</span>
        </span>
      </div>
    </div>
  );
}

/** 500원 단위 가격 스테퍼(FB-02 스테퍼와 같은 모양, 칩 없이) */
export function PriceStepper({ draft, label = copy.menu.priceLabel }: { draft: MenuDraft; label?: string }) {
  const id = useId();
  const round = cn(
    "inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-border text-foreground hover:bg-muted active:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-40",
    pressMotion,
    focusRing,
  );
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-2">
      <span id={id} className="type-label">
        {label}
      </span>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label={copy.menu.priceDecrease}
          aria-disabled={draft.offline || undefined}
          onClick={() => draft.step(-1)}
          className={round}
        >
          <Minus aria-hidden className="size-5" strokeWidth={1.5} />
        </button>
        <p
          aria-live="polite"
          className={cn(
            "flex items-baseline gap-1 tabular-nums",
            draft.price === null ? "text-muted-foreground" : "text-foreground",
          )}
        >
          <span className="type-numeric-lg">{draft.shownPrice.toLocaleString("ko-KR")}</span>
          <span className="type-body-sm">{copy.menu.priceUnit}</span>
        </p>
        <button
          type="button"
          aria-label={copy.menu.priceIncrease}
          aria-disabled={draft.offline || undefined}
          onClick={() => draft.step(1)}
          className={round}
        >
          <Plus aria-hidden className="size-5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

/** 입력 아래 한 줄: 길이 초과, 실패, 금칙어, 한도, 오프라인, 보냄 */
export function MenuNote({ draft, className }: { draft: MenuDraft; className?: string }) {
  const text = draft.offline
    ? copy.states.offline
    : draft.nameCheck === "tooLong"
      ? copy.menu.tooLong(MENU_NAME_MAX)
      : draft.status === "save"
        ? copy.states.saveFailed
        : draft.status === "banned"
          ? copy.states.banned
          : draft.status === "limit"
            ? copy.states.limit
            : draft.status === "saved"
              ? copy.menu.saved
              : null;
  if (!text) return null;
  const alert = draft.failed || draft.nameCheck === "tooLong";
  return (
    <p
      role={alert ? "alert" : "status"}
      className={cn(
        "type-body-sm break-keep",
        alert && draft.status !== "limit" ? "text-destructive" : "text-muted-foreground",
        className,
      )}
    >
      {text}
    </p>
  );
}

export function saveLabel(draft: MenuDraft): string {
  if (draft.status === "saving") return copy.menu.saving;
  if (draft.failed && draft.status !== "limit") return copy.states.retry;
  return copy.menu.save;
}

/* ---------- 틀 ---------- */

/** 홈 목업 틀(하단 탭 포함, 데스크톱은 우 지도) */
export function ShellFrame({ children }: { children: ReactNode }) {
  return (
    <ShellSplit
      list={
        <main className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-6 pb-6 desktop:max-w-(--lm-layout-desktop-list-max-width) desktop:px-10 desktop:pt-10">
          {children}
        </main>
      }
      map={<MapPane />}
      tabBar={<TabBarView activeId="today" preview />}
    />
  );
}

/**
 * 시트 정지 화면(끝까지 연 높이). 모바일은 위 12px 딤 아래 시트 면, 데스크톱은 좌 칸 + 우 지도.
 * 실제 구현은 PlaceDetailSheet, ReviewSheet(Base UI Drawer)이고, 시안은 캡처를 위해 열린 모습을 그대로 그린다.
 */
export function SheetFrame({
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
            <div className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-6 pb-8 desktop:max-w-(--lm-layout-desktop-list-max-width) desktop:px-10">
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

/** 상세 요약 머리: 그림 + 카테고리 + 이름 */
export function DetailHeader() {
  return (
    <header className="flex items-center gap-3">
      <CategoryIllustration slug={PLACE.category} size={56} className="-ml-1 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className={cn("type-caption", CATEGORY_INK[PLACE.category])}>{categoryLabel(PLACE.category)}</span>
        <h2 className="type-title text-balance break-keep">{PLACE.name}</h2>
      </div>
    </header>
  );
}

/** 요약 아래 공통: 이유 한 줄, 내 방문 한 줄, 숫자 3칸, 배지. slot은 배지 다음(메뉴 자리), folds는 접힌 줄 목록 */
export function DetailBody({ slot, folds = copy.detail.folds }: { slot?: ReactNode; folds?: readonly string[] }) {
  return (
    <>
      <p className="mt-4 type-body-sm break-keep text-muted-foreground">{PLACE.reason}</p>
      <p className="mt-1.5 type-caption break-keep text-muted-foreground">{copy.detail.myVisit}</p>
      <CompactNumbers walkMinutes={PLACE.walkMinutes} price={PRICE} thumbs={THUMBS} className="mt-5" />
      <PlaceBadges badges={[{ kind: "waiting", level: "short", minutesAgo: 12 }]} className="mt-4" />
      {slot}
      <ul aria-hidden className="mt-6 flex flex-col border-t border-border">
        {folds.map((t) => (
          <li key={t} className="flex min-h-14 items-center border-b border-border type-label">
            {t}
          </li>
        ))}
      </ul>
    </>
  );
}

/** 하단 고정 줄: 길찾기(유일한 올리브 면) + 즐겨찾기 + 더 보기 */
export function DetailFooter() {
  return (
    <div className="flex items-center gap-2">
      <span className={cn(buttonClass("primary"), "flex-1")}>{copy.detail.directions}</span>
      <span
        role="img"
        aria-label={copy.detail.favorite(PLACE.name)}
        className={cn(buttonClass("secondary", "icon"), "rounded-full")}
      >
        <Star aria-hidden className="size-5 fill-foreground text-foreground" strokeWidth={1.5} />
      </span>
      <span role="img" aria-label={copy.detail.more} className={cn(buttonClass("secondary", "icon"), "rounded-full")}>
        <MoreHorizontal aria-hidden className="size-5" strokeWidth={1.5} />
      </span>
    </div>
  );
}

/** 시트 위 오프라인 안내 한 줄 */
export function OfflineLine({ className }: { className?: string }) {
  return (
    <p role="status" className={cn("type-caption break-keep text-muted-foreground", className)}>
      {copy.states.offline}
    </p>
  );
}

/** 메뉴 자리 스켈레톤(메뉴 집계만 늦게 온다) */
export function MenuSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <LoadingRegion label={copy.states.loading} className={cn("flex flex-col gap-3", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} aria-hidden className="flex items-center justify-between gap-4">
          <span className={cn("h-4 rounded-badge bg-skeleton", i === 0 ? "w-28" : i === 1 ? "w-24" : "w-20")} />
          <span className="h-4 w-16 rounded-badge bg-skeleton" />
        </span>
      ))}
    </LoadingRegion>
  );
}

/** 제보 없음: 안내 + 알려주기 + 네이버 플레이스 링크. 세 안이 같은 내용을 쓴다 */
export function MenuEmpty({
  onAdd,
  disabled,
  className,
}: {
  onAdd: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-1">
        <p className="type-label break-keep">{copy.menu.emptyTitle}</p>
        <p className="type-body-sm break-keep text-muted-foreground">{copy.menu.emptyBody}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <AddButton onAdd={onAdd} disabled={disabled} />
        <NaverLink />
      </div>
    </div>
  );
}

/** 테두리 알약 "+ 메뉴 알려주기" */
export function AddButton({
  onAdd,
  disabled,
  label = copy.menu.add,
}: {
  onAdd: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onAdd}
      aria-label={copy.menu.addLabel(PLACE.name)}
      aria-disabled={disabled || undefined}
      className={cn(
        "relative inline-flex min-h-9 w-fit items-center gap-1.5 rounded-chip border border-dashed border-border px-3 type-body-sm text-foreground hover:bg-muted active:bg-muted aria-disabled:opacity-60",
        "after:absolute after:-inset-y-1.5 after:inset-x-0 after:content-['']",
        focusRing,
      )}
    >
      <Plus aria-hidden className="size-4 text-muted-foreground" strokeWidth={1.5} />
      {label}
    </button>
  );
}

export function NaverLink({ className }: { className?: string }) {
  return (
    <a
      href={naverLink()}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "relative inline-flex min-h-9 items-center gap-1 type-body-sm text-muted-foreground underline decoration-border underline-offset-[3px] hover:text-foreground",
        "after:absolute after:-inset-y-1.5 after:inset-x-0 after:content-['']",
        focusRing,
        className,
      )}
    >
      {copy.menu.naver}
      <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.5} />
    </a>
  );
}

/* ---------- 홈 큰 카드 ---------- */

/**
 * 오늘의 한 곳 큰 카드(D-25 압축 치수). numbers는 숫자 3칸 자리(A안이 가격 칸을 바꾼다),
 * afterReason은 이유 한 줄 바로 아래(B안 메뉴 줄).
 */
export function HomeBigCard({ numbers, afterReason }: { numbers?: ReactNode; afterReason?: ReactNode }) {
  return (
    <article className="relative overflow-hidden rounded-card border border-border bg-card p-5">
      <div className="flex gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex min-w-0 items-center gap-2 type-caption text-muted-foreground">
            <span className="shrink-0">{copy.home.eyebrow}</span>
            <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
            <span className={cn("shrink-0", CATEGORY_INK[PLACE.category])}>{categoryLabel(PLACE.category)}</span>
          </span>
          <h2 className="mt-2 type-title break-keep">{PLACE.name}</h2>
        </div>
        <CategoryIllustration slug={PLACE.category} size={80} className="-mt-1 -mr-2 shrink-0" />
      </div>
      <p className="mt-2 type-body break-keep">{PLACE.reason}</p>
      {afterReason}
      <div className="mt-3 flex min-h-6 items-center justify-between gap-3">
        <PlaceBadges badges={[{ kind: "waiting", level: "short", minutesAgo: 12 }, { kind: "deal" }]} />
        <span className="shrink-0 type-caption underline decoration-border underline-offset-[3px]">{copy.home.detail}</span>
      </div>
      {numbers ?? <CompactNumbers walkMinutes={PLACE.walkMinutes} price={PRICE} thumbs={THUMBS} className="mt-3" />}
    </article>
  );
}

/** 홈 머리 + 큰 카드 + 대안 두 줄 + 행동 줄 (목업) */
export function HomeMock({ card }: { card: ReactNode }) {
  return (
    <>
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="type-heading font-heading">{copy.home.title}</h1>
        <span className="type-caption text-muted-foreground">{copy.home.date}</span>
      </header>
      <div className="mt-3">{card}</div>
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
  );
}

/* ---------- 식후 피드백 시트 (D-11 B 한 장 시트 목업) ---------- */

/** 피드백 시트 머리와 만족 줄. 가격 칸(children)만 안마다 다르다 */
export function FeedbackSheet({
  draft,
  children,
  after,
}: {
  draft: MenuDraft;
  children: ReactNode;
  after?: ReactNode;
}) {
  return (
    <SheetFrame
      label={copy.feedback.title(PLACE.name)}
      footer={
        <button
          type="button"
          onClick={draft.save}
          aria-disabled={!draft.canSave || undefined}
          className={cn(buttonClass("primary"), "w-full")}
        >
          {draft.status === "saving" ? copy.feedback.saving : draft.failed && draft.status !== "limit" ? copy.states.retry : copy.feedback.save}
        </button>
      }
    >
      {draft.offline ? <OfflineLine className="mb-4" /> : null}
      <h2 className="type-heading font-heading break-keep">{copy.feedback.title(PLACE.name)}</h2>
      <dl className="mt-4 flex flex-col border-t border-border">
        <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border">
          <dt className="type-label">{copy.feedback.rating}</dt>
          <dd className="type-body-sm text-muted-foreground">👍 {copy.feedback.ratingUp}</dd>
        </div>
      </dl>
      <div className="mt-5 flex flex-col gap-5">{children}</div>
      {after}
      <dl className="mt-5 flex flex-col border-t border-border">
        {(
          [
            [copy.feedback.tags, copy.feedback.tagsValue],
            [copy.feedback.body, copy.feedback.bodyEmpty],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="flex min-h-12 items-center justify-between gap-3 border-b border-border">
            <dt className="type-label">{k}</dt>
            <dd className="type-body-sm text-muted-foreground">{v}</dd>
          </div>
        ))}
      </dl>
      <MenuNote draft={draft} className="mt-4" />
    </SheetFrame>
  );
}

/* ---------- 작은 시트 (메뉴 알려주기) ---------- */

export function MenuSheet({
  open,
  onOpenChange,
  children,
  footer,
  title = copy.menu.sheetTitle,
}: {
  title?: string;
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
                {title}
              </DrawerTitle>
              <DrawerClose
                aria-label={copy.menu.close}
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

/** 알려주기 시트 아래 주 버튼(시트 안에서는 이 버튼이 유일한 올리브 면. 뒤 상세 길찾기는 딤에 가린다) */
export function SheetSave({ draft }: { draft: MenuDraft }) {
  return (
    <button
      type="button"
      onClick={draft.save}
      aria-disabled={!draft.canSave || undefined}
      className={cn(buttonClass("primary"), "w-full")}
    >
      {saveLabel(draft)}
    </button>
  );
}

/** 상세 시트를 깔고 알려주기 시트를 띄우는 틀(report 보기). 오류 상태와 edit=1은 연 채로 시작 */
export function useReportSheet(p: MenuParams, draft: MenuDraft) {
  const [open, setOpen] = useState(p.edit || p.view === "report");
  useEffect(() => {
    if (draft.status === "saved") {
      const t = window.setTimeout(() => setOpen(false), 900);
      return () => window.clearTimeout(t);
    }
  }, [draft.status]);
  return {
    open,
    setOpen,
    openSheet: () => {
      if (draft.offline) return;
      setOpen(true);
    },
  };
}
