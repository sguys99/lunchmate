"use client";
// 시안 A "Terracotta Table" 비교 화면 2: 바텀시트 식당 상세 + 투표 득표 바 (T1.12, T1.13).
// 모바일: 지도 면 위에 Base UI Drawer 바텀시트(스냅 2단). 데스크톱: 좌 상세 패널 + 우 지도 면.
// 시안 A 규칙: 시트가 열리면 시트의 주 버튼(길찾기)이 화면의 유일한 포인트 버튼이다.
// 득표 바는 1위만 테라코타 실색, 나머지는 chart-3(밝은 캐러멜). 길이는 bar 스프링, 숫자는 NumberFlow.
import NumberFlow from "@number-flow/react";
import {
  Check,
  Clock,
  MapPin as MapPinIcon,
  Navigation,
  Phone,
  RotateCw,
  Share2,
  Tag,
  TriangleAlert,
  X,
} from "lucide-react";
import * as m from "motion/react-m";
import { useState, type ReactNode } from "react";
import { designLabACopy as copy } from "@/copy/design-lab-a";
import { homeCopy, placeDetailCopy, pollPreviewCopy } from "@/copy/home";
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHandle,
  DrawerPopup,
  DrawerPortal,
  DrawerTitle,
  DrawerViewport,
} from "@/components/ui/drawer";
import { IllustrationA } from "@/features/design-lab/illustrations/a";
import {
  MOCK_DETAIL_PLACE,
  getMockPlace,
  type MockPlace,
  type MockPlaceId,
  type MockPoll,
} from "@/features/design-lab/mock";
import { categoryLabel } from "@/features/place/categories";
import { formatWon } from "@/lib/format";
import { msUntil } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useDesignPortalContainer } from "../design-scope";
import { DesktopSplit } from "../desktop-split";
import { springOf, staggerOf, usePrefersReducedMotion } from "../motion";
import { getSheetContent, type SheetContent } from "../states";
import { ACTIVE_TAB_BY_SCREEN } from "../tabs";
import type { DesignMotionTokens, DesignScreenProps } from "../types";
import { kstHHMM } from "./format";
import {
  DesktopNav,
  MapSurface,
  NumberRow,
  PressButton,
  StateArt,
  TabBar,
  focusRing,
  skel,
  type MapPin,
} from "./parts";

/** 스냅: 40rem(상세 + 득표가 한눈에), 전체. a.DESIGN.md 5장 바텀시트 */
const SNAP_POINTS = ["40rem", 1] as const;

/** 지도 위 투표 후보 자리 (목업, %) */
const PIN_SPOTS = [
  { x: 44, y: 14 },
  { x: 78, y: 8 },
  { x: 18, y: 9 },
  { x: 74, y: 30 },
] as const;

