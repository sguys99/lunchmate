"use client";
// 시안 B "Quiet Stone" 비교 화면 2: 바텀시트 식당 상세 + 투표 득표 바 (T1.12, T1.13).
//
// 모바일: 지도 자리 위로 시트가 열린다(지도 탭 활성, ACTIVE_TAB_BY_SCREEN). 시트는 CSS ease-enter로만 올라와 오버슈트가 없다.
// 데스크톱: 같은 상세를 좌 열에 펼치고 우 열은 지도 자리. 시트는 쓰지 않는다.
// 득표 바: 후보를 누르면 내 선택이 바뀌고, 바는 bar 스프링(감쇠비 1.1)으로, 숫자는 NumberFlow로 base 시간만큼 굴러간다.
import NumberFlow from "@number-flow/react";
import * as m from "motion/react-m";
import { Check, X } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { quietStoneScreenCopy as copy } from "@/copy/design-lab-b";
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
import {
  getMockPlace,
  type MockPlace,
  type MockPlaceId,
  type MockPoll,
} from "@/features/design-lab/mock";
import { categoryLabel } from "@/features/place/categories";
import { formatWon } from "@/lib/format";
import { getKstParts, msUntil } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useDesignPortalContainer } from "../design-scope";
import { DesktopSplit, MapPlaceholder } from "../desktop-split";
import { springOf, usePrefersReducedMotion } from "../motion";
import { getSheetContent, type SheetContent } from "../states";
import type { DesignMotionTokens, DesignScreenProps } from "../types";
import {
  Badges,
  MapLines,
  MapPin,
  NumberRow,
  PIN_POSITIONS,
  PlaceHeading,
  PressButton,
  SkeletonBlock,
  StateMessage,
  TabBarB,
  buttonClass,
} from "./parts";

export function SheetScreenB({ state, tokens }: DesignScreenProps) {
  const content = getSheetContent(state);
  const [open, setOpen] = useState(true);
  const container = useDesignPortalContainer();
  const name =
    content.kind === "ready" || content.kind === "empty"
      ? content.place.name
      : null;

  return (
    <div className="flex flex-1 flex-col">
      <DesktopSplit
        list={
          <>
            {/* 모바일: 시트 뒤 지도 자리 */}
            <MapPlaceholder className="desktop:hidden">
              <MapLines />
              <MapPin
                label={name ?? ""}
                active
                position={PIN_POSITIONS[0]}
                className={name ? undefined : "hidden"}
              />
              {open ? null : (
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className={cn(
                    "absolute bottom-6 left-1/2 -translate-x-1/2",
                    buttonClass.outline,
                    "bg-card",
                  )}
                >
                  {name ? copy.sheet.open(name) : homeCopy.states.error.action}
                </button>
              )}
            </MapPlaceholder>
            {/* 데스크톱: 좌 열에 상세를 펼친다 */}
            <div className="hidden w-full max-w-(--lm-layout-desktop-list-max-width) flex-col px-10 pt-12 pb-14 desktop:mx-auto desktop:flex">
              <SheetBody content={content} motion={tokens.motion} inline />
            </div>
          </>
        }
        map={
          <MapPlaceholder className="border-l border-border desktop:sticky desktop:top-0 desktop:max-h-svh">
            <MapLines />
            {name ? (
              <MapPin label={name} active position={PIN_POSITIONS[0]} />
            ) : null}
          </MapPlaceholder>
        }
      />
      <TabBarB screen="sheet" />

      <Drawer
        open={open}
        onOpenChange={setOpen}
        modal={false}
        disablePointerDismissal
      >
        <DrawerPortal container={container}>
          <DrawerBackdrop className="desktop:hidden" />
          <DrawerViewport className="z-20 desktop:hidden">
            <DrawerPopup className="max-h-[calc(100%-3.5rem)] duration-(--lm-duration-slow) ease-enter data-ending-style:duration-(--lm-duration-fast) data-ending-style:ease-exit">
              <DrawerHandle className="mt-3 mb-1 h-1 w-9" />
              <DrawerClose
                aria-label={copy.sheet.close}
                className={cn(
                  "absolute top-3 right-4 inline-flex size-11 items-center justify-center rounded-button text-muted-foreground hover:bg-muted hover:text-foreground",
                  buttonClass.focusRing,
                )}
              >
                <X aria-hidden className="size-5" strokeWidth={1.5} />
              </DrawerClose>
              <SheetBody content={content} motion={tokens.motion} />
            </DrawerPopup>
          </DrawerViewport>
        </DrawerPortal>
      </Drawer>
    </div>
  );
}

/* ---------- 시트 본문 ---------- */

/**
 * inline이면 데스크톱 좌 열에 그대로 그린다(Drawer 컨텍스트 밖이라 DrawerTitle 대신 h1).
 * 시트 안에서는 본문이 스크롤되고 길찾기 줄은 아래에 붙는다.
 */
