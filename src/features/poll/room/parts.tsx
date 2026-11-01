"use client";
// 투표방 화면 조각 (T7.15~T7.23, DESIGN.md 5장 "투표방", D-14). 시안 A 목록과 바 + C 참여 줄 + B 결과 카드.
// - 위계는 타이포로만: 세리프 질문 → 큰 카운트다운 → 후보 줄(세리프 이름, 8px 득표 바, 득표 수).
// - 올리브 면 버튼은 화면에 하나(행동 줄). 의미 색은 기피 경고(warning) 하나뿐.
// - 이름, 그림, 도보, 가격은 세션 값(T5.12a). 이름을 못 맞추면 "후보 N" + 카카오맵 링크, 메타 없음.
import { m } from "motion/react";
import { Check, ExternalLink, TriangleAlert, WifiOff } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { PlaceBadges } from "@/components/badges/place-badges";
import type { PlaceBadge } from "@/components/badges/pick-badges";
import { RollingNumber } from "@/components/numbers";
import { useSecondClock } from "@/components/numbers/use-second-clock";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonClass as rawButtonClass } from "@/components/ui/button-classes";
import { focusRing, hitArea44 } from "@/components/ui/interaction";
import { Skeleton } from "@/components/ui/skeleton";
import { pollCopy as copy } from "@/copy/poll";
import { CategoryIllustration } from "@/features/place/illustrations";
import { countdownUnits, formatPriceBand } from "@/lib/format";
import { motionPresets, useMotionReduced, INSTANT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { kstClock, kstDateIfNotToday, type RoomMember } from "./model";
import type { CandidatePlace } from "./use-candidate-places";

/** 기본 border-transparent와 variant 테두리색 겹침을 cn으로 정리한다(0e6e51f) */
export const buttonClass = (...args: Parameters<typeof rawButtonClass>) =>
  cn(rawButtonClass(...args));

const divider = (
  <span
    aria-hidden
    className="mx-2 inline-block h-3 w-px translate-y-0.5 bg-border"
  />
);

/* ---------- 틀 ---------- */

export function RoomColumn({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-3 desktop:max-w-(--lm-layout-desktop-list-max-width) desktop:px-10 desktop:pt-8">
      {children}
    </div>
  );
}

/** 하단 탭 바로 위에 붙는 행동 줄 (홈 행동 줄과 같은 자리) */
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
        "sticky bottom-[calc(var(--lm-layout-tab-bar-height)+env(safe-area-inset-bottom,0px))] z-[5] -mx-(--lm-layout-gutter) mt-auto border-t border-border bg-background px-(--lm-layout-gutter) pt-3 pb-3 desktop:bottom-(--lm-layout-tab-bar-height) desktop:mx-0 desktop:px-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export const iconButton = cn(
  "inline-flex size-11 items-center justify-center rounded-full text-foreground hover:bg-muted active:bg-muted",
  focusRing,
);

export const textButton = cn(
  "inline-flex items-center gap-1 rounded-sm type-caption text-foreground underline decoration-muted-foreground underline-offset-3",
  hitArea44,
  focusRing,
);

/* ---------- 머리 ---------- */

/** 마감 표기 "12:30 마감", 오늘이 아니면 "11월 3일 18:00 마감" (KST). 기준 시각은 처음 그릴 때 한 번 */
export function useDeadlineText(closesAt: string): string {
  const [now] = useState(() => Date.now());
  const date = kstDateIfNotToday(closesAt, now);
  return date
    ? copy.head.deadlineOn(date, kstClock(closesAt))
    : copy.head.deadlineAt(kstClock(closesAt));
}

/** 마감 caption "점심 투표 | 12:30 마감" */
export function HeadCaption({
  kindLabel,
  deadline,
}: {
  kindLabel: string;
  deadline: string;
}) {
  return (
    <p className="type-caption text-muted-foreground">
      {kindLabel}
      {divider}
      {deadline}
    </p>
  );
}

/**
 * 카운트다운 "12분 40초" (D-14 안건 13). 숫자는 크게(numeric-lg), 단위는 작게. 초는 10분 미만에서만.
 * role="timer"라 매초 읽지 않고 이름에 남은 시간을 문장으로 준다. 첫 렌더는 같은 폭 자리.
 */