export function SheetScreenA({ state, tokens }: DesignScreenProps) {
  const content = getSheetContent(state);
  const container = useDesignPortalContainer();
  const [open, setOpen] = useState(true);
  const [snap, setSnap] = useState<number | string | null>(SNAP_POINTS[0]);
  const place = "place" in content ? content.place : MOCK_DETAIL_PLACE;
  const placeName = content.kind === "loading" ? null : place.name;

  const pins: MapPin[] = ("poll" in content ? content.poll.candidates : []).map(
    (c, i) => ({
      id: c.placeId,
      name: getMockPlace(c.placeId).name,
      ...PIN_SPOTS[i % PIN_SPOTS.length]!,
    }),
  );
  const map = (
    <MapSurface
      pins={pins}
      selectedId={place.id}
      onPinClick={(id) => {
        if (id === place.id) setOpen(true);
      }}
      pinLabel={(pin) => copy.map.openDetail(pin.name)}
    />
  );

  return (
    <div className="flex flex-1 flex-col overflow-x-clip break-keep">
      {/* 모바일: 지도 전체 + 바텀시트 */}
      <div className="relative flex min-h-[calc(100dvh-var(--lm-layout-tab-bar-height))] flex-1 flex-col desktop:hidden">
        {map}
      </div>
      <TabBar active={ACTIVE_TAB_BY_SCREEN.sheet} className="desktop:hidden" />

      {/* 데스크톱: 좌 상세 패널 + 우 지도 */}
      <div className="hidden flex-1 flex-col desktop:flex">
        <DesktopSplit
          list={
            <div className="mx-auto flex w-full max-w-(--lm-layout-desktop-list-max-width) flex-col gap-8 pt-8 pb-10">
              <DesktopNav active={ACTIVE_TAB_BY_SCREEN.sheet} />
              <section
                aria-label={placeName ?? homeCopy.states.loading.label}
                className="rounded-sheet bg-card p-6 text-card-foreground shadow-md"
              >
                <SheetBody
                  content={content}
                  motion={tokens.motion}
                  Title={({ children, className }) => (
                    <h1 className={cn("type-title", className)}>{children}</h1>
                  )}
                />
              </section>
            </div>
          }
          map={
            <div className="sticky top-0 flex h-dvh max-h-full min-h-[32rem] flex-col p-3 pl-0">
              <div className="flex flex-1 overflow-hidden rounded-card">
                {map}
              </div>
            </div>
          }
        />
      </div>

      <Drawer
        open={open}
        onOpenChange={setOpen}
        modal={false}
        disablePointerDismissal
        snapPoints={[...SNAP_POINTS]}
        snapPoint={snap}
        onSnapPointChange={setSnap}
      >
        <DrawerPortal container={container}>
          <DrawerBackdrop className="bottom-(--lm-layout-tab-bar-height) z-30 desktop:hidden" />
          <DrawerViewport className="bottom-(--lm-layout-tab-bar-height) z-30 overflow-hidden desktop:hidden">
            <DrawerPopup className="mx-auto break-keep">
              <DrawerHandle className="mt-3 mb-1 h-1 w-9 bg-border" />
              <DrawerContent className="pt-3">
                {content.kind === "loading" ? (
                  <DrawerDescription className="sr-only">
                    {content.label}
                  </DrawerDescription>
                ) : null}
                <SheetBody
                  content={content}
                  motion={tokens.motion}
                  Title={({ children, className }) => (
                    <DrawerTitle className={cn("type-title", className)}>
                      {children}
                    </DrawerTitle>
                  )}
                  closeSlot={
                    <DrawerClose
                      aria-label={copy.sheet.close}
                      className={cn(
                        "-mt-1 -mr-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-secondary",
                        focusRing,
                      )}
                    >
                      <X aria-hidden className="size-5" strokeWidth={2} />
                    </DrawerClose>
                  }
                />
              </DrawerContent>
            </DrawerPopup>
          </DrawerViewport>
        </DrawerPortal>
      </Drawer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 시트 본문 (모바일 시트와 데스크톱 패널이 함께 쓴다)                      */
/* ------------------------------------------------------------------ */

type TitleSlot = (props: {
  children: ReactNode;
  className?: string;
}) => ReactNode;

function SheetBody({
  content,
  motion,
  Title,
  closeSlot,
}: {
  content: SheetContent;
  motion: DesignMotionTokens;
  Title: TitleSlot;
  closeSlot?: ReactNode;
}) {
  if (content.kind === "loading") {
    return <SheetSkeleton label={content.label} closeSlot={closeSlot} />;
  }
  if (!("place" in content)) {
    return (
      <div className="flex flex-col gap-5 pb-2">
        <div className="flex items-start gap-4">
          <div className="size-18 shrink-0 overflow-hidden rounded-2xl">
            <StateArt
              kind={content.kind}
              className="[&_svg]:size-5 [&>span]:size-11"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-1">
            <Title className="type-heading">{content.title}</Title>
            <p className="type-body-sm text-muted-foreground">{content.body}</p>
          </div>
          {closeSlot}
        </div>
        <PressButton motion={motion} variant="primary" className="w-full">
          <RotateCw aria-hidden className="size-4.5" strokeWidth={2.2} />
          {content.action}
        </PressButton>
      </div>
    );
  }

  const { place, poll } = content;
  return (
    <div className="flex flex-col gap-6 pb-2">
      <PlaceHeader place={place} Title={Title} closeSlot={closeSlot} />
      <NumberRow place={place} size="md" />
      <PlaceNotes place={place} />
      <div className="flex items-center gap-2.5">
        <PressButton motion={motion} variant="primary" className="flex-1">
          <Navigation aria-hidden className="size-4.5" strokeWidth={2.2} />
          {homeCopy.actions.directions}
        </PressButton>
        <PressButton
          motion={motion}
          variant="icon"
          aria-label={placeDetailCopy.call}
        >
          <Phone aria-hidden className="size-5" strokeWidth={1.9} />
        </PressButton>
        <PressButton
          motion={motion}
          variant="icon"
          aria-label={placeDetailCopy.share}
        >
          <Share2 aria-hidden className="size-5" strokeWidth={1.9} />
        </PressButton>
      </div>
      <PollPanel
        poll={poll}
        motion={motion}
        message={content.kind === "empty" ? content.message : null}
      />
      <PlaceInfo place={place} />
      <PlaceMenu place={place} />
    </div>
  );
}

function PlaceHeader({
  place,
  Title,
  closeSlot,
}: {
  place: MockPlace;
  Title: TitleSlot;
  closeSlot?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="size-18 shrink-0 overflow-hidden rounded-2xl shadow-sm">
        <IllustrationA category={place.category} className="size-full" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
        <Title>{place.name}</Title>
        <p className="flex items-center gap-2 type-caption text-muted-foreground">
          <span>{categoryLabel(place.category)}</span>
          <span aria-hidden className="h-3 w-px bg-border" />
          <span>{placeDetailCopy.reviewCount(place.reviewCount)}</span>
        </p>
      </div>
      {closeSlot}
    </div>
  );
}

/** 웨이팅 제보와 할인 정보. 할인은 표시만 하고 포인트 색을 쓰지 않는다(info) */
function PlaceNotes({ place }: { place: MockPlace }) {
  const notes: {
    key: string;
    cls: string;
    Icon: typeof Clock;
    text: string;
  }[] = [];
  if (place.waiting) {
    notes.push({
      key: "waiting",
      cls: "bg-warning-surface text-warning-foreground",
      Icon: Clock,
      text: homeCopy.waitingReport(
        place.waiting.minutesAgo,
        homeCopy.waitingLevels[place.waiting.level],
      ),
    });
  }
  if (place.deal) {
    notes.push({
      key: "deal",
      cls: "bg-info-surface text-info-foreground",
      Icon: Tag,
      text: place.deal.title,
    });
  }
  if (notes.length === 0) return null;
  return (
    <ul className="-mt-2 flex flex-wrap gap-2">
      {notes.map(({ key, cls, Icon, text }) => (
        <li
          key={key}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-badge px-2.5 type-caption",
            cls,
          )}
        >
          <Icon aria-hidden className="size-3.5" strokeWidth={2} />
          {text}
        </li>
      ))}
    </ul>
  );
}

