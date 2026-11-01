"use client";
// 투표방 시안 공용 조각 (T7.1). 세 안이 함께 쓰는 틀, 머리줄, 상태 화면, 확인 상자, 결과 행동.
// 화면 구조(후보를 어떻게 보이고 고르는지)는 각 안 파일(a, b, c)에 둔다.
import {
  ChevronLeft,
  Ellipsis,
  ExternalLink,
  Share2,
  TriangleAlert,
  WifiOff,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { TabBarView } from "@/components/app-shell";
import { DeadlineCountdown } from "@/components/numbers";
import { EmptyState, ErrorState } from "@/components/states";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonClass as rawButtonClass } from "@/components/ui/button-classes";
import { focusRing, hitArea44 } from "@/components/ui/interaction";
import { Skeleton } from "@/components/ui/skeleton";
import { pollLabCopy as copy } from "@/copy/design-lab-poll";
import { MapLines, MapPin } from "@/features/design-lab/system/b/parts";
import {
  DesktopSplit,
  MapPlaceholder,
} from "@/features/design-lab/system/desktop-split";
import { CategoryIllustration } from "@/features/place/illustrations";
import { cn } from "@/lib/utils";
import {
  HOST,
  POLL_MAX_CANDIDATES,
  SUGGESTION,
  initialOf,
  kakaoMapUrl,
  withRo,
  type PollCandidate,
  type PollPerson,
} from "./mock";
import type { PollLab } from "./use-poll-lab";

/** 기본 border-transparent와 variant 테두리색 겹침을 cn으로 정리한다 */
export const buttonClass = (...args: Parameters<typeof rawButtonClass>) =>
  cn(rawButtonClass(...args));

/* ---------- 틀 ---------- */

/** 앱 셸 2단 + 하단 탭(투표 활성). 데스크톱 오른쪽은 후보 핀 지도 */
export function PollFrame({
  children,
  candidates,
  active = -1,
  nameFail = false,
  showMap = true,
}: {
  children: ReactNode;
  candidates?: readonly PollCandidate[];
  active?: number;
  nameFail?: boolean;
  showMap?: boolean;
}) {
  return (
    <DesktopSplit
      list={children}
      map={
        showMap ? (
          <PollMap
            candidates={candidates}
            active={active}
            nameFail={nameFail}
          />
        ) : (
          <MapPlaceholder className="border-l border-border" />
        )
      }
      tabBar={<TabBarView activeId="poll" preview />}
    />
  );
}

const PIN_SPOTS = [
  { left: "40%", top: "34%" },
  { left: "64%", top: "50%" },
  { left: "28%", top: "62%" },
  { left: "56%", top: "74%" },
  { left: "74%", top: "28%" },
] as const;

/** 데스크톱 지도 자리: 투표방 기준점 둘레의 후보 핀. active(1위나 확정) 핀만 올리브 */
export function PollMap({
  candidates,
  active,
  nameFail,
}: {
  candidates?: readonly PollCandidate[];
  active: number;
  nameFail: boolean;
}) {
  return (
    <MapPlaceholder className="border-l border-border desktop:sticky desktop:top-0 desktop:max-h-svh">
      <MapLines />
      {candidates?.map((c, i) => (
        <MapPin
          key={c.place.id}
          label={
            nameFail && i === 1 ? copy.candidate.unresolved(2) : c.place.name
          }
          active={i === active}
          position={PIN_SPOTS[i] ?? PIN_SPOTS[0]}
        />
      ))}
    </MapPlaceholder>
  );
}

/** 리스트 칸 본문 (홈과 같은 폭) */
export function PollColumn({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-3 pb-6 desktop:max-w-(--lm-layout-desktop-list-max-width) desktop:px-10 desktop:pt-8 desktop:pb-10",
        className,
      )}
    >
      {children}
    </main>
  );
}

