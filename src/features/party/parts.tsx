"use client";
// 회식 모드 화면 조각 (T7.25~T7.28, DESIGN.md 5장 "회식 모드"). 시안 C(결과 먼저) + A 근거 줄 + B 질문 부품을 옮겼다(D-16).
// 근거 표시(PARTY-03, 04): 제보로 확인 = 올리브 원 + 흰 체크, 카테고리 추정 = 점선 원 + 회색 체크, 정보 없음 = 회색 줄 +
// 네이버 플레이스 링크. 색만으로 나누지 않고 모양이 다르다.
import { Check, Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState, ErrorState, OfflineState } from "@/components/states";
import { buttonClass as rawButtonClass } from "@/components/ui/button-classes";
import { focusRing } from "@/components/ui/interaction";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { partyCopy as copy } from "@/copy/party";
import { categoryLabel } from "@/features/place/categories";
import { CATEGORY_INK } from "@/features/place/category-ink";
import { CategoryIllustration } from "@/features/place/illustrations";
import { formatShortWon, priceBandParts } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  BUDGET_MAX,
  BUDGET_MIN,
  BUDGET_STEP,
  HEADCOUNT_MAX,
  HEADCOUNT_MIN,
} from "./conditions";
import {
  NAVER_MAP_HREF,
  naverPlaceHref,
  type Evidence,
  type EvidenceStatus,
  type PartyPick,
} from "./rank";

/** 기본 border-transparent와 variant 테두리색이 겹쳐 cn으로 정리한다(0e6e51f) */
export const buttonClass = (...args: Parameters<typeof rawButtonClass>) =>
  cn(rawButtonClass(...args));

/** 등장(base, enter, 아래에서 4px). 축소 모드면 없음 */
export const enterClass =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:[animation-duration:var(--lm-duration-base)] motion-safe:[animation-timing-function:var(--lm-ease-enter)] motion-safe:[animation-fill-mode:both]";

/** stagger 70ms (DESIGN.md 7장) */
export function staggerStyle(i: number) {
  return { animationDelay: `${i * 70}ms` };
}

export const textLinkClass = cn(
  "inline-flex min-h-11 items-center rounded-sm type-label text-foreground underline decoration-muted-foreground decoration-1 underline-offset-3 hover:decoration-foreground",
  focusRing,
);

/** 하단 고정 행동 줄(탭 바 위). 데스크톱은 리스트 칸 안 일반 흐름 */
export function BottomAction({
  children,
  note,
}: {
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="sticky bottom-[calc(var(--lm-layout-tab-bar-height)+env(safe-area-inset-bottom,0px))] z-[5] -mx-(--lm-layout-gutter) mt-auto border-t border-border bg-background px-(--lm-layout-gutter) pt-3 pb-3 desktop:mx-0 desktop:px-0 desktop:pt-4">
      {note}
      {children}
    </div>
  );
}

/** 번호 원(지도 핀과 목록 행이 같은 모양이라 둘을 잇는다) */
export function PinNumber({
  n,
  active,
  className,
}: {
  n: number;
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-full border type-caption tabular-nums transition-colors duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-foreground/40 bg-card text-foreground",
        className,
      )}
    >
      {n}
    </span>
  );
}

/* ---------- 근거 ---------- */

const STATUS_SR: Record<EvidenceStatus, string> = {
  met: copy.evidence.met,
  estimate: copy.evidence.estimated,
  unknown: copy.evidence.missing,
};

export function EvidenceMark({
  status,
  className,
}: {
  status: EvidenceStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-full",
        status === "met" && "bg-primary text-primary-foreground",
        status === "estimate" &&
          "border border-dashed border-muted-foreground text-muted-foreground",
        status === "unknown" && "text-muted-foreground",
        className,
      )}
    >
      {status === "unknown" ? (
        <Minus aria-hidden className="size-3.5" strokeWidth={2} />
      ) : (
        <Check aria-hidden className="size-3" strokeWidth={2.5} />
      )}
    </span>
  );
}

const FIELD_LABEL = {
  budget: copy.fields.budget,
  room: copy.fields.room,
  alcohol: copy.fields.alcohol,
} as const;

/** 근거 한 줄의 문장(값 → copy) */
export function evidenceText(e: Evidence): string {
  switch (e.key) {
    case "budget":
      return e.status === "met"
        ? copy.evidence.budgetReport(e.priceKRW, e.count)
        : copy.evidence.budgetEstimate(e.priceKRW);
    case "room":
      if (e.status === "unknown") return copy.evidence.unknown;
      return e.kind === "room"
        ? copy.evidence.roomReport(e.count)
        : copy.evidence.groupReport(e.count);
    case "alcohol":
      return e.status === "met"
        ? copy.evidence.alcoholPub
        : copy.evidence.alcoholLikely(categoryLabel(e.category));
  }
}

