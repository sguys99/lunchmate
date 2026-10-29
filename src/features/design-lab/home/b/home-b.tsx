"use client";
// 홈 시안 B "피크 캐러셀" (T3.1, REC-04).
//
// 의도: 가운데 한 곳을 보면서 양옆 두 곳의 가장자리도 함께 보인다. 넘기기 전에 다음이 있다는 걸 안다.
// 구성: 머리 → 어제 피드백 카드 → 가로 캐러셀(화면 끝까지 번지는 트랙, 카드 폭 = 화면 - 72px) → 이전/다음과 위치 막대
//       → 다시 뽑기, 그냥 골라줘 두 버튼 → 진입점 알약 두 개.
// 카드: 세로형. 일러스트 112px가 위 왼쪽에서 먼저 보이고, 식당명 세리프, 배지, 숫자는 18px 3칸(라벨 위, 1px 세로선)으로 낮춰 식당명과 일러스트가 먼저 읽히게 한다.
// 가운데 카드만 주 버튼(길찾기 올리브), 양옆 카드는 흐리게(opacity) 두고 버튼도 테두리로 바꾼다(한 화면 주 버튼 1개).
// 구현: Embla 없이 CSS scroll-snap(번들 0). 스크롤 위치로 가운데 카드를 계산하고, 버튼과 ←/→/Home/End 키는 scrollTo로 움직인다.
//       축소 모드면 smooth 스크롤 대신 즉시 이동.
// 모션: 손가락 스크롤 자체(브라우저), 양옆 카드 흐림 전환(CSS, base), 다시 뽑기 셔플(ShuffleSwap). 첫 화면은 CSS 페이드(D-04).
// 데스크톱: 같은 캐러셀을 좌 칸 폭에 맞춰 두고, 지도 핀이 가운데 카드를 따라간다.
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { LoadingRegion, SkeletonLine } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { designLabHomeCopy } from "@/copy/design-lab-home";
import type { MockPick, MockPlace } from "@/features/design-lab/mock";
import { getHomeContent } from "@/features/design-lab/system/states";
import { keyTarget } from "@/features/rec/swipe-stack";
import { CategoryIllustration } from "@/features/place/illustrations";
import { useMotionReduced } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { CardBadges, CategoryCaption, NumberGrid } from "../shared/card-bits";
import { HomeHeader, JustPickButton, RerollButton } from "../shared/controls";
import { JustPickLayer, useJustPick } from "../shared/just-pick";
import { EntryLinks } from "../shared/entries";
import { YesterdayFeedback } from "../shared/feedback";
import {
  HomeColumn,
  HomeFrame,
  HomeMap,
  HomeStateMessage,
} from "../shared/frame";
import { ShuffleBlock, ShuffleSwap } from "../shared/shuffle";
import { useHomeLab } from "../shared/use-home-lab";
import type { HomeVariantProps } from "../types";

const copy = designLabHomeCopy.screen;

/** 트랙을 화면 끝까지 번지게 하고 첫 카드 가운데 정렬 여백을 둔다. 슬라이드는 relative: 안쪽 sr-only(absolute)가 트랙 밖 기준으로 잡혀 페이지 가로 스크롤을 만들지 않게 */
const trackClass =
  "-mx-(--lm-layout-gutter) flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-11 [scrollbar-width:none] desktop:-mx-10 desktop:px-14 [&::-webkit-scrollbar]:hidden";
const slideClass = "relative w-full shrink-0 snap-center snap-always";