export function PollCountdown({
  deadline,
  onDone,
  className,
}: {
  deadline: string;
  onDone?: () => void;
  className?: string;
}) {
  const now = useSecondClock();
  const left = now === null ? null : countdownUnits(Date.parse(deadline) - now);
  const done = now !== null && left === null;
  const doneRef = useRef(false);
  useEffect(() => {
    if (done && !doneRef.current) {
      doneRef.current = true;
      onDone?.();
    }
  }, [done, onDone]);

  if (now === null) {
    return (
      <span
        aria-hidden
        className={cn("inline-block type-numeric-lg opacity-0", className)}
      >
        00분
      </span>
    );
  }
  if (!left) {
    return (
      <span className={cn("type-body-sm text-muted-foreground", className)}>
        {copy.head.closingNow}
      </span>
    );
  }
  return (
    <span
      role="timer"
      aria-label={copy.head.countdownLabel(left.text)}
      className={cn("inline-flex items-baseline gap-1 tabular-nums", className)}
    >
      {left.parts.map((p, i) => (
        <span
          key={p.unit}
          aria-hidden
          className="inline-flex items-baseline gap-0.5"
        >
          <span className="type-numeric-lg">
            <RollingNumber
              value={p.value}
              trend={-1}
              format={
                p.unit === "초" && i > 0
                  ? { minimumIntegerDigits: 2 }
                  : undefined
              }
            />
          </span>
          <span className="type-body-sm text-muted-foreground">{p.unit}</span>
        </span>
      ))}
    </span>
  );
}

/** 이름 첫 글자. 같은 첫 글자가 겹치면 두 글자(D-14 후속: 얼굴 이니셜 구분) */
export function initialsFor(
  members: readonly RoomMember[],
): Map<string, string> {
  const first = (n: string) => Array.from(n)[0] ?? "";
  const counts = new Map<string, number>();
  for (const m of members) {
    if (m.nickname)
      counts.set(first(m.nickname), (counts.get(first(m.nickname)) ?? 0) + 1);
  }
  const out = new Map<string, string>();
  for (const m of members) {
    if (!m.nickname) {
      out.set(m.id, "?");
      continue;
    }
    const chars = Array.from(m.nickname);
    out.set(
      m.id,
      (counts.get(chars[0] ?? "") ?? 0) > 1
        ? chars.slice(0, 2).join("")
        : (chars[0] ?? ""),
    );
  }
  return out;
}

/**
 * 참여 줄 (C에서, 무기명): 얼굴(겹침) + "7명 중 6명 골랐습니다". 투표한 사람 얼굴 오른쪽 아래 작은 체크 원.
 * 체크는 투표했는지만 알린다. 어디에 찍었는지는 누구에게도 보이지 않는다(D-14 안건 1).
 */
export function ParticipantsRow({
  members,
  voted,
  max = 8,
  className,
}: {
  members: readonly RoomMember[];
  voted: number;
  max?: number;
  className?: string;
}) {
  const initials = initialsFor(members);
  const shown = members.slice(0, max);
  const rest = members.length - shown.length;
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <span
        role="img"
        aria-label={copy.head.avatarsLabel(voted, members.length)}
        className="inline-flex items-center"
      >
        <span aria-hidden className="flex -space-x-2">
          {shown.map((m) => (
            <span key={m.id} className="relative">
              <Avatar className="ring-2 ring-background">
                <AvatarFallback className="type-caption">
                  {initials.get(m.id)}
                </AvatarFallback>
              </Avatar>
              {m.hasVoted ? (
                <span className="absolute -right-0.5 -bottom-0.5 flex size-3.5 items-center justify-center rounded-full bg-success text-success-foreground ring-2 ring-background">
                  <Check className="size-2.5" strokeWidth={3} />
                </span>
              ) : null}
            </span>
          ))}
        </span>
        {rest > 0 ? (
          <span aria-hidden className="ml-2 type-caption text-muted-foreground">
            {copy.head.moreShown(rest)}
          </span>
        ) : null}
      </span>
      <p className="type-body-sm text-muted-foreground">
        {copy.head.votedOf(voted, members.length)}
      </p>
    </div>
  );
}

/** 실시간 점 + "실시간". 구독이 실제로 붙은 뒤(live)에만 보인다. 붙는 중에는 아무것도 보이지 않는다 */
export function LiveDot() {
  return (
    <span className="inline-flex items-center gap-1.5 type-caption text-muted-foreground">
      <span aria-hidden className="relative flex size-2">
        {/* 실시간 점 둘레: 스켈레톤과 같은 3.2초 opacity 호흡, 축소 모드면 정지(둘레 숨김). T8.8 사용자 결정 P3 */}
        <span className="absolute -inset-1 rounded-full bg-success/30 opacity-0 motion-safe:animate-skeleton-breathe" />
        <span className="relative size-2 rounded-full bg-success" />
      </span>
      <span aria-label={copy.live.onLabel}>{copy.live.on}</span>
    </span>
  );
}

