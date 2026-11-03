"use client";
// 탭 스와이프 시안 공용 조각 (T9.14). 세 안이 같은 탭 목업 화면, 같은 판정 규칙(./gesture.ts), 같은 하단 탭 모양을 쓰고
// "밀 때 무엇이 보이는가"만 다르다(A 페이지가 따라옴, B 가장자리 표시, C 탭 막대 밀기).
//
// - 탭 목업은 실제 화면의 뼈대만 옮겼다(오늘 큰 카드와 대안 두 줄, 지도 띠와 목록 시트, 투표 목록, 나 머리와 안쪽 탭).
//   스와이프와 부딪히는 자리는 실제와 같게 data-swipe-ignore를 단다: 지도 캔버스 띠, 필터 칩 가로 줄, 나 안쪽 탭 줄.
// - 하단 탭은 앱 TabBarView와 같은 모양이지만 시안 안에서 눌러 탭을 바꿀 수 있게 버튼으로 둔다(실제 앱은 링크).
// - 4상태(state)는 지금 보이는 탭 본문에 적용한다. 옆 탭으로 옮겨도 같은 상태다(오프라인이면 어느 탭이든 오프라인).
// - 모바일 탭 막대는 sticky(디자인 랩 미리보기 규약), 데스크톱은 좌 리스트 칸 아래(ShellSplit).
import { ChevronDown, ChevronRight, MapPin } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type ReactNode,
} from "react";
import { ShellSplit } from "@/components/app-shell/app-shell";
import { PageHeader } from "@/components/app-shell/page-header";
import { APP_TABS, type AppTabId } from "@/components/app-shell/tabs";
import { CardSkeleton, ListSkeleton } from "@/components/states";
import { focusRing } from "@/components/ui/interaction";
import { commonCopy } from "@/copy/common";
import { swipeLabCopy } from "@/copy/design-lab-swipe";
import {
  NumberGrid,
  CategoryCaption,
} from "@/features/design-lab/home/shared/card-bits";
import {
  MOCK_HOME_TODAY,
  MOCK_PLACES,
  type DesignState,
} from "@/features/design-lab/mock";
import {
  MapLines,
  MapPin as MockMapPin,
  PIN_POSITIONS,
  StateBlock,
} from "@/features/design-lab/system/b/parts";
import { MapPlaceholder } from "@/features/design-lab/system/desktop-split";
import { categoryLabel } from "@/features/place/categories";
import { CategoryIllustration } from "@/features/place/illustrations";
import { useMotionReduced } from "@/lib/motion/motion-scope";
import { cn } from "@/lib/utils";
import { RUBBER_MAX_PX, type SwipeDir, type SwipeDrag } from "./gesture";
import type { SwipeDemo } from "./params";

export const copy = swipeLabCopy;
export const TAB_COUNT = APP_TABS.length;

export function tabIndexOf(id: AppTabId): number {
  return APP_TABS.findIndex((t) => t.id === id);
}

export function tabAt(index: number) {
  const tab = APP_TABS[index];
  if (!tab) throw new Error(`[swipe-lab] 탭 순번 ${index} 없음`);
  return tab;
}

/* ---------- 탭 상태(시안 안에서만, 실제 앱은 라우터) ---------- */

export function useLabTabs(initial: AppTabId) {
  const [index, setIndex] = useState(tabIndexOf(initial));
  const [announcement, setAnnouncement] = useState("");
  function go(next: number) {
    if (next === index || next < 0 || next >= TAB_COUNT) return;
    setIndex(next);
    setAnnouncement(copy.moved(tabAt(next).label));
  }
  return { index, tab: tabAt(index), go, announcement };
}

/** 탭을 옮긴 뒤 스크린 리더에 한 번 알린다(실제 앱은 Next 경로 알림 + 페이지 제목) */
export function Announcer({ text }: { text: string }) {
  return (
    <p aria-live="polite" className="sr-only">
      {text}
    </p>
  );
}

/* ---------- 틀 ---------- */

/**
 * 좌 리스트 칸(스와이프 받는 자리) + 데스크톱 우 지도 자리 + 하단 탭.
 * list에는 시안이 감싼 탭 본문이 온다.
 */
export function SwipeFrame({
  list,
  tabBar,
}: {
  list: ReactNode;
  tabBar: ReactNode;
}) {
  return (
    <ShellSplit
      list={list}
      map={
        <MapPlaceholder className="border-l border-border desktop:sticky desktop:top-0 desktop:max-h-svh">
          <MapLines />
          {PIN_POSITIONS.map((pos, i) => (
            <MockMapPin
              key={i}
              label={MOCK_HOME_TODAY[i]?.name ?? ""}
              active={i === 0}
              position={pos}
            />
          ))}
        </MapPlaceholder>
      }
      tabBar={tabBar}
    />
  );
}