export function HomeB({ state }: HomeVariantProps) {
  const content = getHomeContent(state);
  const lab = useHomeLab();
  const [active, setActive] = useState(0);
  /** 그냥 골라줘(T3.3) 결과로 캐러셀을 옮겨 달라는 요청. n이 바뀔 때마다 한 번 */
  const [scrollRequest, setScrollRequest] = useState<ScrollRequest | null>(
    null,
  );
  const pick = useJustPick({
    variant: "b",
    picks: lab.picks,
    onSettle: (index) =>
      setScrollRequest((r) => ({ index, n: (r?.n ?? 0) + 1 })),
  });

  const header = (
    <HomeHeader
      meal={lab.meal}
      location={lab.location}
      onMeal={(meal) => {
        setActive(0);
        lab.setMeal(meal);
      }}
      onLocation={() => {
        setActive(0);
        lab.cycleLocation();
      }}
    />
  );

  if (content.kind !== "ready") {
    return (
      <HomeFrame>
        <HomeColumn>
          {header}
          {content.kind === "loading" ? (
            <LoadingB label={content.label} />
          ) : (
            <HomeStateMessage
              content={content}
              className="mt-auto pt-6 desktop:mt-12"
            />
          )}
        </HomeColumn>
      </HomeFrame>
    );
  }

  return (
    <HomeFrame map={<HomeMap picks={lab.picks} active={active} />}>
      <HomeColumn>
        {header}
        <p aria-live="polite" className="sr-only">
          {lab.announcement}
        </p>

        <YesterdayFeedback layout="card" className="mt-7" />

        <ShuffleSwap round={lab.round} className="mt-8">
          <Carousel
            picks={lab.picks}
            active={active}
            onActive={setActive}
            request={scrollRequest}
          />
        </ShuffleSwap>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <RerollButton
            onClick={() => {
              setActive(0);
              lab.reroll();
            }}
          />
          <JustPickButton pick={pick} from={active} />
        </div>

        <EntryLinks layout="pills" className="mt-10" />
        <JustPickLayer pick={pick} picks={lab.picks} />
      </HomeColumn>
    </HomeFrame>
  );
}

/* ---------- 캐러셀 ---------- */

type ScrollRequest = { index: number; n: number };