/** 실시간 끊김 한 줄 + 다시 연결 (D-14 안건 10). 토스트로 알리지 않는다 */
export function LiveLostLine({
  onReconnect,
  className,
}: {
  onReconnect: () => void;
  className?: string;
}) {
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
        onClick={onReconnect}
        className={cn(textButton, "shrink-0")}
      >
        {copy.actions.reconnect}
      </button>
    </div>
  );
}

/** 오프라인 한 줄: 마지막 득표를 그대로 보인다 */
export function OfflineLine({
  body = copy.states.offline.body,
  className,
}: {
  body?: string;
  className?: string;
}) {
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
        {body}
      </p>
    </div>
  );
}

/* ---------- 후보 ---------- */

/** 후보 이름. 못 맞추면 "후보 N" + 카카오맵 링크(place_url, 새 창). 이름은 세션 값이라 저장하지 않는다 */
export function CandidateName({
  place,
  order,
  className,
}: {
  place: CandidatePlace;
  order: number;
  className?: string;
}) {
  if (place.status === "resolved") {
    return <span className={cn("break-keep", className)}>{place.name}</span>;
  }
  if (place.status === "loading") {
    return (
      <span className={cn("inline-block", className)}>
        <span className="sr-only">{copy.candidate.loadingName}</span>
        <Skeleton
          aria-hidden
          className="inline-block h-[0.9em] w-32 rounded-full align-middle"
        />
      </span>
    );
  }
  return (
    <span className="flex flex-col items-start gap-1">
      <span className={className}>{copy.candidate.unresolved(order)}</span>
      <a
        href={place.placeUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={copy.candidate.kakaoMapLabel(order)}
        className={cn(textButton, "pointer-events-auto relative z-[1]")}
      >
        {copy.candidate.kakaoMap}
        <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.5} />
      </a>
    </span>
  );
}

/** 이름 문자열(접근성 이름, 버튼 문구) */
export function nameOf(place: CandidatePlace, order: number): string {
  return place.status === "resolved"
    ? place.name
    : copy.candidate.unresolved(order);
}

/** 후보 그림. 이름을 못 맞추면 카테고리도 모르므로 점선 빈 원 */
export function CandidateArt({
  place,
  size,
  className,
}: {
  place: CandidatePlace;
  size: number;
  className?: string;
}) {
  if (place.status !== "resolved") {
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
      slug={place.slug}
      size={size}
      className={cn("shrink-0", className)}
    />
  );
}

/** 메타 "도보 4분 | 1인 9천 원대" (D-14 안건 12) */
export function CandidateMeta({ place }: { place: CandidatePlace }) {
  if (place.status !== "resolved") return null;
  return (
    <p className="type-caption text-muted-foreground tabular-nums">
      {copy.candidate.walk} {place.walkMinutes}
      {copy.candidate.minuteUnit}
      {place.price ? (
        <>
          {divider}
          {copy.candidate.price} {formatPriceBand(place.price.priceKRW)}
        </>
      ) : null}
    </p>
  );
}

/** 배지(최대 2개): 못 먹는 분 있음 > 할인 > 제보. 제휴는 두지 않는다(DEAL-05) */
export function candidateBadges(
  place: CandidatePlace,
  avoid: boolean,
): PlaceBadge[] {
  const out: PlaceBadge[] = [];
  if (avoid) out.push({ kind: "avoidWarning" });
  if (place.status === "resolved" && place.dealCount > 0) {
    out.push({ kind: "deal" }, { kind: "report" });
  }
  return out;
}

export function CandidateBadges({ badges }: { badges: readonly PlaceBadge[] }) {
  if (badges.length === 0) return null;
  return <PlaceBadges badges={badges} className="mt-1" />;
}

/**
 * 득표 바: 트랙 vote-bar-track 8px 알약, 1위 채움 vote-bar, 나머지 chart-3.
 * 길이는 bar 스프링(값이 바뀔 때만, DESIGN.md 5장 "득표 바"). 처음 보일 때 0에서 차오른다. 축소 모드는 즉시.
 */