function PlaceInfo({ place }: { place: MockPlace }) {
  const rows = [
    { label: placeDetailCopy.hours, Icon: Clock, text: place.hours },
    { label: placeDetailCopy.address, Icon: MapPinIcon, text: place.address },
    { label: placeDetailCopy.phone, Icon: Phone, text: place.phone },
  ];
  return (
    <dl className="flex flex-col gap-3">
      {rows.map(({ label, Icon, text }) => (
        <div key={label} className="grid grid-cols-[1.25rem_1fr] gap-3">
          <dt className="flex h-[1.4rem] items-center text-muted-foreground">
            <Icon aria-hidden className="size-4" strokeWidth={1.9} />
            <span className="sr-only">{label}</span>
          </dt>
          <dd className="type-body-sm tabular-nums">{text}</dd>
        </div>
      ))}
    </dl>
  );
}

function PlaceMenu({ place }: { place: MockPlace }) {
  return (
    <section aria-labelledby="a-sheet-menu" className="flex flex-col gap-1">
      <h3 id="a-sheet-menu" className="type-label">
        {placeDetailCopy.menu}
      </h3>
      <ul className="divide-y-[0.5px] divide-border">
        {place.menu.map((item) => (
          <li
            key={item.name}
            className="flex items-baseline justify-between gap-4 py-2.5"
          >
            <span className="type-body-sm">{item.name}</span>
            <span className="type-body-sm font-semibold tabular-nums">
              {formatWon(item.priceKRW)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 투표 득표 바                                                          */
/* ------------------------------------------------------------------ */

function PollPanel({
  poll,
  motion,
  message,
}: {
  poll: MockPoll;
  motion: DesignMotionTokens;
  message: string | null;
}) {
  const reduced = usePrefersReducedMotion();
  const [myVote, setMyVote] = useState(poll.myVotePlaceId);
  const [votes, setVotes] = useState(() =>
    Object.fromEntries(poll.candidates.map((c) => [c.placeId, c.votes])),
  );
  const total = Math.max(
    1,
    Object.values(votes).reduce((a, b) => a + b, 0),
  );
  const top = Math.max(...Object.values(votes));
  const deadline = new Date(poll.deadlineAt);
  const minutesLeft = Math.ceil(
    msUntil(deadline, new Date(poll.mockNow)) / 60000,
  );
  const barTransition = reduced ? { duration: 0 } : springOf(motion, "bar");
  const stagger = staggerOf(motion);

  const vote = (id: MockPlaceId) => {
    setVotes((v) => {
      const next = { ...v };
      if (myVote) next[myVote] = Math.max(0, (next[myVote] ?? 0) - 1);
      if (myVote !== id) next[id] = (next[id] ?? 0) + 1;
      return next;
    });
    setMyVote((cur) => (cur === id ? null : id));
  };

  return (
    <section
      aria-labelledby="a-sheet-poll"
      className="flex flex-col gap-4 rounded-card bg-background p-4 pb-3"
    >
      <div className="flex items-end justify-between gap-3 px-1">
        <div className="flex flex-col gap-1">
          <h3 id="a-sheet-poll" className="type-label">
            {copy.sheet.pollTitle(poll.title)}
          </h3>
          <p className="flex items-center gap-2 type-caption text-muted-foreground">
            <span>{pollPreviewCopy.participants(poll.participantCount)}</span>
            <span aria-hidden className="h-3 w-px bg-border" />
            <span>{pollPreviewCopy.deadline(kstHHMM(deadline))}</span>
          </p>
        </div>
        <p className="flex items-baseline gap-0.5 text-accent-foreground">
          <NumberFlow value={minutesLeft} className="type-numeric-md" />
          <span className="type-caption">{copy.sheet.minutesLeftUnit}</span>
        </p>
      </div>
      {message ? (
        <p className="px-1 type-body-sm text-muted-foreground">{message}</p>
      ) : null}
      <ul className="flex flex-col">
        {poll.candidates.map((c, i) => {
          const p = getMockPlace(c.placeId);
          const n = votes[c.placeId] ?? 0;
          const leader = n > 0 && n === top;
          const mine = myVote === c.placeId;
          return (
            <li key={c.placeId}>
              <button
                type="button"
                aria-pressed={mine}
                aria-label={`${copy.sheet.voteFor(p.name)}, ${pollPreviewCopy.votes(n)}${leader ? `, ${copy.sheet.leader}` : ""}${c.avoidWarning ? `, ${homeCopy.badges.avoidWarning}` : ""}`}
                onClick={() => vote(c.placeId)}
                className={cn(
                  "grid w-full cursor-pointer grid-cols-[2.5rem_1fr_auto] items-center gap-3 rounded-xl px-1 py-2.5 text-left transition-colors duration-(--lm-duration-fast) ease-standard hover:bg-card/70",
                  focusRing,
                )}
              >
                <span className="relative size-10 overflow-hidden rounded-lg">
                  <IllustrationA category={p.category} className="size-full" />
                </span>
                <span className="flex min-w-0 flex-col gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      className={cn(
                        "truncate type-label text-[0.875rem]",
                        leader ? "font-bold" : "font-medium",
                      )}
                    >
                      {p.name}
                    </span>
                    {mine ? (
                      <span className="inline-flex h-5 shrink-0 items-center gap-0.5 rounded-badge bg-accent px-1.5 text-[0.6875rem] font-semibold text-accent-foreground">
                        <Check
                          aria-hidden
                          className="size-3"
                          strokeWidth={2.6}
                        />
                        {pollPreviewCopy.myVote}
                      </span>
                    ) : null}
                    {c.avoidWarning ? (
                      <span className="inline-flex h-5 shrink-0 items-center gap-0.5 rounded-badge bg-warning-surface px-1.5 text-[0.6875rem] font-semibold text-warning-foreground">
                        <TriangleAlert
                          aria-hidden
                          className="size-3"
                          strokeWidth={2.2}
                        />
                        {homeCopy.badges.avoidWarning}
                      </span>
                    ) : null}
                  </span>
                  <span className="relative h-2 overflow-hidden rounded-full bg-vote-bar-track">
                    <m.span
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full",
                        leader ? "bg-vote-bar" : "bg-chart-3",
                      )}
                      initial={{ width: "0%" }}
                      animate={{ width: `${(n / total) * 100}%` }}
                      transition={
                        reduced
                          ? barTransition
                          : { ...barTransition, delay: i * stagger }
                      }
                    />
                  </span>
                </span>
                <span className="flex min-w-11 items-baseline justify-end gap-0.5">
                  <NumberFlow
                    value={n}
                    className={cn(
                      "type-numeric-md",
                      leader ? "text-foreground" : "text-muted-foreground",
                    )}
                  />
                  <span className="type-caption text-muted-foreground">
                    {copy.sheet.votesUnit}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 로딩                                                                 */
/* ------------------------------------------------------------------ */

function SheetSkeleton({
  label,
  closeSlot,
}: {
  label: string;
  closeSlot?: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className="flex flex-col gap-6 pb-2"
    >
      <div className="flex items-start gap-4">
        <div className={cn("size-18 shrink-0 rounded-2xl", skel)} />
        <div className="flex flex-1 flex-col gap-2.5 pt-2">
          <div className={cn("h-6 w-2/3 rounded-md", skel)} />
          <div className={cn("h-3.5 w-1/3 rounded-sm", skel)} />
        </div>
        {closeSlot}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className={cn("h-5 w-12 rounded-md", skel)} />
            <div className={cn("h-3 w-8 rounded-sm", skel)} />
          </div>
        ))}
      </div>
      <div className="flex gap-2.5">
        <div className="h-13 flex-1 rounded-button bg-skeleton" />
        <div className="size-12 rounded-full bg-skeleton" />
        <div className="size-12 rounded-full bg-skeleton" />
      </div>
      <div className="flex flex-col gap-4 rounded-card bg-background p-4">
        <div className={cn("h-4 w-1/3 rounded-sm", skel)} />
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-3"
          >
            <div className={cn("size-10 rounded-lg", skel)} />
            <div className="flex flex-col gap-2">
              <div
                className={cn(
                  "h-3.5 rounded-sm",
                  skel,
                  i % 2 ? "w-1/3" : "w-1/2",
                )}
              />
              <div className="h-2 rounded-full bg-skeleton" />
            </div>
            <div className={cn("h-5 rounded-md", skel)} />
          </div>
        ))}
      </div>
    </div>
  );
}