/** 하단 탭 바로 위에 붙는 행동 줄 (홈 D1 행동 줄과 같은 자리) */
export function StickyActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-[calc(var(--lm-layout-tab-bar-height)+env(safe-area-inset-bottom,0px))] z-[5] -mx-(--lm-layout-gutter) mt-auto border-t border-border bg-background px-(--lm-layout-gutter) pt-3 pb-3 desktop:mx-0 desktop:px-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ---------- 머리줄 ---------- */

/** 뒤로 + 공유 + (방장) 더 보기. 방장 메뉴의 투표 취소는 바로 아래 확인 상자로 묻는다(POLL-12) */
export function TopBar({
  lab,
  onNotice,
}: {
  lab: Pick<PollLab, "isHost" | "isGuest" | "phase">;
  onNotice: (message: string) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [canceled, setCanceled] = useState(false);
  const menuId = useId();
  const moreRef = useRef<HTMLButtonElement>(null);
  const iconBtn = cn(
    "inline-flex size-11 items-center justify-center rounded-full text-foreground hover:bg-muted",
    focusRing,
  );

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        moreRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  return (
    <div className="relative">
      <div className="-mx-2 flex h-14 items-center justify-between">
        <button
          type="button"
          aria-label={copy.head.backLabel}
          className={iconBtn}
        >
          <ChevronLeft aria-hidden className="size-6" strokeWidth={1.5} />
        </button>
        <div className="flex items-center gap-1">
          {lab.isGuest ? null : (
            <button
              type="button"
              aria-label={copy.head.shareLabel}
              className={iconBtn}
              onClick={() => onNotice(copy.lab.shareNotice)}
            >
              <Share2 aria-hidden className="size-5" strokeWidth={1.5} />
            </button>
          )}
          {lab.isHost && lab.phase !== "result" ? (
            <button
              ref={moreRef}
              type="button"
              aria-label={copy.head.moreLabel}
              aria-expanded={menu}
              aria-controls={menuId}
              className={iconBtn}
              onClick={() => setMenu((v) => !v)}
            >
              <Ellipsis aria-hidden className="size-5" strokeWidth={1.5} />
            </button>
          ) : null}
        </div>
      </div>
      {menu ? (
        <div
          id={menuId}
          className="absolute top-12 right-0 z-20 flex w-52 flex-col rounded-lg border border-border bg-popover py-1 shadow-lg motion-safe:transition-[opacity,translate] motion-safe:duration-(--lm-duration-fast) motion-safe:ease-enter motion-safe:starting:-translate-y-1 motion-safe:starting:opacity-0"
        >
          <button
            type="button"
            className={cn(
              "h-11 px-4 text-left type-label hover:bg-muted",
              focusRing,
            )}
            onClick={() => {
              setMenu(false);
              onNotice(copy.lab.shareNotice);
            }}
          >
            {copy.host.copyLink}
          </button>
          <button
            type="button"
            className={cn(
              "h-11 px-4 text-left type-label text-destructive hover:bg-muted",
              focusRing,
            )}
            onClick={() => {
              setMenu(false);
              setConfirm(true);
            }}
          >
            {copy.host.cancelPoll}
          </button>
        </div>
      ) : null}
      {confirm ? (
        <ConfirmBox
          title={copy.host.cancelTitle}
          body={copy.host.cancelBody}
          confirm={copy.host.cancelConfirm}
          keep={copy.host.cancelKeep}
          destructive
          onConfirm={() => {
            setConfirm(false);
            setCanceled(true);
          }}
          onKeep={() => {
            setConfirm(false);
            moreRef.current?.focus();
          }}
          className="mb-4"
        />
      ) : null}
      {canceled ? (
        <p role="status" className="mb-4 type-body-sm text-muted-foreground">
          {copy.notices.canceled.title}
        </p>
      ) : null}
    </div>
  );
}

/** 확인 상자 (방장 결정, 투표 취소). 모달 대신 그 자리 상자: 첫 버튼으로 포커스 */
export function ConfirmBox({
  title,
  body,
  confirm,
  keep,
  destructive = false,
  onConfirm,
  onKeep,
  className,
}: {
  title: string;
  body: string;
  confirm: string;
  keep: string;
  destructive?: boolean;
  onConfirm: () => void;
  onKeep: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, []);
  return (
    <div
      ref={ref}
      role="group"
      aria-labelledby={titleId}
      className={cn(
        "rounded-card border border-border bg-card px-5 pt-5 pb-5 motion-safe:transition-[opacity,translate] motion-safe:duration-(--lm-duration-base) motion-safe:ease-enter motion-safe:starting:translate-y-1 motion-safe:starting:opacity-0",
        className,
      )}
    >
      <p id={titleId} className="type-label">
        {title}
      </p>
      <p className="mt-1 type-body-sm text-muted-foreground">{body}</p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className={buttonClass(
            destructive ? "destructive" : "secondary",
            "sm",
          )}
        >
          {confirm}
        </button>
        <button
          type="button"
          onClick={onKeep}
          className={buttonClass("ghost", "sm")}
        >
          {keep}
        </button>
      </div>
    </div>
  );
}

/* ---------- 후보 이름 ---------- */

/**
 * 후보 이름. fail이면 T5.12a 대체: "후보 N" + 카카오맵 링크(place_url, 새 창).
 * 이름은 세션 메모리 값이라 저장하지 않는다(T0.16).
 */
export function CandidateName({
  candidate,
  order,
  fail,
  className,
  linkClassName,
}: {
  candidate: PollCandidate;
  order: number;
  fail: boolean;
  className?: string;
  linkClassName?: string;
}) {
  if (!fail) {
    return (
      <span className={cn("break-keep", className)}>
        {candidate.place.name}
      </span>
    );
  }
  return (
    <span className="flex flex-col items-start gap-1">
      <span className={className}>{copy.candidate.unresolved(order)}</span>
      <a
        href={kakaoMapUrl(candidate.place)}
        target="_blank"
        rel="noreferrer"
        aria-label={copy.candidate.kakaoMapLabel(order)}
        className={cn(
          "relative z-[1] inline-flex items-center gap-1 rounded-sm type-caption text-foreground underline decoration-muted-foreground underline-offset-3",
          hitArea44,
          focusRing,
          linkClassName,
        )}
      >
        {copy.candidate.kakaoMap}
        <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.5} />
      </a>
    </span>
  );
}

