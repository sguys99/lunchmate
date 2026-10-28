"use client";
// 시안 C "Clay Grid" 비교 화면 2: 바텀시트 식당 상세 + 투표 득표 바 (T1.12, T1.13).
// 지도(격자 면) 위에 열린 시트. 시트 머리는 홈 카드 1행과 같은 구조(일러스트 + 라벨 + 이름)를 재사용한다.
// 득표 바: 후보를 누르면 내 표가 옮겨 가고, 바 길이(bar 스프링)와 득표 수(NumberFlow)가 같은 프레임에 바뀐다.
import NumberFlow from "@number-flow/react";
import {
  CloudOff,
  Navigation,
  Phone,
  RefreshCw,
  TriangleAlert,
  X,
} from "lucide-react";
import * as m from "motion/react-m";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { clayGridCopy } from "@/copy/design-lab-c";
import { homeCopy, placeDetailCopy, pollPreviewCopy } from "@/copy/home";
import {
  MOCK_HOME_TODAY,
  getMockPlace,
  type MockPlace,
  type MockPoll,
} from "@/features/design-lab/mock";
import { getKstParts, msUntil } from "@/lib/time";
import { formatWon } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerPopup,
  DrawerPortal,
  DrawerTitle,
  DrawerViewport,
} from "@/components/ui/drawer";
import { useDesignPortalContainer } from "../design-scope";
import { springOf } from "../motion";
import { getSheetContent, type SheetContent } from "../states";
import { ACTIVE_TAB_BY_SCREEN } from "../tabs";
import type { DesignMotionTokens, DesignScreenProps } from "../types";
import {
  Badge,
  Bone,
  IllustrationCell,
  MapSurfaceC,
  MetricGrid,
  StateGlyph,
  StateNotice,
  catInk,
  categoryText,
  useFlowTiming,
} from "./parts";
import { TabBarC } from "./tab-bar";

const copy = clayGridCopy.sheet;
const SNAP_POINTS = ["24rem", 1] as const;

export function SheetScreenC({ state, tokens }: DesignScreenProps) {
  const content = getSheetContent(state);
  const container = useDesignPortalContainer();
  const motion = tokens.motion;
  const selectedId =
    "place" in content ? content.place.id : MOCK_HOME_TODAY[0].id;

  return (
    <div className="flex flex-1 flex-col">
      <MapSurfaceC
        className="min-h-[calc(100dvh-var(--lm-layout-tab-bar-height))]"
        pins={MOCK_HOME_TODAY}
        selectedId={selectedId}
      />
      <div className="sticky bottom-0 z-10">
        <TabBarC active={ACTIVE_TAB_BY_SCREEN.sheet} motion={motion} />
      </div>
      <Drawer
        modal={false}
        disablePointerDismissal
        defaultOpen
        snapPoints={[...SNAP_POINTS]}
        defaultSnapPoint={SNAP_POINTS[1]}
      >
        {container && (
          <DrawerPortal container={container}>
            <DrawerBackdrop className="z-20" />
            <DrawerViewport className="z-30 desktop:justify-start desktop:px-8">
              <DrawerPopup className="max-h-[calc(100%-3rem)] border-t border-border bg-card desktop:max-w-(--lm-layout-desktop-list-max-width)">
                <div
                  aria-hidden
                  className="mx-auto mt-2 mb-1 h-1 w-9 shrink-0 rounded-full bg-input"
                />
                <SheetBody content={content} motion={motion} />
              </DrawerPopup>
            </DrawerViewport>
          </DrawerPortal>
        )}
      </Drawer>
    </div>
  );
}

function SheetBody({
  content,
  motion,
}: {
  content: SheetContent;
  motion: DesignMotionTokens;
}) {
  switch (content.kind) {
    case "ready":
    case "empty":
      return (
        <PlaceSheet
          place={content.place}
          poll={content.poll}
          emptyMessage={content.kind === "empty" ? content.message : null}
          motion={motion}
        />
      );
    case "loading":
      return <LoadingSheet label={content.label} />;
    case "error":
    case "offline":
      return (
        <>
          <DrawerContent className="pt-4 pb-6">
            <StateNotice
              title={content.title}
              titleNode={
                <DrawerTitle className="text-balance">
                  {content.title}
                </DrawerTitle>
              }
              body={content.body}
              visual={
                <StateGlyph>
                  {content.kind === "error" ? (
                    <TriangleAlert aria-hidden />
                  ) : (
                    <CloudOff aria-hidden />
                  )}
                </StateGlyph>
              }
            />
          </DrawerContent>
          <SheetFooter motion={motion}>
            <PrimaryButton motion={motion}>
              <RefreshCw aria-hidden className="size-4" strokeWidth={1.75} />
              {content.action}
            </PrimaryButton>
          </SheetFooter>
        </>
      );
  }
}