function Carousel({
  picks,
  active,
  onActive,
  request,
}: {
  picks: MockPick;
  active: number;
  onActive: (i: number) => void;
  /** 바깥(그냥 골라줘 결과)에서 이 카드로 옮겨 달라는 요청 */
  request: ScrollRequest | null;
}) {
  const track = useRef<HTMLUListElement>(null);
  const frame = useRef(0);
  const reduced = useMotionReduced();
  const [announcement, setAnnouncement] = useState("");
  const total = picks.length;

  /** 트랙 가운데에 가장 가까운 카드 */
  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    Array.from(el.children).forEach((child, i) => {
      const c = child as HTMLElement;
      const dist = Math.abs(c.offsetLeft + c.offsetWidth / 2 - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    if (best !== active) {
      onActive(best);
      setAnnouncement(
        copy.deck.announce(best + 1, total, picks[best]?.name ?? ""),
      );
    }
  }, [active, onActive, picks, total]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function onScroll() {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(measure);
  }

  function goTo(i: number) {
    const el = track.current;
    const child = el?.children[i] as HTMLElement | undefined;
    if (!el || !child || i < 0 || i >= total) return;
    el.scrollTo({
      left: child.offsetLeft - (el.clientWidth - child.offsetWidth) / 2,
      behavior: reduced ? "auto" : "smooth",
    });
  }

  const requestN = request?.n ?? 0;
  const requestIndex = request?.index ?? 0;
  useEffect(() => {
    if (requestN === 0) return;
    const el = track.current;
    const child = el?.children[requestIndex] as HTMLElement | undefined;
    if (!el || !child) return;
    el.scrollTo({
      left: child.offsetLeft - (el.clientWidth - child.offsetWidth) / 2,
      behavior: "auto",
    });
  }, [requestN, requestIndex]);

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) return;
    const target = keyTarget(event.key, active, total);
    if (target === null) return;
    event.preventDefault();
    goTo(target);
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label={copy.listLabel}
      className="flex flex-col gap-5"
    >
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <p id="home-b-hint" className="sr-only">
        {copy.deck.hint}
      </p>
      <ul
        ref={track}
        tabIndex={0}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        aria-describedby="home-b-hint"
        className={cn(
          trackClass,
          "rounded-card py-1 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid",
        )}
      >
        {picks.map((p, i) => (
          <li
            key={p.id}
            role="group"
            aria-roledescription="slide"
            aria-label={copy.deck.slide(i + 1, total)}
            className={slideClass}
          >
            <CardB
              place={p}
              current={i === active}
              order={i}
              onFocusCard={() => goTo(i)}
            />
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between">
        <Button
          size="icon"
          aria-label={copy.deck.previous}
          disabled={active === 0}
          focusableWhenDisabled
          onClick={() => goTo(active - 1)}
        >
          <ChevronLeft aria-hidden strokeWidth={1.5} />
        </Button>
        {/* 위치 막대: 지금 카드만 길고 진하다. 누르면 그 카드로 */}
        <ol aria-hidden className="flex items-center gap-1.5">
          {picks.map((p, i) => (
            <li key={p.id}>
              <span
                className={cn(
                  "block h-0.5 rounded-full transition-[width,background-color] duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
                  i === active ? "w-6 bg-foreground" : "w-3 bg-border",
                )}
              />
            </li>
          ))}
        </ol>
        <Button
          size="icon"
          aria-label={copy.deck.next}
          disabled={active === total - 1}
          focusableWhenDisabled
          onClick={() => goTo(active + 1)}
        >
          <ChevronRight aria-hidden strokeWidth={1.5} />
        </Button>
      </div>
    </section>
  );
}

/** 세로형 카드. current가 아니면 흐리게 두고 주 버튼을 테두리로 바꾼다 */
function CardB({
  place,
  current,
  order,
  onFocusCard,
}: {
  place: MockPlace;
  current: boolean;
  order: number;
  onFocusCard: () => void;
}) {
  return (
    <article
      aria-label={place.name}
      onFocus={current ? undefined : onFocusCard}
      className={cn(
        "flex h-full flex-col rounded-card border border-border bg-card p-6 text-card-foreground transition-opacity duration-(--lm-duration-base) ease-standard motion-reduce:transition-none @max-[23.75rem]/screen:p-5",
        !current && "opacity-45",
      )}
    >
      <ShuffleBlock index={order} className="flex flex-1 flex-col">
        <CategoryIllustration
          slug={place.category}
          size={112}
          className="-mt-3 -ml-3"
        />
        <CategoryCaption place={place} className="mt-1" />
        <h2 className="mt-2 line-clamp-2 type-heading text-balance break-keep">
          {place.name}
        </h2>
        <div className="mt-3 min-h-6">
          <CardBadges place={place} />
        </div>
        <NumberGrid place={place} size="md" className="mt-6" />
        <p className="mt-3 line-clamp-2 min-h-[3.1em] type-body-sm text-muted-foreground">
          {place.reason}
        </p>
        <Button
          variant={current ? "primary" : "secondary"}
          tabIndex={current ? undefined : -1}
          aria-label={copy.actions.directionsTo(place.name)}
          className="mt-6 w-full"
        >
          {copy.actions.directions}
        </Button>
      </ShuffleBlock>
    </article>
  );
}

/* ---------- 로딩 ---------- */

function LoadingB({ label }: { label: string }) {
  return (
    <LoadingRegion label={label} className="mt-7 flex flex-col">
      <Skeleton className="h-28 w-full rounded-card" />
      <div aria-hidden className={cn(trackClass, "mt-8 overflow-hidden py-1")}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              slideClass,
              "flex flex-col rounded-card border border-border bg-card p-6",
              i > 0 && "opacity-45",
            )}
          >
            <Skeleton className="mt-1 size-[3.25rem] rounded-full" />
            <SkeletonLine
              type="caption"
              lineClassName="mt-10"
              className="w-12"
            />
            <SkeletonLine
              type="heading"
              lineClassName="mt-2"
              className="w-32"
            />
            <SkeletonLine
              type="label"
              lineClassName="mt-12"
              className="w-4/5"
            />
            <SkeletonLine
              type="body-sm"
              lineClassName="mt-3"
              className="w-3/5"
            />
            <Skeleton className="mt-8 h-12 w-full rounded-button" />
          </div>
        ))}
      </div>
      <div aria-hidden className="mt-5 flex items-center justify-between">
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="h-0.5 w-12" />
        <Skeleton className="size-12 rounded-full" />
      </div>
    </LoadingRegion>
  );
}