/** 후보 그림. 이름을 못 맞추면 카테고리도 모르므로 빈 원 */
export function CandidateArt({
  candidate,
  fail,
  size,
  className,
}: {
  candidate: PollCandidate;
  fail: boolean;
  size: number;
  className?: string;
}) {
  if (fail) {
    return (
      <span
        aria-hidden
        className={cn(
          "shrink-0 rounded-full border border-dashed border-input",
          className,
        )}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <CategoryIllustration
      slug={candidate.place.category}
      size={size}
      className={cn("shrink-0", className)}
    />
  );
}

/* ---------- 사람 ---------- */

/** 참여자 얼굴 줄. 넘치면 "외 N명" */
export function AvatarStack({
  people,
  max = 5,
  size = "sm",
  className,
  label,
}: {
  people: readonly PollPerson[];
  max?: number;
  size?: "sm" | "default";
  className?: string;
  label?: string;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span
      role="img"
      aria-label={label ?? copy.head.avatarsLabel(people.length)}
      className={cn("inline-flex items-center", className)}
    >
      <span aria-hidden className="flex -space-x-1.5">
        {shown.map((person) => (
          <Avatar
            key={person.id}
            size={size}
            className="ring-2 ring-background"
          >
            <AvatarFallback>{initialOf(person.nick)}</AvatarFallback>
          </Avatar>
        ))}
      </span>
      {rest > 0 ? (
        <span aria-hidden className="ml-2 type-caption text-muted-foreground">
          {copy.head.moreShown(rest)}
        </span>
      ) : null}
    </span>
  );
}

/** 누가 열었는지 한 줄 */
export function HostLine({
  isHost,
  className,
}: {
  isHost: boolean;
  className?: string;
}) {
  return (
    <p className={cn("type-caption text-muted-foreground", className)}>
      {isHost ? copy.head.hostedByMe : copy.head.hostedBy(HOST.nick)}
    </p>
  );
}

/* ---------- 시간 ---------- */

/** 마감 카운트다운. 시각을 모르는 첫 렌더는 같은 폭의 자리 */
export function Countdown({
  deadline,
  className,
}: {
  deadline: Date | null;
  className?: string;
}) {
  if (!deadline) {
    return (
      <span
        aria-hidden
        className={cn("inline-block tabular-nums opacity-0", className)}
      >
        00:00
      </span>
    );
  }
  return <DeadlineCountdown deadline={deadline} className={className} />;
}

/* ---------- 실시간 ---------- */

/** 실시간 상태: 평소에는 점 하나 + "실시간", 끊기면 한 줄 안내 + 다시 연결 */
export function LiveStatus({
  lost,
  incoming,
  className,
}: {
  lost: boolean;
  incoming: string | null;
  className?: string;
}) {
  const [retrying, setRetrying] = useState(false);
  if (lost && !retrying) {
    return (
      <div
        role="status"
        className={cn(
          "flex items-center gap-3 border-y border-border py-2.5",
          className,
        )}
      >
        <WifiOff
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
          strokeWidth={1.5}
        />
        <p className="min-w-0 flex-1 type-body-sm text-muted-foreground">
          {copy.live.lost}
        </p>
        <button
          type="button"
          onClick={() => setRetrying(true)}
          className={cn(
            "shrink-0 rounded-sm type-caption text-foreground underline decoration-muted-foreground underline-offset-3",
            hitArea44,
            focusRing,
          )}
        >
          {copy.actions.reconnect}
        </button>
      </div>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 type-caption text-muted-foreground",
        className,
      )}
    >
      <span aria-hidden className="relative flex size-2">
        <span className="absolute inset-0 rounded-full bg-success opacity-40 motion-safe:animate-ping motion-safe:[animation-duration:2.4s]" />
        <span className="relative size-2 rounded-full bg-success" />
      </span>
      <span aria-label={copy.live.onLabel}>{copy.live.on}</span>
      <span role="status" className="sr-only">
        {incoming ?? ""}
      </span>
    </span>
  );
}