function PlaceSheet({
  place,
  poll,
  emptyMessage,
  motion,
}: {
  place: MockPlace;
  poll: MockPoll;
  emptyMessage: string | null;
  motion: DesignMotionTokens;
}) {
  return (
    <>
      <DrawerContent className="pb-6">
        {/* 머리: 홈 카드 1행과 같은 구조, 일러스트만 64px */}
        <div className="flex items-start gap-3 pt-2">
          <IllustrationCell category={place.category} className="size-16" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1.5">
            <span className="type-caption" style={catInk(place.category)}>
              {categoryText(place.category)}
            </span>
            <DrawerTitle className="truncate">{place.name}</DrawerTitle>
            <DrawerDescription className="truncate">
              {place.reason}
            </DrawerDescription>
          </div>
          <DrawerClose
            aria-label={copy.close}
            className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-button text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden className="size-5" strokeWidth={1.75} />
          </DrawerClose>
        </div>

        {place.statusBadges.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1">
            {place.statusBadges.map((b) => (
              <li
                key={b}
                className="flex items-center gap-2 type-body-sm text-muted-foreground"
              >
                <Badge kind={b} />
                <span className="truncate">{badgeDetail(place, b)}</span>
              </li>
            ))}
          </ul>
        )}

        <MetricGrid
          place={place}
          motion={motion}
          className="mt-4 border-y border-border py-3"
        />

        <dl className="mt-1 divide-y divide-border">
          <InfoRow label={placeDetailCopy.hours}>{place.hours}</InfoRow>
          <InfoRow label={placeDetailCopy.address}>{place.address}</InfoRow>
          <InfoRow label={placeDetailCopy.phone}>
            <a
              href={`tel:${place.phone}`}
              className="text-primary tabular-nums underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {place.phone}
            </a>
          </InfoRow>
        </dl>

        <section className="mt-5" aria-labelledby="c-menu-heading">
          <h3
            id="c-menu-heading"
            className="type-body-sm text-muted-foreground"
          >
            {placeDetailCopy.menu}
          </h3>
          <table className="mt-1 w-full border-collapse">
            <tbody>
              {place.menu.map((item) => (
                <tr
                  key={item.name}
                  className="border-b border-border last:border-b-0"
                >
                  <th
                    scope="row"
                    className="py-2 text-left type-body-sm font-normal"
                  >
                    {item.name}
                  </th>
                  <td className="py-2 text-right type-body-sm tabular-nums">
                    {formatWon(item.priceKRW)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <PollSection poll={poll} emptyMessage={emptyMessage} motion={motion} />
      </DrawerContent>
      <SheetFooter motion={motion}>
        <a
          href={`tel:${place.phone}`}
          aria-label={clayGridCopy.sheet.callAria(place.phone)}
          className="flex size-12 shrink-0 items-center justify-center rounded-button border border-input bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:bg-muted"
        >
          <Phone aria-hidden className="size-[18px]" strokeWidth={1.75} />
        </a>
        <PrimaryButton motion={motion}>
          <Navigation aria-hidden className="size-4" strokeWidth={1.75} />
          {homeCopy.actions.directions}
        </PrimaryButton>
      </SheetFooter>
    </>
  );
}

function badgeDetail(
  place: MockPlace,
  badge: MockPlace["statusBadges"][number],
): string {
  if (badge === "deal" && place.deal) return place.deal.title;
  if (badge === "waiting" && place.waiting) {
    const level = homeCopy.waitingLevels[place.waiting.level];
    return homeCopy.waitingReport(place.waiting.minutesAgo, level);
  }
  if (badge === "estimate")
    return placeDetailCopy.priceReportCount(place.priceReportCount);
  return "";
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-3 py-2">
      <dt className="type-body-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 type-body-sm">{children}</dd>
    </div>
  );
}

function SheetFooter({
  children,
}: {
  motion: DesignMotionTokens;
  children: ReactNode;
}) {
  return (
    <div className="flex shrink-0 gap-2 border-t border-border bg-card px-(--lm-layout-gutter) pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
      {children}
    </div>
  );
}

function PrimaryButton({
  motion,
  children,
}: {
  motion: DesignMotionTokens;
  children: ReactNode;
}) {
  return (
    <m.button
      type="button"
      whileTap={{ scale: 0.98 }}
      transition={springOf(motion, "press")}
      className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-button bg-primary px-4 type-label text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card active:bg-[color-mix(in_oklch,var(--color-primary)_92%,var(--color-foreground))]"
    >
      {children}
    </m.button>
  );
}

/* ---------------- 투표 득표 바 ---------------- */

function hhmm(iso: string): string {
  const { hour, minute } = getKstParts(new Date(iso));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function PollSection({
  poll,
  emptyMessage,
  motion,
}: {
  poll: MockPoll;
  emptyMessage: string | null;
  motion: DesignMotionTokens;
}) {
  const [myVote, setMyVote] = useState(poll.myVotePlaceId);
  const timing = useFlowTiming(motion);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  // 내 표 이동을 반영한 득표 (목업: 원래 내 표를 빼고 새 후보에 더한다)
  const rows = poll.candidates.map((c) => {
    let votes = c.votes;
    if (poll.myVotePlaceId === c.placeId) votes -= 1;
    if (myVote === c.placeId) votes += 1;
    const place = getMockPlace(c.placeId);
    return { ...c, votes, place };
  });
  const top = Math.max(...rows.map((r) => r.votes));
  const minutesLeft = Math.ceil(
    msUntil(new Date(poll.deadlineAt), new Date(poll.mockNow)) / 60000,
  );
  const meta = copy.pollMeta(
    pollPreviewCopy.participants(poll.participantCount),
    pollPreviewCopy.deadline(hhmm(poll.deadlineAt)),
  );

  const selectedIndex = rows.findIndex((r) => r.placeId === myVote);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>, i: number) => {
    const last = rows.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowDown" || e.key === "ArrowRight")
      next = i === last ? 0 : i + 1;
    if (e.key === "ArrowUp" || e.key === "ArrowLeft")
      next = i === 0 ? last : i - 1;
    const target = rows[next ?? i];
    if (next !== null && target) {
      e.preventDefault();
      setMyVote(target.placeId);
      refs.current[next]?.focus();
    } else if ((e.key === " " || e.key === "Enter") && target) {
      e.preventDefault();
      setMyVote(target.placeId);
    }
  };

  return (
    <section className="mt-7" aria-labelledby="c-poll-heading">
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 id="c-poll-heading" className="type-heading">
            {poll.title}
          </h3>
          <p className="type-caption text-muted-foreground">{meta}</p>
        </div>
        <p className="flex shrink-0 items-baseline gap-0.5">
          <NumberFlow
            value={minutesLeft}
            className="type-numeric-md"
            {...timing}
          />
          <span className="type-caption text-muted-foreground">
            {copy.minutesLeftUnit}
          </span>
        </p>
      </div>

      {emptyMessage && (
        <p className="mt-3 rounded-md bg-muted px-3 py-2.5 type-body-sm text-muted-foreground">
          {emptyMessage}
        </p>
      )}

      <div
        role="radiogroup"
        aria-label={copy.pollLabel(poll.title)}
        aria-describedby="c-poll-hint"
        className="mt-3 flex flex-col border-t border-border"
      >
        {rows.map((row, i) => {
          const mine = row.placeId === myVote;
          const leading = top > 0 && row.votes === top;
          const ratio =
            poll.participantCount > 0 ? row.votes / poll.participantCount : 0;
          const focusable = selectedIndex === -1 ? i === 0 : mine;
          return (
            <div
              key={row.placeId}
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="radio"
              aria-checked={mine}
              aria-label={[
                row.place.name,
                pollPreviewCopy.votes(row.votes),
                leading ? copy.leading : null,
                row.avoidWarning ? homeCopy.badges.avoidWarning : null,
              ]
                .filter(Boolean)
                .join(", ")}
              tabIndex={focusable ? 0 : -1}
              onClick={() => setMyVote(row.placeId)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className="relative cursor-pointer border-b border-border py-2.5 pl-3 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <span
                aria-hidden
                className={cn(
                  "absolute top-3 bottom-3 left-0 w-0.5 rounded-r-full bg-primary transition-opacity duration-(--lm-duration-fast)",
                  mine ? "opacity-100" : "opacity-0",
                )}
              />
              <div className="flex items-center gap-3">
                <IllustrationCell
                  category={row.place.category}
                  className="size-8 rounded-sm"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "truncate type-label",
                        leading ? "text-foreground" : "text-foreground/90",
                      )}
                    >
                      {row.place.name}
                    </span>
                    {row.avoidWarning && <Badge kind="avoidWarning" />}
                  </span>
                  <span className="flex gap-2 type-caption">
                    {leading && (
                      <span className="text-foreground">{copy.leading}</span>
                    )}
                    {mine && (
                      <span className="text-primary">
                        {pollPreviewCopy.myVote}
                      </span>
                    )}
                    {!leading && !mine && (
                      <span className="text-muted-foreground">
                        {categoryText(row.place.category)}
                      </span>
                    )}
                  </span>
                </div>
                <span className="flex shrink-0 items-baseline gap-0.5 pr-0.5">
                  <NumberFlow
                    value={row.votes}
                    className={cn(
                      "type-numeric-md",
                      leading ? "text-foreground" : "text-muted-foreground",
                    )}
                    {...timing}
                  />
                  <span className="type-caption text-muted-foreground">
                    {copy.votesUnit}
                  </span>
                </span>
              </div>
              <div
                aria-hidden
                className={cn(
                  "mt-2 ml-11 overflow-hidden rounded-full bg-vote-bar-track",
                  leading ? "h-1.5" : "h-1",
                )}
              >
                <m.div
                  className="h-full origin-left rounded-full bg-vote-bar"
                  initial={false}
                  animate={{ scaleX: ratio }}
                  transition={springOf(motion, "bar")}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p id="c-poll-hint" className="mt-2 type-caption text-muted-foreground">
        {copy.voteHint}
      </p>
    </section>
  );
}

/* ---------------- 로딩 ---------------- */

function LoadingSheet({ label }: { label: string }) {
  return (
    <>
      <DrawerContent className="pb-6">
        <DrawerTitle className="sr-only">{copy.loadingTitle}</DrawerTitle>
        <div role="status" aria-label={label}>
          <div className="flex items-start gap-3 pt-2">
            <Bone className="size-16 rounded-md" />
            <div className="flex flex-1 flex-col gap-2 pt-1.5">
              <Bone className="h-3 w-12" />
              <Bone className="h-[18px] w-32" />
              <Bone className="h-3.5 w-44" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 border-y border-border py-3">
            {[0, 1, 2].map((c) => (
              <div
                key={c}
                className={cn(
                  "flex flex-col gap-1.5",
                  c === 0 ? "pr-3" : "border-l border-border px-3",
                )}
              >
                <Bone className="h-6 w-10" />
                <Bone className="h-3 w-8" />
              </div>
            ))}
          </div>
          <div className="mt-1 divide-y divide-border">
            {[0, 1, 2].map((r) => (
              <div key={r} className="grid grid-cols-[4.5rem_1fr] gap-3 py-3">
                <Bone className="h-3.5 w-12" />
                <Bone className={cn("h-3.5", r === 1 ? "w-3/4" : "w-1/2")} />
              </div>
            ))}
          </div>
          <Bone className="mt-8 h-[18px] w-24" />
          <div className="mt-3 flex flex-col border-t border-border">
            {[0, 1, 2, 3].map((r) => (
              <div key={r} className="border-b border-border py-3 pl-3">
                <div className="flex items-center gap-3">
                  <Bone className="size-8 rounded-sm" />
                  <Bone className="h-3.5 w-28 flex-none" />
                  <span className="flex-1" />
                  <Bone className="h-4 w-8" />
                </div>
                <Bone className="mt-2.5 ml-11 h-1" />
              </div>
            ))}
          </div>
        </div>
      </DrawerContent>
      <div
        className="flex shrink-0 gap-2 border-t border-border px-(--lm-layout-gutter) py-3"
        aria-hidden
      >
        <Bone className="size-12 rounded-button" />
        <Bone className="h-12 flex-1 rounded-button" />
      </div>
    </>
  );
}