function SheetBody({
  content,
  motion,
  inline = false,
}: {
  content: SheetContent;
  motion: DesignMotionTokens;
  inline?: boolean;
}) {
  const Scroll = inline ? InlineFrame : DrawerContent;

  if (content.kind === "loading") {
    return (
      <Scroll className="px-(--lm-layout-gutter) pt-5">
        <div role="status" aria-label={content.label}>
          <span className="sr-only">{content.label}</span>
          {inline ? null : (
            <DrawerTitle className="sr-only">{content.label}</DrawerTitle>
          )}
          <SheetSkeleton />
        </div>
      </Scroll>
    );
  }

  if (content.kind !== "ready" && content.kind !== "empty") {
    return (
      <Scroll className="px-(--lm-layout-gutter) pt-5 pb-10">
        {inline ? null : (
          <DrawerTitle className="sr-only">{content.title}</DrawerTitle>
        )}
        <StateMessage
          kind={content.kind}
          title={content.title}
          body={content.body}
          action={content.action}
          motion={motion}
        />
      </Scroll>
    );
  }

  const { place, poll } = content;
  return (
    <>
      <Scroll className="px-(--lm-layout-gutter) pt-5">
        <div className="flex flex-col gap-7">
          <PlaceHeading
            place={place}
            categoryLabel={categoryLabel(place.category)}
            illustrationClassName="mr-10 desktop:mr-0"
            title={
              inline ? (
                <h1 className="type-title text-balance break-keep">
                  {place.name}
                </h1>
              ) : (
                <DrawerTitle className="type-title text-balance break-keep">
                  {place.name}
                </DrawerTitle>
              )
            }
          >
            <Badges place={place} />
          </PlaceHeading>
          <NumberRow place={place} />
          {inline ? (
            <p className="-mt-1 type-body-sm text-muted-foreground">
              {place.reason}
            </p>
          ) : (
            <DrawerDescription className="-mt-1 type-body-sm text-muted-foreground">
              {place.reason}
            </DrawerDescription>
          )}
        </div>
        <PollSection
          poll={poll}
          motion={motion}
          emptyMessage={content.kind === "empty" ? content.message : null}
        />
        <div className="mt-10 flex flex-col gap-8 pb-6">
          <InfoList place={place} />
          <MenuList place={place} />
        </div>
      </Scroll>
      <footer
        className={cn(
          "shrink-0 border-t border-border bg-popover px-(--lm-layout-gutter) pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]",
          inline && "mt-10 border-t-0 bg-transparent px-0",
        )}
      >
        <PressButton
          motion={motion}
          className={cn(buttonClass.primary, "w-full")}
        >
          {homeCopy.actions.directions}
        </PressButton>
      </footer>
    </>
  );
}

function InlineFrame({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn(className, "px-0 pt-0")}>{children}</div>;
}

/* ---------- 상세 정보 ---------- */