/* ---------- 기피 경고 ---------- */

export function AvoidNote({
  show,
  className,
}: {
  show: boolean;
  className?: string;
}) {
  if (!show) return null;
  return (
    <p
      className={cn("flex gap-2 type-caption text-muted-foreground", className)}
    >
      <TriangleAlert
        aria-hidden
        className="mt-0.5 size-3.5 shrink-0 text-warning"
        strokeWidth={1.75}
      />
      {copy.avoid.note}
    </p>
  );
}

/* ---------- 후보 제안 (POLL-07) ---------- */

export function SuggestionBlock({
  lab,
  onNotice,
  className,
}: {
  lab: Pick<
    PollLab,
    | "suggestion"
    | "isHost"
    | "approve"
    | "reject"
    | "suggest"
    | "candidates"
    | "phase"
    | "isGuest"
    | "offline"
  >;
  onNotice: (message: string) => void;
  className?: string;
}) {
  if (lab.phase !== "vote" || lab.isGuest) return null;
  if (lab.isHost && lab.suggestion === "pending") {
    return (
      <section
        aria-label={copy.suggest.pendingTitle}
        className={cn("flex flex-col gap-3", className)}
      >
        <h2 className="type-caption text-muted-foreground">
          {copy.suggest.pendingTitle}
        </h2>
        <div className="flex items-center gap-3 rounded-card border border-dashed border-input px-4 py-3">
          <CategoryIllustration slug={SUGGESTION.place.category} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate type-label">{SUGGESTION.place.name}</p>
            <p className="type-caption text-muted-foreground">
              {copy.suggest.pendingBy(SUGGESTION.by.nick)}
            </p>
          </div>
          <button
            type="button"
            onClick={lab.reject}
            className={buttonClass("ghost", "sm")}
          >
            {copy.actions.reject}
          </button>
          <button
            type="button"
            onClick={lab.approve}
            className={buttonClass("secondary", "sm")}
          >
            {copy.actions.approve}
          </button>
        </div>
      </section>
    );
  }
  if (lab.suggestion === "sent") {
    return (
      <p
        role="status"
        className={cn("type-body-sm text-muted-foreground", className)}
      >
        {copy.suggest.sent}
      </p>
    );
  }
  if (lab.isHost || lab.offline) return null;
  const full = lab.candidates.length >= POLL_MAX_CANDIDATES;
  return (
    <div className={cn("flex", className)}>
      {full ? (
        <p className="type-caption text-muted-foreground">
          {copy.suggest.full}
        </p>
      ) : (
        <button
          type="button"
          onClick={() => {
            lab.suggest();
            onNotice(copy.lab.suggestNotice);
          }}
          className={cn(
            "rounded-sm type-caption text-foreground underline decoration-muted-foreground underline-offset-3",
            hitArea44,
            focusRing,
          )}
        >
          {copy.actions.suggest}
        </button>
      )}
    </div>
  );
}

