"use client";
// 시안 A "Terracotta Table" 비교 화면 1: 오늘(홈) 추천 카드 3장 + 하단 탭 (T1.11, T1.13).
// 모바일: 쌓인 카드 스택(앞 1장 주인공, 뒤 2장은 카테고리 색면만 살짝). 스와이프 + 이전/다음 버튼.
// 데스크톱(컨테이너 1024px 이상): 좌 리스트(카드 3장 세로) + 우 지도 면 2단.
// 첫 화면에서 움직이는 것은 카드 스택 등장(딜링) 하나뿐이다. 일러스트는 정지.
import {
  ChevronLeft,
  ChevronRight,
  Navigation,
  RotateCw,
  Shuffle,
} from "lucide-react";
import {
  AnimatePresence,
  LazyMotion,
  useMotionValue,
  useTransform,
  type PanInfo,
  type Variants,
} from "motion/react";
import * as m from "motion/react-m";
import {
  useEffect,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { designLabACopy as copy } from "@/copy/design-lab-a";
import { homeCopy } from "@/copy/home";
import { IllustrationA } from "@/features/design-lab/illustrations/a";
import {
  MOCK_HOME_ALL_SETS,
  type MockPick,
  type MockPlace,
} from "@/features/design-lab/mock";
import { categoryLabel } from "@/features/place/categories";
import { cn } from "@/lib/utils";
import { DesktopSplit } from "../desktop-split";
import { loadDomMax, springOf, staggerOf, tweenOf } from "../motion";
import { getHomeContent, type HomeContent } from "../states";
import { ACTIVE_TAB_BY_SCREEN } from "../tabs";
import type { DesignMotionTokens, DesignScreenProps } from "../types";
import { homeContext, splitMessage } from "./format";
import {
  Badge,
  DesktopNav,
  MapSurface,
  NumberRow,
  PressButton,
  StateArt,
  TabBar,
  catInk,
  catSurface,
  focusRing,
  skel,
  type MapPin,
} from "./parts";

const TOTAL = 3;
/** 넘김 기준: 120px 또는 500px/s (a.DESIGN.md 7장 swipe) */
const SWIPE_OFFSET = 120;
const SWIPE_VELOCITY = 500;
/** 뒤 카드: 8px씩 아래로, 폭 4%씩 줄임 (a.DESIGN.md 5장 스택) */
const DEPTH = [
  { y: 0, scale: 1 },
  { y: 8, scale: 0.96 },
  { y: 16, scale: 0.92 },
] as const;

/** 데스크톱 지도 위 핀 자리 (목업, %) */
const PIN_SPOTS = [
  { x: 38, y: 40 },
  { x: 70, y: 30 },
  { x: 30, y: 76 },
] as const;

type Step = { step: 1 | -1; throwSign: 1 | -1 };

export function HomeScreenA({ state, tokens }: DesignScreenProps) {
  const content = getHomeContent(state);
  const { meal, line } = homeContext();
  const [setIdx, setSetIdx] = useState(0);
  const [index, setIndex] = useState(0);
  const [move, setMove] = useState<Step>({ step: 1, throwSign: -1 });
  const [announce, setAnnounce] = useState("");

  const picks: MockPick | null =
    content.kind === "ready"
      ? (MOCK_HOME_ALL_SETS[setIdx] ?? content.picks)
      : null;
  const current = picks ? (picks[index] ?? null) : null;

  const go = (step: 1 | -1, throwSign: 1 | -1 = step === 1 ? -1 : 1) => {
    const next = (index + step + TOTAL) % TOTAL;
    setMove({ step, throwSign });
    setIndex(next);
    setAnnounce(copy.stack.position(next + 1, TOTAL));
  };
  const reroll = () => {
    setSetIdx((s) => (s + 1) % MOCK_HOME_ALL_SETS.length);
    setIndex(0);
    setMove({ step: 1, throwSign: -1 });
    setAnnounce(copy.stack.rerolled);
  };

  const pins: MapPin[] = picks
    ? picks.map((p, i) => ({
        id: p.id,
        name: p.name,
        ...PIN_SPOTS[i]!,
      }))
    : [];

  return (
    <div className="flex flex-1 flex-col overflow-x-clip break-keep">
      <DesktopSplit
        list={
          <div className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-6 pb-5 desktop:max-w-(--lm-layout-desktop-list-max-width) desktop:px-0 desktop:pt-8 desktop:pb-10">
            <DesktopNav active={ACTIVE_TAB_BY_SCREEN.home} />
            <header className="flex flex-col gap-1 desktop:mt-12">
              <p className="type-caption text-muted-foreground">{line}</p>
              <h1 className="type-title">{copy.title[meal]}</h1>
            </header>
            <p aria-live="polite" className="sr-only">
              {announce}
            </p>
            <Body
              content={content}
              motion={tokens.motion}
              picks={picks}
              setIdx={setIdx}
              index={index}
              move={move}
              current={current}
              onGo={go}
              onSelect={(i) => {
                setMove({ step: 1, throwSign: -1 });
                setIndex(i);
              }}
              onReroll={reroll}
            />
          </div>
        }
        map={
          <div className="sticky top-0 flex h-dvh max-h-full min-h-[32rem] flex-col p-3 pl-0">
            <MapSurface
              className="rounded-card"
              pins={pins}
              selectedId={current?.id ?? null}
              onPinClick={(id) => {
                const i = picks?.findIndex((p) => p.id === id) ?? -1;
                if (i >= 0) setIndex(i);
              }}
              pinLabel={(pin) => copy.map.selectPlace(pin.name)}
            />
          </div>
        }
      />
      <TabBar active={ACTIVE_TAB_BY_SCREEN.home} className="desktop:hidden" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 상태별 본문                                                          */
/* ------------------------------------------------------------------ */

function Body({
  content,
  motion,
  picks,
  setIdx,
  index,
  move,
  current,
  onGo,
  onSelect,
  onReroll,
}: {
  content: HomeContent;
  motion: DesignMotionTokens;
  picks: MockPick | null;
  setIdx: number;
  index: number;
  move: Step;
  current: MockPlace | null;
  onGo: (step: 1 | -1, throwSign?: 1 | -1) => void;
  onSelect: (i: number) => void;
  onReroll: () => void;
}) {
  if (content.kind === "loading") {
    return <HomeSkeleton label={content.label} />;
  }
  if (content.kind !== "ready" || !picks || !current) {
    if (content.kind === "ready") return null;
    const { heading, detail } = splitMessage(content.title, content.body);
    return (
      <>
        <div className="flex flex-1 items-center py-6 desktop:flex-none desktop:py-8">
          <section
            aria-labelledby="a-home-state-title"
            className="flex w-full flex-col overflow-hidden rounded-card bg-card shadow-md"
          >
            <div className="aspect-[16/9] w-full">
              <StateArt kind={content.kind} />
            </div>
            <div className="flex flex-col gap-2 p-5">
              <h2 id="a-home-state-title" className="type-heading">
                {heading}
              </h2>
              <p className="type-body-sm text-muted-foreground">{detail}</p>
            </div>
          </section>
        </div>
        <PressButton motion={motion} variant="primary" className="w-full">
          {content.kind === "empty" ? null : (
            <RotateCw aria-hidden className="size-4.5" strokeWidth={2.2} />
          )}
          {content.action}
        </PressButton>
      </>
    );
  }

  return (
    <>
      {/* 모바일: 카드 스택 */}
      <div className="flex flex-1 flex-col justify-center pt-6 pb-4 desktop:hidden">
        <LazyMotion features={loadDomMax}>
          <CardStack
            picks={picks}
            setIdx={setIdx}
            index={index}
            move={move}
            motion={motion}
            onGo={onGo}
          />
        </LazyMotion>
        <Pager index={index} />
      </div>
      <div className="flex flex-col gap-3 desktop:hidden">
        <div className="flex items-center justify-between">
          <PressButton
            motion={motion}
            variant="icon"
            aria-label={homeCopy.actions.previous}
            onClick={() => onGo(-1)}
          >
            <ChevronLeft aria-hidden className="size-5.5" strokeWidth={2} />
          </PressButton>
          <PressButton motion={motion} variant="secondary" onClick={onReroll}>
            <Shuffle aria-hidden className="size-4.5" strokeWidth={2} />
            {homeCopy.actions.reroll}
          </PressButton>
          <PressButton
            motion={motion}
            variant="icon"
            aria-label={homeCopy.actions.next}
            onClick={() => onGo(1)}
          >
            <ChevronRight aria-hidden className="size-5.5" strokeWidth={2} />
          </PressButton>
        </div>
        <PressButton motion={motion} variant="primary" className="w-full">
          <Navigation aria-hidden className="size-4.5" strokeWidth={2.2} />
          {homeCopy.actions.directions}
        </PressButton>
      </div>

      {/* 데스크톱: 카드 3장 세로 */}
      <div className="hidden flex-1 flex-col desktop:flex">
        <DesktopList
          picks={picks}
          setIdx={setIdx}
          index={index}
          motion={motion}
          onSelect={onSelect}
        />
        <div className="mt-6 flex items-center gap-3">
          <PressButton motion={motion} variant="secondary" onClick={onReroll}>
            <Shuffle aria-hidden className="size-4.5" strokeWidth={2} />
            {homeCopy.actions.reroll}
          </PressButton>
          <PressButton motion={motion} variant="primary" className="flex-1">
            <Navigation aria-hidden className="size-4.5" strokeWidth={2.2} />
            {homeCopy.actions.directions}
          </PressButton>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 카드 스택 (모바일)                                                    */
/* ------------------------------------------------------------------ */

function CardStack({
  picks,
  setIdx,
  index,
  move,
  motion,
  onGo,
}: {
  picks: MockPick;
  setIdx: number;
  index: number;
  move: Step;
  motion: DesignMotionTokens;
  onGo: (step: 1 | -1, throwSign?: 1 | -1) => void;
}) {
  return (
    <section
      aria-roledescription={copy.stack.roleDescription}
      aria-label={copy.stack.label}
      className="relative mx-auto aspect-[350/412] w-full"
    >
      <p className="sr-only">{copy.stack.swipeHint}</p>
      {/* "다시 뽑기": 앞 세트가 아래로 빠지고 새 세트가 뒤에서부터 차례로 올라온다 */}
      <AnimatePresence initial={false}>
        <m.div
          key={setIdx}
          className="absolute inset-0"
          exit={{
            y: 56,
            opacity: 0,
            transition: tweenOf(motion, "base", "exit"),
          }}
        >
          <StackSet
            picks={picks}
            index={index}
            move={move}
            motion={motion}
            onGo={onGo}
          />
        </m.div>
      </AnimatePresence>
    </section>
  );
}

function StackSet({
  picks,
  index,
  move,
  motion,
  onGo,
}: {
  picks: MockPick;
  index: number;
  move: Step;
  motion: DesignMotionTokens;
  onGo: (step: 1 | -1, throwSign?: 1 | -1) => void;
}) {
  // 처음 붙을 때만 딜링 지연을 준다. 이후 깊이 이동은 지연 없이 스프링.
  const [dealt, setDealt] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setDealt(true), 400);
    return () => window.clearTimeout(t);
  }, []);
  const shuffle = springOf(motion, "shuffle");
  const stagger = staggerOf(motion);
  const front = picks[index]!;
  const backs = [1, 2].map((d) => ({
    depth: d as 1 | 2,
    place: picks[(index + d) % TOTAL]!,
  }));

  return (
    <>
      {backs
        .slice()
        .reverse()
        .map(({ depth, place }) => (
          <m.div
            key={place.id}
            aria-hidden
            className="absolute inset-x-0 top-0 bottom-4 origin-bottom rounded-card shadow-lg"
            style={{ ...catSurface(place.category), zIndex: 3 - depth }}
            initial={{ y: 72, opacity: 0, scale: DEPTH[depth].scale }}
            animate={{
              y: DEPTH[depth].y,
              scale: DEPTH[depth].scale,
              opacity: 1,
              transition: {
                ...shuffle,
                delay: dealt ? 0 : (2 - depth) * stagger,
              },
            }}
          />
        ))}
      <AnimatePresence initial custom={move}>
        <FrontCard
          key={front.id}
          place={front}
          index={index}
          move={move}
          motion={motion}
          dealDelay={dealt ? 0 : 2 * stagger}
          onGo={onGo}
        />
      </AnimatePresence>
    </>
  );
}

const frontVariants: Variants = {
  initial: (c: Step & { fresh: boolean }) =>
    c.fresh
      ? { y: 72, opacity: 0, x: 0, rotate: 0, scale: 1 }
      : c.step === 1
        ? { y: DEPTH[1].y, scale: DEPTH[1].scale, opacity: 1, x: 0, rotate: 0 }
        : { x: -c.throwSign * 380, rotate: -c.throwSign * 8, opacity: 0 },
  exit: (c: Step) => ({
    x: c.throwSign * 440,
    rotate: c.throwSign * 10,
    opacity: 0,
  }),
};

function FrontCard({
  place,
  index,
  move,
  motion,
  dealDelay,
  onGo,
}: {
  place: MockPlace;
  index: number;
  move: Step;
  motion: DesignMotionTokens;
  dealDelay: number;
  onGo: (step: 1 | -1, throwSign?: 1 | -1) => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-6, 0, 6]);
  const swipe = springOf(motion, "swipe");
  const [fresh] = useState(dealDelay > 0);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    if (offset.x < -SWIPE_OFFSET || velocity.x < -SWIPE_VELOCITY) {
      onGo(1, -1);
    } else if (offset.x > SWIPE_OFFSET || velocity.x > SWIPE_VELOCITY) {
      onGo(-1, 1);
    }
  };
  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      onGo(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      onGo(-1);
    }
  };

  return (
    <m.article
      role="group"
      aria-roledescription={copy.stack.slideRoleDescription}
      aria-label={`${place.name}, ${copy.stack.position(index + 1, TOTAL)}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      custom={{ ...move, fresh }}
      variants={frontVariants}
      initial="initial"
      animate={{
        x: 0,
        y: 0,
        scale: 1,
        rotate: 0,
        opacity: 1,
        transition: fresh
          ? { ...springOf(motion, "shuffle"), delay: dealDelay }
          : swipe,
      }}
      exit="exit"
      transition={swipe}
      drag="x"
      dragSnapToOrigin
      dragElastic={0.7}
      dragTransition={{
        bounceStiffness: motion.spring.swipe.stiffness,
        bounceDamping: motion.spring.swipe.damping,
      }}
      onDragEnd={onDragEnd}
      whileTap={{ scale: 0.98 }}
      style={{ x, rotate, zIndex: 5 }}
      className={cn(
        "absolute inset-x-0 top-0 bottom-4 flex origin-bottom cursor-grab touch-pan-y flex-col overflow-hidden rounded-card bg-card text-card-foreground shadow-md select-none active:cursor-grabbing",
        focusRing,
      )}
    >
      <CardArt place={place} className="h-[48%]" />
      <div className="flex min-h-0 flex-1 flex-col justify-between gap-3 p-5">
        <h2 className="line-clamp-2 type-heading">{place.name}</h2>
        <NumberRow place={place} />
        <p className="truncate type-body-sm text-muted-foreground">
          {place.reason}
        </p>
      </div>
    </m.article>
  );
}

/** 카드 위쪽: 카테고리 색면 + 일러스트, 왼쪽 아래 카테고리 라벨, 오른쪽 위 배지 */
function CardArt({
  place,
  className,
  badges = true,
}: {
  place: MockPlace;
  className?: string;
  badges?: boolean;
}) {
  return (
    <div className={cn("relative w-full shrink-0", className)}>
      <IllustrationA
        category={place.category}
        className="pointer-events-none size-full"
      />
      <span
        className="absolute bottom-3 left-3 inline-flex h-6 items-center rounded-badge px-2 type-caption font-semibold"
        style={{ ...catSurface(place.category), ...catInk(place.category) }}
      >
        {categoryLabel(place.category)}
      </span>
      {badges && place.statusBadges.length > 0 ? (
        <span className="absolute top-3 right-3 flex gap-1.5">
          {place.statusBadges.map((b) => (
            <Badge key={b} kind={b} />
          ))}
        </span>
      ) : null}
    </div>
  );
}

/** 현재 위치 표시. 활성은 길게, 포인트 색은 쓰지 않는다 */
function Pager({ index }: { index: number }) {
  return (
    <div aria-hidden className="mt-5 flex justify-center gap-1.5">
      {Array.from({ length: TOTAL }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1 rounded-full transition-[width,background-color] duration-(--lm-duration-base) ease-standard",
            i === index ? "w-5 bg-foreground" : "w-1.5 bg-border",
          )}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 데스크톱 리스트                                                       */
/* ------------------------------------------------------------------ */

function DesktopList({
  picks,
  setIdx,
  index,
  motion,
  onSelect,
}: {
  picks: MockPick;
  setIdx: number;
  index: number;
  motion: DesignMotionTokens;
  onSelect: (i: number) => void;
}) {
  const stagger = staggerOf(motion);
  return (
    <ul aria-label={copy.stack.label} className="mt-8 flex flex-col gap-2">
      {picks.map((place, i) => {
        const on = i === index;
        return (
          <m.li
            key={`${setIdx}-${place.id}`}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ...springOf(motion, "shuffle"), delay: i * stagger }}
          >
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onSelect(i)}
              className={cn(
                "grid w-full cursor-pointer grid-cols-[9rem_1fr] overflow-hidden rounded-card text-left transition-[background-color,box-shadow] duration-(--lm-duration-base) ease-standard",
                on ? "bg-card shadow-md" : "bg-transparent hover:bg-card/60",
                focusRing,
              )}
            >
              <span
                className={cn(
                  "relative overflow-hidden",
                  on ? "" : "rounded-card",
                )}
              >
                <CardArt place={place} className="h-full" badges={false} />
              </span>
              <span className="flex min-w-0 flex-col gap-3 px-5 py-4">
                <span className="flex flex-col gap-1">
                  <span className="type-heading">{place.name}</span>
                  <span className="truncate type-body-sm text-muted-foreground">
                    {place.reason}
                  </span>
                </span>
                <NumberRow place={place} size="md" />
                {place.statusBadges.length > 0 ? (
                  <span className="flex gap-1.5">
                    {place.statusBadges.map((b) => (
                      <Badge key={b} kind={b} />
                    ))}
                  </span>
                ) : null}
              </span>
            </button>
          </m.li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* 로딩: 실제 레이아웃과 같은 모양의 스켈레톤                              */
/* ------------------------------------------------------------------ */

function HomeSkeleton({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className="flex flex-1 flex-col"
    >
      {/* 모바일 */}
      <div className="flex flex-1 flex-col justify-center pt-6 pb-4 desktop:hidden">
        <div className="relative mx-auto aspect-[350/412] w-full">
          <div className="absolute inset-x-0 top-0 bottom-4 origin-bottom translate-y-4 scale-[0.92] rounded-card bg-skeleton" />
          <div className="absolute inset-x-0 top-0 bottom-4 origin-bottom translate-y-2 scale-[0.96] rounded-card bg-skeleton/70" />
          <div className="absolute inset-x-0 top-0 bottom-4 flex flex-col overflow-hidden rounded-card bg-card shadow-md">
            <div className={cn("h-[48%]", skel)} />
            <div className="flex flex-1 flex-col justify-between p-5">
              <div className={cn("h-6 w-1/2 rounded-md", skel)} />
              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className={cn("h-7 w-12 rounded-md", skel)} />
                    <div className={cn("h-3 w-8 rounded-sm", skel)} />
                  </div>
                ))}
              </div>
              <div className={cn("h-4 w-3/4 rounded-sm", skel)} />
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-center gap-1.5">
          <span className="h-1 w-5 rounded-full bg-skeleton" />
          <span className="h-1 w-1.5 rounded-full bg-skeleton" />
          <span className="h-1 w-1.5 rounded-full bg-skeleton" />
        </div>
      </div>
      <div className="flex flex-col gap-3 desktop:hidden">
        <div className="flex items-center justify-between">
          <div className="size-12 rounded-full bg-skeleton" />
          <div className="h-12 w-32 rounded-button bg-skeleton" />
          <div className="size-12 rounded-full bg-skeleton" />
        </div>
        <div className="h-13 w-full rounded-button bg-skeleton" />
      </div>
      {/* 데스크톱 */}
      <div className="mt-8 hidden flex-col gap-2 desktop:flex">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "grid h-40 grid-cols-[9rem_1fr] overflow-hidden rounded-card",
              i === 0 && "bg-card shadow-md",
            )}
          >
            <div className={cn(skel, i !== 0 && "rounded-card")} />
            <div className="flex flex-col gap-3 px-5 py-4">
              <div className={cn("h-5 w-1/2 rounded-md", skel)} />
              <div className={cn("h-3.5 w-3/4 rounded-sm", skel)} />
              <div className="mt-auto flex gap-4">
                <div className={cn("h-6 w-10 rounded-md", skel)} />
                <div className={cn("h-6 w-14 rounded-md", skel)} />
                <div className={cn("h-6 w-10 rounded-md", skel)} />
              </div>
            </div>
          </div>
        ))}
        <div className="mt-4 flex gap-3">
          <div className="h-12 w-32 rounded-button bg-skeleton" />
          <div className="h-13 flex-1 rounded-button bg-skeleton" />
        </div>
      </div>
    </div>
  );
}