/** 근거 줄 목록(A): 고정 폭 조건 라벨 칸 + 3단계 표시. 정보 없음이면 네이버 플레이스 링크(PARTY-04) */
export function EvidenceList({
  items,
  name,
  className,
}: {
  items: readonly Evidence[];
  name: string;
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-col gap-1.5", className)}>
      {items.map((e) => (
        <li key={e.key} className="flex min-h-6 items-start gap-2.5">
          <EvidenceMark status={e.status} className="mt-0.5" />
          <span className="w-[4.75rem] shrink-0 type-body-sm text-muted-foreground">
            {FIELD_LABEL[e.key]}
            <span className="sr-only">: </span>
          </span>
          <span className="min-w-0 type-body-sm">
            <span
              className={
                e.status === "met" ? "text-foreground" : "text-muted-foreground"
              }
            >
              {e.status === "unknown"
                ? `${evidenceText(e)}, `
                : evidenceText(e)}
            </span>
            {e.status === "unknown" ? (
              <a
                href={naverPlaceHref(name)}
                target="_blank"
                rel="noreferrer"
                aria-label={copy.evidence.checkNaverLabel(name)}
                className={cn(
                  "relative rounded-sm text-foreground underline decoration-muted-foreground decoration-1 underline-offset-3 hover:decoration-foreground",
                  "before:absolute before:-inset-x-1 before:-inset-y-3",
                  focusRing,
                )}
              >
                {copy.evidence.checkNaver}
              </a>
            ) : null}
            {e.status !== "unknown" ? (
              <span className="sr-only">, {STATUS_SR[e.status]}</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function EvidenceLegend({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1 type-caption text-muted-foreground",
        className,
      )}
    >
      <span className="sr-only">{copy.evidence.legendTitle}: </span>
      <span className="inline-flex items-center gap-1.5">
        <EvidenceMark status="met" className="size-4" />
        {copy.evidence.legendMet}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <EvidenceMark status="estimate" className="size-4" />
        {copy.evidence.legendEstimate}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <EvidenceMark status="unknown" className="size-4" />
        {copy.evidence.legendUnknown}
      </span>
    </p>
  );
}

/* ---------- 후보 숫자와 카테고리 ---------- */

/** 도보 | 1인 | 만족 숫자 3칸(numeric-md, 칸 사이 1px 세로선) */
export function CandidateNumbers({
  c,
  className,
}: {
  c: PartyPick;
  className?: string;
}) {
  const band = priceBandParts(c.price.krw);
  return (
    <dl
      className={cn(
        "grid grid-cols-[auto_auto_auto] justify-start divide-x divide-border",
        className,
      )}
    >
      <div className="flex flex-col gap-0.5 pr-4">
        <dt className="type-caption text-muted-foreground">
          {copy.candidate.walk}
        </dt>
        <dd className="whitespace-nowrap">
          <span className="type-numeric-md text-foreground">
            {c.walkMinutes}
          </span>
          <span className="ml-0.5 type-caption text-muted-foreground">
            {copy.candidate.walkUnit}
          </span>
        </dd>
      </div>
      <div className="flex flex-col gap-0.5 px-4">
        <dt className="type-caption text-muted-foreground">
          {copy.candidate.price}
          {c.price.estimate ? (
            <span className="ml-1">
              <span aria-hidden>{copy.candidate.estimate}</span>
              <span className="sr-only">{copy.candidate.estimateLabel}</span>
            </span>
          ) : null}
        </dt>
        <dd className="whitespace-nowrap">
          <span className="type-numeric-md text-foreground">{band.amount}</span>
          <span className="ml-0.5 type-caption text-muted-foreground">
            {band.unit}
          </span>
        </dd>
      </div>
      <div className="flex flex-col gap-0.5 pl-4">
        <dt className="type-caption text-muted-foreground">
          {copy.candidate.thumbs}
        </dt>
        <dd className="whitespace-nowrap">
          {c.thumbsUpRate === null ? (
            <span className="type-caption text-muted-foreground">
              {copy.candidate.thumbsNone}
            </span>
          ) : (
            <>
              <span className="type-numeric-md text-foreground">
                {c.thumbsUpRate}
              </span>
              <span className="ml-0.5 type-caption text-muted-foreground">
                {copy.candidate.thumbsUnit}
              </span>
            </>
          )}
        </dd>
      </div>
    </dl>
  );
}

export function CategoryLine({ c }: { c: PartyPick }) {
  return (
    <span className={cn("type-caption", CATEGORY_INK[c.category])}>
      {categoryLabel(c.category)}
    </span>
  );
}

/* ---------- 조건 입력 부품 ---------- */

/** 인원 스테퍼: 큰 숫자 + 원 버튼 −/+ (44px) */
export function HeadcountStepper({
  value,
  onChange,
  large,
  labelledBy,
}: {
  value: number;
  onChange: (n: number) => void;
  /** 첫 질문 화면: 숫자를 display 크기로 */
  large?: boolean;
  labelledBy?: string;
}) {
  const round = cn(
    "inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-foreground hover:bg-muted disabled:opacity-40",
    focusRing,
  );
  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      className="flex items-center gap-5"
    >
      <button
        type="button"
        aria-label={copy.fields.headcountDecrease}
        disabled={value <= HEADCOUNT_MIN}
        onClick={() => onChange(Math.max(HEADCOUNT_MIN, value - 1))}
        className={round}
      >
        <Minus aria-hidden className="size-5" strokeWidth={1.5} />
      </button>
      <output
        aria-live="polite"
        className="flex min-w-16 items-baseline justify-center tabular-nums"
      >
        <span
          className={cn(
            "text-foreground",
            large
              ? "text-[3.5rem] leading-none font-[450] tracking-[-0.03em]"
              : "type-numeric-lg",
          )}
        >
          {value}
        </span>
        <span className="ml-1 type-label text-muted-foreground">
          {copy.fields.headcountUnit}
        </span>
      </output>
      <button
        type="button"
        aria-label={copy.fields.headcountIncrease}
        disabled={value >= HEADCOUNT_MAX}
        onClick={() => onChange(Math.min(HEADCOUNT_MAX, value + 1))}
        className={round}
      >
        <Plus aria-hidden className="size-5" strokeWidth={1.5} />
      </button>
    </div>
  );
}

/** 1인 예산 슬라이더(공용 Slider, 1만~10만, 5천 단위) */
export function BudgetSlider({
  value,
  onChange,
  label = copy.fields.budget,
  hideLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  label?: string;
  hideLabel?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Slider
        label={hideLabel ? undefined : label}
        thumbLabel={hideLabel ? label : undefined}
        value={value}
        min={BUDGET_MIN}
        max={BUDGET_MAX}
        step={BUDGET_STEP}
        formatValue={formatShortWon}
        onValueChange={(v) => onChange(Array.isArray(v) ? (v[0] ?? value) : v)}
      />
      <div
        aria-hidden
        className="flex justify-between type-caption text-muted-foreground"
      >
        <span>{formatShortWon(BUDGET_MIN)}</span>
        <span>{formatShortWon(BUDGET_MAX)}</span>
      </div>
    </div>
  );
}

/* ---------- 상태 ---------- */

/** 번호 원 + 막대 4줄 뼈대 × 5 */
export function CandidateSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div aria-hidden className="flex flex-col">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex gap-4 border-b border-border py-5 last:border-b-0"
        >
          <Skeleton className="size-7 rounded-full" />
          <div className="flex flex-1 flex-col gap-2.5">
            <Skeleton className="h-3.5 w-14" />
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-9 w-52" />
            <Skeleton className="h-4 w-44" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 0곳: 빈 상태(이 화면의 유일한 주 행동이라 primary) */
export function PartyEmpty({ onAction }: { onAction: () => void }) {
  return (
    <EmptyState
      title={copy.states.emptyTitle}
      body={copy.states.emptyBody}
      visual={<CategoryIllustration slug="pub" />}
      action={{
        label: copy.states.emptyAction,
        variant: "primary",
        onClick: onAction,
      }}
    />
  );
}

/** 카카오 실패(재시도 1회 뒤): 다시 시도 + 네이버 지도에서 보기(PRD 12장) */
export function PartyError({
  onRetry,
  title = copy.states.errorTitle,
  body = copy.states.errorBody,
  action = copy.states.errorAction,
  withNaver = true,
}: {
  onRetry: () => void;
  title?: string;
  body?: string;
  action?: string;
  withNaver?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <ErrorState
        title={title}
        body={body}
        action={{ label: action, onClick: onRetry }}
      />
      {withNaver ? (
        <a
          href={NAVER_MAP_HREF}
          target="_blank"
          rel="noreferrer"
          className={cn(textLinkClass, "mt-3 self-start")}
        >
          {copy.actions.naverMap}
        </a>
      ) : null}
    </div>
  );
}

export function PartyOffline() {
  return (
    <OfflineState
      title={copy.states.offlineTitle}
      body={copy.states.offlineBody}
    />
  );
}

/** 5곳 미만 안내(목록 아래 테두리 상자, 습니다체 + 해요체 + 보조 버튼) */
export function FewNote({
  count,
  body,
  onAction,
}: {
  count: number;
  body: string;
  onAction: () => void;
}) {
  return (
    <section
      aria-labelledby="party-few-title"
      className="mt-6 rounded-card border border-border px-6 py-5"
    >
      <h2 id="party-few-title" className="type-label text-foreground">
        {copy.few.title(count)}
      </h2>
      <p className="mt-1 type-body-sm text-muted-foreground">{body}</p>
      <button
        type="button"
        onClick={onAction}
        className={cn(buttonClass("secondary", "sm"), "mt-4")}
      >
        {copy.few.action}
      </button>
    </section>
  );
}

/** 콜드 스타트 안내(목록 위 왼쪽 선 한 덩어리) */
export function ColdNote({ className }: { className?: string }) {
  return (
    <div className={cn("border-l-2 border-border pl-4", className)}>
      <p className="type-label text-foreground">{copy.cold.title}</p>
      <p className="mt-1 type-body-sm text-muted-foreground">
        {copy.cold.body}
      </p>
    </div>
  );
}

export function LiveNote({ message }: { message: string }) {
  return (
    <p aria-live="polite" className="sr-only">
      {message}
    </p>
  );
}