/* ---------- 투표 전송 실패 ---------- */

export function VoteFailLine({
  onRetry,
  className,
}: {
  onRetry: () => void;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("flex items-center gap-3", className)}>
      <p className="min-w-0 flex-1 type-body-sm text-destructive">
        {copy.voted.sendFailed}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className={buttonClass("secondary", "sm")}
      >
        {copy.actions.retrySend}
      </button>
    </div>
  );
}

/* ---------- 행동 줄 ---------- */

/**
 * 진행 중 하단 행동 줄. 화면에 올리브 면 버튼은 하나:
 * 안 찍음 → 투표하기(primary) [+ 방장 결정하기(테두리)], 찍음 → 선택 바꾸기(테두리) [+ 방장 지금 결정하기(primary)].
 */
export function VoteActions({
  lab,
  voteLabel,
  className,
}: {
  lab: PollLab;
  voteLabel?: string;
  className?: string;
}) {
  if (lab.isGuest) {
    return (
      <StickyActions className={className}>
        <a href="#login" className={cn(buttonClass("primary"), "w-full")}>
          {copy.actions.loginToVote}
        </a>
        <p className="mt-2 text-center type-caption text-muted-foreground">
          {copy.guest.body}
        </p>
      </StickyActions>
    );
  }
  if (lab.offline) {
    return (
      <StickyActions className={className}>
        <button
          type="button"
          aria-disabled
          className={cn(buttonClass("primary"), "w-full")}
        >
          {copy.states.offline.button}
        </button>
      </StickyActions>
    );
  }
  const voted = lab.mine !== null;
  const noPick = lab.picks.length === 0;
  return (
    <StickyActions className={className}>
      {lab.decideOpen ? (
        <ConfirmBox
          title={copy.decide.confirmTitle}
          body={copy.decide.confirmBody}
          confirm={copy.decide.confirm}
          keep={copy.decide.keep}
          onConfirm={lab.confirmDecide}
          onKeep={lab.closeDecide}
          className="mb-3"
        />
      ) : null}
      {lab.sendFailed ? (
        <VoteFailLine onRetry={lab.retrySend} className="mb-3" />
      ) : null}
      <div className="flex gap-2">
        {voted ? (
          <>
            <button
              type="button"
              onClick={lab.change}
              className={cn(buttonClass("secondary"), "flex-1")}
            >
              {copy.actions.change}
            </button>
            {lab.isHost ? (
              <button
                type="button"
                onClick={lab.openDecide}
                className={cn(buttonClass("primary"), "flex-1")}
              >
                {copy.actions.decideNow}
              </button>
            ) : (
              <button
                type="button"
                onClick={lab.cancel}
                className={buttonClass("ghost")}
              >
                {copy.actions.cancelVote}
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              aria-disabled={noPick || undefined}
              onClick={lab.submit}
              className={cn(buttonClass("primary"), "flex-1")}
            >
              {noPick
                ? copy.actions.pickFirst
                : (voteLabel ?? copy.actions.vote)}
            </button>
            {lab.isHost ? (
              <button
                type="button"
                onClick={lab.openDecide}
                className={buttonClass("secondary")}
              >
                {copy.actions.decide}
              </button>
            ) : null}
          </>
        )}
      </div>
      {voted ? (
        <p className="mt-2 type-caption text-muted-foreground">
          {copy.voted.done}
        </p>
      ) : null}
    </StickyActions>
  );
}

/** 동점(방장): 직접 고르기 목록은 각 안이 그리고, 룰렛 버튼과 질문은 같다 */
export function TieQuestion({
  lab,
  className,
}: {
  lab: PollLab;
  className?: string;
}) {
  if (!lab.isHost) {
    return (
      <div role="status" className={cn("flex flex-col gap-1", className)}>
        <p className="type-label">{copy.tie.memberTitle}</p>
        <p className="type-body-sm text-muted-foreground">
          {copy.tie.memberBody}
        </p>
      </div>
    );
  }
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <p className="type-label">{copy.tie.hostTitle(lab.top.length)}</p>
      <p className="type-body-sm text-muted-foreground">
        {lab.phase === "rolling" ? copy.tie.rolling : copy.tie.hostBody}
      </p>
    </div>
  );
}

/** 동점 하단 행동(방장): 고른 후보로 정하기(primary) + 룰렛(테두리). 직접 고르기는 후보를 눌러서 */
export function TieActions({
  lab,
  picked,
}: {
  lab: PollLab;
  /** 방장이 동점 후보 중 누른 곳 */
  picked: number | null;
}) {
  if (!lab.isHost) return null;
  const rolling = lab.phase === "rolling";
  const name = picked === null ? null : lab.candidates[picked]?.place.name;
  return (
    <StickyActions>
      <div className="flex gap-2">
        <button
          type="button"
          aria-disabled={rolling || undefined}
          onClick={lab.startRoulette}
          className={cn(buttonClass("secondary"), name ? "" : "flex-1")}
        >
          {copy.actions.roulette}
        </button>
        {name && picked !== null ? (
          <button
            type="button"
            aria-disabled={rolling || undefined}
            onClick={() => lab.pickTie(picked)}
            className={cn(buttonClass("primary"), "min-w-0 flex-1")}
          >
            <span className="truncate">
              {copy.actions.pickThis(withRo(name))}
            </span>
          </button>
        ) : null}
      </div>
    </StickyActions>
  );
}

/* ---------- 결과 ---------- */

/** 확정 축하 한 줄: display 세리프가 slow로 떠오른다(색종이 없음, DESIGN.md 7장) */
export function Celebrate({
  className,
  as: Tag = "p",
}: {
  className?: string;
  as?: "p" | "h1";
}) {
  return (
    <Tag
      className={cn(
        "type-display text-balance break-keep motion-safe:transition-[opacity,translate] motion-safe:duration-[600ms] motion-safe:ease-enter motion-safe:starting:translate-y-2 motion-safe:starting:opacity-0",
        className,
      )}
    >
      {copy.result.celebrate}
    </Tag>
  );
}

/** 결과 하단 행동: 길찾기(primary) + 결과 공유(테두리) */
export function ResultActions({
  onNotice,
  className,
}: {
  onNotice: (message: string) => void;
  className?: string;
}) {
  return (
    <StickyActions className={className}>
      <div className="flex gap-2">
        <button type="button" className={cn(buttonClass("primary"), "flex-1")}>
          {copy.actions.directions}
        </button>
        <button
          type="button"
          onClick={() => onNotice(copy.lab.resultShareNotice)}
          className={buttonClass("secondary")}
        >
          <Share2 aria-hidden strokeWidth={1.5} />
          {copy.actions.shareResult}
        </button>
      </div>
    </StickyActions>
  );
}

export function resolvedLine(by: PollLab["resolvedBy"]): string {
  return by === "roulette"
    ? copy.result.byRoulette
    : by === "host"
      ? copy.result.byHost
      : copy.result.byTime;
}

/* ---------- 득표 바 ---------- */

/**
 * 득표 바: 트랙 vote-bar-track 8px 알약, 1위 채움 vote-bar, 나머지 chart-3.
 * 길이는 처음 보일 때 0에서 차오른다(@starting-style, slow emphasized). 축소 모드는 즉시.
 */
export function VoteBar({
  value,
  max,
  leading,
  className,
  thick = false,
}: {
  value: number;
  max: number;
  leading: boolean;
  className?: string;
  thick?: boolean;
}) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <span
      aria-hidden
      className={cn(
        "block w-full overflow-hidden rounded-full bg-vote-bar-track",
        thick ? "h-2.5" : "h-2",
        className,
      )}
    >
      <span
        style={{ ["--bar" as string]: `${pct}%` }}
        className={cn(
          "block h-full w-(--bar) rounded-full motion-safe:transition-[width,background-color] motion-safe:duration-[520ms] motion-safe:ease-emphasized motion-safe:starting:w-0",
          leading ? "bg-vote-bar" : "bg-chart-3",
        )}
      />
    </span>
  );
}