function InfoList({ place }: { place: MockPlace }) {
  const rows = [
    { label: placeDetailCopy.hours, value: place.hours },
    { label: placeDetailCopy.address, value: place.address },
    {
      label: placeDetailCopy.phone,
      value: (
        <a
          href={`tel:${place.phone}`}
          className={cn(
            "tabular-nums underline decoration-border decoration-1 underline-offset-[3px] hover:decoration-foreground",
            buttonClass.focusRing,
          )}
        >
          {place.phone}
        </a>
      ),
    },
  ];
  return (
    <dl className="flex flex-col border-t border-border">
      {rows.map((r) => (
        <div
          key={r.label}
          className="grid grid-cols-[4.5rem_1fr] gap-4 border-b border-border py-3.5"
        >
          <dt className="type-caption leading-6 text-muted-foreground">
            {r.label}
          </dt>
          <dd className="type-body-sm break-keep">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function MenuList({ place }: { place: MockPlace }) {
  return (
    <section aria-labelledby="qs-menu" className="flex flex-col gap-3">
      <h4 id="qs-menu" className="type-caption text-muted-foreground">
        {placeDetailCopy.menu}
      </h4>
      <ul className="flex flex-col gap-2">
        {place.menu.slice(0, 3).map((item) => (
          <li
            key={item.name}
            className="flex items-baseline justify-between gap-4 type-body"
          >
            <span className="min-w-0 truncate">{item.name}</span>
            <span className="shrink-0 tabular-nums">
              {formatWon(item.priceKRW)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- 투표 득표 바 ---------- */

function hhmm(iso: string): string {
  const { hour, minute } = getKstParts(new Date(iso));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function PollSection({
  poll,
  motion,
  emptyMessage,
}: {
  poll: MockPoll;
  motion: DesignMotionTokens;
  emptyMessage: string | null;
}) {
  const headingId = useId();
  const reduced = usePrefersReducedMotion();
  const [myVote, setMyVote] = useState<MockPlaceId | null>(poll.myVotePlaceId);
  // 첫 렌더는 0에서 시작해 실제 값으로 굴러가게 한다(NumberFlow는 값이 바뀔 때만 움직인다).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const votes = poll.candidates.map((c) => {
    const base = c.votes - (poll.myVotePlaceId === c.placeId ? 1 : 0);
    return { ...c, votes: base + (myVote === c.placeId ? 1 : 0) };
  });
  const top = Math.max(...votes.map((c) => c.votes));
  const minutesLeft = Math.ceil(
    msUntil(new Date(poll.deadlineAt), new Date(poll.mockNow)) / 60000,
  );
  const timing = {
    duration: motion.duration.base,
    easing: `cubic-bezier(${motion.easing.standard.join(",")})`,
  };

  return (
    <section
      aria-labelledby={headingId}
      className="mt-8 border-t border-border pt-7"
    >
      <div className="flex items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="type-caption text-muted-foreground">
            {copy.sheet.pollMeta(
              pollPreviewCopy.participants(poll.participantCount),
              pollPreviewCopy.deadline(hhmm(poll.deadlineAt)),
            )}
          </p>
          <h3 id={headingId} className="type-heading">
            {poll.title}
          </h3>
        </div>
        <p className="shrink-0 pb-1 type-numeric-md">
          {pollPreviewCopy.minutesLeft(minutesLeft)}
        </p>
      </div>

      {emptyMessage ? (
        <p className="mt-4 type-body-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : null}

      <ul
        role="radiogroup"
        aria-labelledby={headingId}
        className="mt-6 flex flex-col"
      >
        {votes.map((c) => {
          const place = getMockPlace(c.placeId);
          const isMine = myVote === c.placeId;
          const isTop = top > 0 && c.votes === top;
          const ratio =
            poll.participantCount > 0 ? c.votes / poll.participantCount : 0;
          return (
            <li key={c.placeId}>
              <button
                type="button"
                role="radio"
                aria-checked={isMine}
                aria-label={`${copy.sheet.voteFor(place.name)}, ${pollPreviewCopy.votes(c.votes)}${isTop ? `, ${copy.sheet.leading}` : ""}${c.avoidWarning ? `, ${homeCopy.badges.avoidWarning}` : ""}`}
                onClick={() => setMyVote(isMine ? null : c.placeId)}
                className={cn(
                  "-mx-3 flex w-[calc(100%+1.5rem)] flex-col gap-2.5 rounded-lg px-3 py-3.5 text-left transition-colors duration-(--lm-duration-fast) hover:bg-muted/60",
                  buttonClass.focusRing,
                )}
              >
                <span className="flex w-full items-center gap-2">
                  <span
                    className={cn(
                      "min-w-0 truncate type-label",
                      isTop ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {place.name}
                  </span>
                  {isMine ? (
                    <span className="inline-flex shrink-0 items-center gap-1 type-caption text-primary">
                      <Check aria-hidden className="size-3.5" strokeWidth={2} />
                      {pollPreviewCopy.myVote}
                    </span>
                  ) : null}
                  {c.avoidWarning ? (
                    <span className="inline-flex h-6 shrink-0 items-center rounded-badge border border-warning px-2 type-caption text-warning-foreground">
                      {homeCopy.badges.avoidWarning}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "ml-auto shrink-0 type-numeric-md",
                      isTop ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <NumberFlow
                      value={mounted ? c.votes : 0}
                      suffix={copy.sheet.voteUnit}
                      animated={!reduced}
                      transformTiming={timing}
                      spinTiming={timing}
                      opacityTiming={{
                        duration: motion.duration.fast,
                        easing: "ease-out",
                      }}
                    />
                  </span>
                </span>
                <span
                  aria-hidden
                  className="relative block h-2 w-full overflow-hidden rounded-full bg-vote-bar-track"
                >
                  <m.span
                    className={cn(
                      "absolute inset-y-0 left-0 block w-full origin-left rounded-full",
                      isTop ? "bg-vote-bar" : "bg-chart-3",
                    )}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: mounted ? ratio : 0 }}
                    transition={springOf(motion, "bar")}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------- 시트 스켈레톤 ---------- */

function SheetSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-7 pb-10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 flex-col gap-3 pt-1">
          <SkeletonBlock className="h-3.5 w-14 rounded-badge" />
          <SkeletonBlock className="h-6 w-40 rounded-badge" />
          <SkeletonBlock className="mt-1 h-6 w-28 rounded-badge" />
        </div>
        <div className="relative -mt-2 mr-8 size-24 shrink-0">
          <SkeletonBlock className="absolute top-[17px] left-[15px] size-[50px] rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-[0.8fr_1.3fr_0.9fr] divide-x divide-border">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-2.5 px-4 first:pl-0 last:pr-0"
          >
            <SkeletonBlock className="h-3 w-8 rounded-badge" />
            <SkeletonBlock className="h-7 w-14 rounded-badge" />
          </div>
        ))}
      </div>
      <div className="flex flex-col border-t border-border">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="grid grid-cols-[4.5rem_1fr] gap-4 border-b border-border py-4"
          >
            <SkeletonBlock className="h-3.5 w-10 rounded-badge" />
            <SkeletonBlock className="h-3.5 w-3/4 rounded-badge" />
          </div>
        ))}
      </div>
      <div className="mt-7 flex flex-col gap-6 border-t border-border pt-8">
        <SkeletonBlock className="h-6 w-32 rounded-badge" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-3">
            <SkeletonBlock className="h-4 w-24 rounded-badge" />
            <SkeletonBlock className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