export function VoteBar({
  value,
  max,
  leading,
  className,
}: {
  value: number;
  max: number;
  leading: boolean;
  className?: string;
}) {
  const reduced = useMotionReduced();
  const ratio = max === 0 ? 0 : value / max;
  return (
    <span
      aria-hidden
      className={cn(
        "block h-2 w-full overflow-hidden rounded-full bg-vote-bar-track",
        className,
      )}
    >
      <m.span
        initial={reduced ? false : { scaleX: 0 }}
        animate={{ scaleX: ratio }}
        transition={reduced ? INSTANT : motionPresets["spring-bar"].transition}
        className={cn(
          "block h-full w-full origin-left rounded-full transition-colors duration-(--lm-duration-base) ease-standard",
          leading ? "bg-vote-bar" : "bg-chart-3",
        )}
      />
    </span>
  );
}

/** 득표 수 "3표" (NumberFlow) */
export function VoteCount({
  value,
  leading,
}: {
  value: number;
  leading: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "w-11 shrink-0 text-right type-numeric-md",
        leading ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <RollingNumber value={value} suffix={copy.candidate.voteUnit} />
    </span>
  );
}

/** 왼쪽 고름 표시: 라디오 원(복수면 둥근 네모). 고르면 1.5px 올리브 테두리 + 안쪽 점 */
export function SelectMark({
  selected,
  multi,
}: {
  selected: boolean;
  multi: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none mt-1.5 flex size-6 shrink-0 items-center justify-center border transition-[border-color,border-width] duration-(--lm-duration-fast) ease-standard",
        multi ? "rounded-md" : "rounded-full",
        selected ? "border-[1.5px] border-primary" : "border-input",
      )}
    >
      {selected ? (
        multi ? (
          <Check className="size-3.5 text-primary" strokeWidth={2} />
        ) : (
          <span className="size-2.5 rounded-full bg-primary ease-standard motion-safe:transition-transform motion-safe:duration-(--lm-duration-fast) motion-safe:starting:scale-0" />
        )
      ) : null}
    </span>
  );
}

/* ---------- 기피 경고 ---------- */

export function AvoidNote({ className }: { className?: string }) {
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

/* ---------- 확인 상자 ---------- */

/** 그 자리 확인 (방장 결정, 투표 취소). 열리면 첫 버튼으로 포커스 */
export function ConfirmBox({
  title,
  body,
  confirm,
  keep,
  destructive = false,
  busy = false,
  onConfirm,
  onKeep,
  className,
}: {
  title: string;
  body: string;
  confirm: string;
  keep: string;
  destructive?: boolean;
  busy?: boolean;
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
      onKeyDown={(e) => {
        if (e.key === "Escape") onKeep();
      }}
    >
      <p id={titleId} className="type-label">
        {title}
      </p>
      <p className="mt-1 type-body-sm text-muted-foreground">{body}</p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          aria-disabled={busy || undefined}
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

/* ---------- 뼈대 ---------- */

/** 로딩: 머리 + 참여 줄 + 후보 줄 뼈대 (스피너 금지) */
export function RoomSkeleton({
  label = copy.states.loading,
}: {
  label?: string;
}) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-6 pt-14">
      <h1 className="sr-only">{label}</h1>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3.5 w-28 rounded-full" />
        <Skeleton className="h-8 w-60 rounded-full" />
        <Skeleton className="h-8 w-40 rounded-full" />
      </div>
      <div className="flex items-end justify-between border-b border-border pb-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-36 rounded-full" />
          <Skeleton className="h-3.5 w-32 rounded-full" />
        </div>
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className="flex flex-col gap-7">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-start gap-4">
            <Skeleton className="size-6 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2.5">
              <Skeleton className="h-5 w-1/2 rounded-full" />
              <Skeleton className="h-3 w-1/3 rounded-full" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
            <Skeleton className="size-11 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** 결과 카드 숫자 칸 (홈 큰 카드 문법) */
export function Stat({
  label,
  value,
  unit,
  text,
}: {
  label: string;
  value?: number;
  unit?: string;
  text?: string;
}) {
  return (
    <div className="flex flex-col gap-1 px-3 first:pl-0 last:pr-0">
      <dt className="type-caption text-muted-foreground">{label}</dt>
      <dd className="flex items-baseline gap-0.5 whitespace-nowrap">
        {text ? (
          <span className="type-numeric-md">{text}</span>
        ) : (
          <>
            <span className="type-numeric-lg">
              <RollingNumber value={value ?? 0} from={0} />
            </span>
            <span className="type-body-sm text-muted-foreground">{unit}</span>
          </>
        )}
      </dd>
    </div>
  );
}

/** 페이드 업 래퍼(축소 모드 즉시) */
export const enterClass =
  "motion-safe:transition-[opacity,translate] motion-safe:duration-(--lm-duration-slow) motion-safe:ease-enter motion-safe:starting:translate-y-2 motion-safe:starting:opacity-0";