/* ---------- 들어갈 수 없는 투표방, 상태 ---------- */

export function NoticeScreen({
  kind,
}: {
  kind: "expired" | "full" | "canceled";
}) {
  const c = copy.notices[kind];
  return (
    <div className="flex flex-1 flex-col justify-center py-10">
      <EmptyState
        title={c.title}
        body={c.body}
        visual={<CategoryIllustration slug="hansik" />}
        action={{
          label: c.action,
          variant: kind === "canceled" ? "primary" : "secondary",
        }}
        headingLevel="h1"
      />
    </div>
  );
}

export function LoadError() {
  return (
    <div className="flex flex-1 flex-col justify-center py-10">
      <ErrorState
        title={copy.states.error.title}
        body={copy.states.error.body}
        action={{ label: copy.states.error.action }}
        headingLevel="h1"
      />
    </div>
  );
}

/** 뼈대: 머리 두 줄 + 후보 줄 4개 */
export function PollSkeleton({
  rows = 4,
  card = false,
}: {
  rows?: number;
  card?: boolean;
}) {
  return (
    <div
      role="status"
      aria-label={copy.states.loading.label}
      className="flex flex-col gap-6 pt-4"
    >
      <h1 className="sr-only">{copy.states.loading.label}</h1>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3.5 w-20 rounded-full" />
        <Skeleton className="h-8 w-56 rounded-full" />
        <Skeleton className="h-3.5 w-36 rounded-full" />
      </div>
      {card ? (
        <Skeleton className="h-96 w-full rounded-card" />
      ) : (
        <div className="flex flex-col gap-5">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="size-11 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-1/2 rounded-full" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** 오프라인 한 줄 (투표방 안에서는 마지막 득표를 그대로 보인다) */
export function OfflineLine({ className }: { className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 border-y border-border py-2.5",
        className,
      )}
    >
      <WifiOff
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.5}
      />
      <p className="type-body-sm text-muted-foreground">
        <span className="text-foreground">{copy.states.offline.title}.</span>{" "}
        {copy.states.offline.body}
      </p>
    </div>
  );
}

/** 득표 0 안내 (state=empty). 후보 목록은 그대로 보이고 이 줄이 위에 붙는다 */
export function EmptyVotesLine({ className }: { className?: string }) {
  return (
    <p className={cn("type-body-sm text-muted-foreground", className)}>
      <span className="text-foreground">{copy.states.empty.title}.</span>{" "}
      {copy.states.empty.body}
    </p>
  );
}

/** 시안 안내와 상태 알림을 스크린 리더에 읽히는 자리 */
export function useLabAnnouncer(initial = "") {
  const [message, setMessage] = useState(initial);
  const node = (
    <p role="status" className="sr-only">
      {message}
    </p>
  );
  return { notice: setMessage, announcer: node };
}