/* ---------- 하단 탭 (TabBarView와 같은 모양, 시안용 버튼) ---------- */

export function LabTabBar({
  activeIndex,
  highlightIndex,
  onSelect,
  lens,
  hint,
  className,
  listClassName,
  ...listProps
}: {
  activeIndex: number;
  /** C: 밀고 있는 동안 손가락 아래 탭(글자를 진하게) */
  highlightIndex?: number | null;
  onSelect: (index: number) => void;
  /** C: 손가락을 따라오는 렌즈(탭 칸 위 면) */
  lens?: ReactNode;
  /** C: 탭 막대 위 안내 한 줄 */
  hint?: ReactNode;
  className?: string;
  listClassName?: string;
} & Omit<ComponentProps<"ul">, "children" | "onSelect" | "className">) {
  return (
    <nav
      aria-label={commonCopy.tabBarLabel}
      data-slot="bottom-tab-bar"
      className={cn(
        "sticky bottom-0 z-10 shrink-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom,0px)]",
        className,
      )}
    >
      {hint}
      <ul
        {...listProps}
        className={cn(
          "relative mx-auto grid h-(--lm-layout-tab-bar-height) max-w-(--lm-layout-max-width) grid-cols-4",
          listClassName,
        )}
      >
        {lens}
        {APP_TABS.map(({ id, label, Icon }, i) => {
          const isActive = i === activeIndex;
          const lit = highlightIndex == null ? isActive : i === highlightIndex;
          return (
            <li key={id} className="relative flex min-w-0">
              <span
                aria-hidden
                data-slot="tab-indicator"
                className={cn(
                  "pointer-events-none absolute top-0 left-1/2 h-0.5 w-5 -translate-x-1/2 bg-primary transition-opacity motion-reduce:transition-none",
                  isActive
                    ? "opacity-100 duration-(--lm-duration-base) ease-standard"
                    : "opacity-0 duration-(--lm-duration-fast) ease-exit",
                )}
              />
              <button
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => onSelect(i)}
                className={cn(
                  "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 type-caption whitespace-nowrap transition-colors duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
                  lit ? "text-foreground" : "text-muted-foreground",
                  focusRing,
                  "focus-visible:-outline-offset-4",
                )}
              >
                <Icon
                  aria-hidden
                  className="size-[1.375rem]"
                  strokeWidth={1.5}
                />
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ---------- 탭 본문 목업 ---------- */

const PAGE_PAD =
  "mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) desktop:max-w-(--lm-layout-desktop-list-max-width) desktop:px-10";

/** 지금 탭 본문. state가 ready가 아니면 같은 자리에 상태를 그린다 */
export function TabScreen({
  tab,
  state,
}: {
  tab: AppTabId;
  state: DesignState;
}) {
  switch (tab) {
    case "today":
      return <TodayMock state={state} />;
    case "map":
      return <MapMock state={state} />;
    case "poll":
      return <PollMock state={state} />;
    case "me":
      return <MeMock state={state} />;
  }
}

function StateBody({
  tab,
  state,
}: {
  tab: AppTabId;
  state: Exclude<DesignState, "ready" | "loading">;
}) {
  const s =
    state === "empty"
      ? copy.states.empty[tab]
      : state === "error"
        ? copy.states.error
        : copy.states.offline;
  return (
    <div className="py-10">
      <StateBlock
        kind={state}
        title={s.title}
        body={s.body}
        action={s.action}
        category={tab === "map" ? "bunsik" : "hansik"}
      />
    </div>
  );
}

function TodayMock({ state }: { state: DesignState }) {
  const [hero, ...alts] = MOCK_HOME_TODAY;
  return (
    <div className={cn(PAGE_PAD, "pt-5 pb-8 desktop:pt-12")}>
      <div className="flex items-center justify-between">
        <span className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-4 type-label">
          <MapPin aria-hidden className="size-4" strokeWidth={1.5} />
          {copy.today.place}
          <ChevronDown aria-hidden className="size-4" strokeWidth={1.5} />
        </span>
        <span className="type-caption text-muted-foreground">
          {copy.today.eyebrow}
        </span>
      </div>
      <h1 className="mt-6 type-title text-foreground">{copy.today.title}</h1>
      {state === "loading" ? (
        <CardSkeleton className="mt-4" />
      ) : state !== "ready" ? (
        <StateBody tab="today" state={state} />
      ) : (
        <>
          <article className="mt-4 flex flex-col gap-5 rounded-card border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-2">
                <p className="type-caption text-muted-foreground">
                  {copy.today.spot}{" "}
                  {hero ? <CategoryCaption place={hero} /> : null}
                </p>
                <h2 className="type-title break-keep">{hero?.name}</h2>
              </div>
              {hero ? (
                <CategoryIllustration slug={hero.category} size={96} />
              ) : null}
            </div>
            <p className="type-body-sm text-muted-foreground">
              {copy.today.reason}
            </p>
            {hero ? <NumberGrid place={hero} /> : null}
          </article>
          <h2 className="mt-6 type-caption text-muted-foreground">
            {copy.today.others}
          </h2>
          <ul className="mt-2 flex flex-col divide-y divide-border overflow-hidden rounded-card border border-border bg-card">
            {alts.map((p) => (
              <li key={p.id} className="flex min-h-16 items-center gap-4 px-5">
                <CategoryIllustration slug={p.category} size={40} />
                <span className="flex-1 type-label">{p.name}</span>
                <span className="type-numeric-md">
                  {copy.today.walk(p.walkMinutes)}
                </span>
                <ChevronRight
                  aria-hidden
                  className="size-4 text-muted-foreground"
                  strokeWidth={1.5}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function MapMock({ state }: { state: DesignState }) {
  const rows = MOCK_PLACES.slice(0, 5);
  return (
    <div className="flex flex-1 flex-col">
      {/* 모바일 지도 띠: 지도 끌기와 부딪히므로 스와이프를 받지 않는다. 데스크톱은 오른쪽 지도 칸 */}
      <div
        data-swipe-ignore
        role="img"
        aria-label={copy.map.mapLabel}
        className="relative h-56 shrink-0 bg-muted desktop:hidden"
      >
        <MapLines />
        {PIN_POSITIONS.map((pos, i) => (
          <MockMapPin
            key={i}
            label={rows[i]?.name ?? ""}
            active={i === 0}
            position={pos}
          />
        ))}
      </div>
      <div
        className={cn(
          PAGE_PAD,
          "-mt-5 rounded-t-sheet bg-popover pt-3 pb-8 desktop:mt-0 desktop:rounded-none desktop:bg-background desktop:pt-12",
        )}
      >
        <span
          aria-hidden
          className="mx-auto mb-4 h-1 w-10 rounded-full bg-border desktop:hidden"
        />
        <div className="flex items-baseline justify-between">
          <p className="type-label">{copy.map.summary}</p>
          <p className="type-caption text-muted-foreground">{copy.map.sort}</p>
        </div>
        <div
          role="group"
          aria-label={copy.map.chipsLabel}
          className="-mx-(--lm-layout-gutter) mt-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-(--lm-layout-gutter) py-1 desktop:mx-0 desktop:px-0"
        >
          {copy.map.chips.map((c) => (
            <button
              key={c}
              type="button"
              className={cn(
                "inline-flex h-11 shrink-0 items-center rounded-full border border-border px-4 type-label",
                focusRing,
              )}
            >
              {c}
            </button>
          ))}
        </div>
        {state === "loading" ? (
          <ListSkeleton rows={4} className="mt-3" />
        ) : state !== "ready" ? (
          <StateBody tab="map" state={state} />
        ) : (
          <ul className="mt-3 flex flex-col">
            {rows.map((p) => (
              <li
                key={p.id}
                className="flex min-h-18 items-center gap-4 border-b border-border py-3"
              >
                <CategoryIllustration slug={p.category} size={40} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="type-label">{p.name}</span>
                  <span className="type-caption text-muted-foreground">
                    {copy.map.walk(p.walkMinutes)}
                  </span>
                </div>
                <span className="type-caption text-muted-foreground">
                  {categoryLabel(p.category)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ListRows({
  rows,
}: {
  rows: readonly { title: string; meta: string; right: string }[];
}) {
  return (
    <ul className="flex flex-col border-t border-border">
      {rows.map((r) => (
        <li
          key={r.title}
          className="flex min-h-18 items-center gap-4 border-b border-border py-3"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="type-heading">{r.title}</span>
            <span className="type-caption text-muted-foreground">{r.meta}</span>
          </div>
          <span className="type-caption text-muted-foreground tabular-nums">
            {r.right}
          </span>
          <ChevronRight
            aria-hidden
            className="size-4 text-muted-foreground"
            strokeWidth={1.5}
          />
        </li>
      ))}
    </ul>
  );
}

function PollMock({ state }: { state: DesignState }) {
  return (
    <div className={cn(PAGE_PAD, "gap-8 pt-10 pb-8 desktop:pt-14")}>
      <PageHeader title={copy.poll.title} />
      {state === "loading" ? (
        <ListSkeleton rows={4} />
      ) : state !== "ready" ? (
        <StateBody tab="poll" state={state} />
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="type-caption text-muted-foreground">
              {copy.poll.live}
            </h2>
            <ListRows rows={copy.poll.rows} />
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="type-caption text-muted-foreground">
              {copy.poll.past}
            </h2>
            <ListRows rows={copy.poll.pastRows} />
          </section>
        </>
      )}
    </div>
  );
}

function MeMock({ state }: { state: DesignState }) {
  const [active, setActive] = useState(0);
  return (
    <div className={cn(PAGE_PAD, "gap-6 pt-10 pb-8 desktop:pt-14")}>
      <PageHeader title={copy.me.title} eyebrow={copy.me.greeting} />
      {/* 안쪽 탭 줄: 탭 스와이프를 받지 않는다(안쪽 탭과 헷갈리지 않게) */}
      <div
        data-swipe-ignore
        role="tablist"
        aria-label={copy.me.tabsLabel}
        className="grid grid-cols-3 border-b border-border"
      >
        {copy.me.tabs.map((t, i) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={cn(
              "min-h-12 type-label",
              i === active
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted-foreground",
              focusRing,
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {state === "loading" ? (
        <ListSkeleton rows={3} />
      ) : state !== "ready" ? (
        <StateBody tab="me" state={state} />
      ) : (
        <ul className="flex flex-col">
          {copy.me.rows.map((r) => (
            <li
              key={r.name}
              className="flex min-h-18 items-center gap-4 border-b border-border py-3"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="type-label">{r.name}</span>
                <span className="type-caption text-muted-foreground">
                  {r.meta}
                </span>
              </div>
              <ChevronRight
                aria-hidden
                className="size-4 text-muted-foreground"
                strokeWidth={1.5}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- 보이는 제스처 상태 (손가락 또는 캡처용 demo) ---------- */

/** 시안이 그리는 값. offset은 CSS 길이(손가락이면 px, demo면 칸 폭 대비 %) */
export type ViewDrag = {
  offset: string;
  /** 칸 폭 대비 이동 비율(-1~1 근사). B의 본문 살짝 밀림, A의 미리 보기 폭에 쓴다 */
  ratio: number;
  dir: SwipeDir | null;
  target: number | null;
  progress: number;
  armed: boolean;
};

export function viewOf(drag: SwipeDrag, width: number): ViewDrag {
  return {
    offset: `${drag.offset}px`,
    ratio: width > 0 ? drag.offset / width : 0,
    dir: drag.dir,
    target: drag.target,
    progress: drag.progress,
    armed: drag.armed,
  };
}

/** 캡처용 멈춘 제스처. 다음 탭 쪽(왼쪽으로 민 상태)만 보인다 */
export function demoView(demo: SwipeDemo, index: number): ViewDrag | null {
  if (demo === "none") return null;
  if (demo === "end") {
    return {
      offset: `-${RUBBER_MAX_PX - 8}px`,
      ratio: -0.1,
      dir: 1,
      target: null,
      progress: 0,
      armed: false,
    };
  }
  const target = index + 1 < TAB_COUNT ? index + 1 : null;
  const armed = demo === "armed";
  const ratio = armed ? -0.38 : -0.15;
  return {
    offset: `${ratio * 100}%`,
    ratio,
    dir: 1,
    target,
    progress: target === null ? 0 : armed ? 1 : 0.5,
    armed: target !== null && armed,
  };
}

/** 넘어가는 단계. out(지금 화면이 나감) → in(새 화면이 들어올 자리, 전환 없음) → enter(제자리로) → idle */
export type Transit =
  | { kind: "idle" }
  | { kind: "back" }
  | { kind: "out"; dir: SwipeDir; target: number }
  | { kind: "in"; dir: SwipeDir }
  | { kind: "enter" };

/** in 다음 두 프레임 뒤 enter(시작 위치가 그려진 뒤 전환이 걸리게), 전환이 끝나지 않으면 fallback 뒤 다음 단계 */
export function useTransitSteps(
  transit: Transit,
  setTransit: (t: Transit) => void,
  onOut: (target: number, dir: SwipeDir) => void,
) {
  const onOutRef = useRef(onOut);
  useEffect(() => {
    onOutRef.current = onOut;
  });
  useEffect(() => {
    if (transit.kind === "in") {
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setTransit({ kind: "enter" }));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    if (transit.kind === "out") {
      const { target, dir } = transit;
      const t = window.setTimeout(() => onOutRef.current(target, dir), 200);
      return () => window.clearTimeout(t);
    }
    if (transit.kind === "back" || transit.kind === "enter") {
      const t = window.setTimeout(() => setTransit({ kind: "idle" }), 360);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [transit, setTransit]);
}

const noopSubscribe = () => () => {};

/**
 * 축소 모드 여부. 서버 렌더와 첫 클라이언트 렌더는 false로 맞추고(하이드레이션 때 style이 어긋나지 않게)
 * 마운트 뒤에 OS 설정과 앱 설정을 따른다.
 */
export function useLabReduced(): boolean {
  const reduced = useMotionReduced();
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  return mounted && reduced;
}
