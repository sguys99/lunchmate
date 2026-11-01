"use client";
// 회식 모드 시안 공용 조각 (T7.3). 세 안이 같은 근거 표시, 지도 자리, 4상태, 조건 입력 부품을 쓴다.
// 틀: 투표 탭 안 화면(하단 탭 활성 "투표"). 데스크톱 1024px 이상은 좌 리스트(최대 460) + 우 지도 2단(홈 D1, 지도 B와 같은 틀).
// 지도 자리는 실제 지도 대신 토큰 면 + 길 선 + 회사 핀 + 도보 15분 점선 원 + 번호 핀 5개.
// 근거 표시(PARTY-03, 04): 제보로 확인 = 올리브 체크, 카테고리 추정 = 회색 체크 + "추정", 정보 없음 = 회색 줄 + 네이버 플레이스 링크.
import { ArrowLeft, Check, Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { TabBarView } from "@/components/app-shell";
import { EmptyState, ErrorState, OfflineState } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonClass as rawButtonClass } from "@/components/ui/button-classes";
import { focusRing } from "@/components/ui/interaction";
import { Slider } from "@/components/ui/slider";
import { partyLabCopy as copy } from "@/copy/design-lab-party";
import { MapLines } from "@/features/design-lab/system/b/parts";
import { DesktopSplit } from "@/features/design-lab/system/desktop-split";
import { CategoryIllustration } from "@/features/place/illustrations";
import { categoryLabel } from "@/features/place/categories";
import { CATEGORY_INK } from "@/features/design-lab/system/b/parts";
import { formatShortWon, priceBandParts } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  BUDGET_MAX,
  BUDGET_MIN,
  BUDGET_STEP,
  HEADCOUNT_MAX,
  HEADCOUNT_MIN,
  NAVER_MAP_HREF,
  OFFICE_POSITION,
  PARTY_PIN_POSITIONS,
  PARTY_PIN_POSITIONS_COMPACT,
  displayPrice,
  naverPlaceHref,
  type Evidence,
  type EvidenceStatus,
  type PartyCandidate,
} from "./mock";

/** 기본 border-transparent와 variant 테두리색이 겹쳐 cn으로 정리한다 */
export const buttonClass = (...args: Parameters<typeof rawButtonClass>) =>
  cn(rawButtonClass(...args));

/** 등장(base, enter, 아래에서 4px). 축소 모드면 없음 */
export const enterClass =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:[animation-duration:var(--lm-duration-base)] motion-safe:[animation-timing-function:var(--lm-ease-enter)] motion-safe:[animation-fill-mode:both]";

/** stagger 70ms (DESIGN.md 7장) */
export function staggerStyle(i: number) {
  return { animationDelay: `${i * 70}ms` };
}

/** 글자 링크(밑줄 1px, 터치 44) */
export const textLinkClass = cn(
  "inline-flex min-h-11 items-center rounded-sm type-label text-foreground underline decoration-muted-foreground decoration-1 underline-offset-3 hover:decoration-foreground",
  focusRing,
);

/* ---------- 틀 ---------- */

export function PartyFrame({
  children,
  map,
}: {
  children: ReactNode;
  map: ReactNode;
}) {
  return (
    <DesktopSplit
      list={children}
      map={map}
      tabBar={<TabBarView activeId="poll" preview />}
    />
  );
}

export function PartyColumn({
  children,
  className,
  busy,
}: {
  children: ReactNode;
  className?: string;
  busy?: boolean;
}) {
  return (
    <main
      aria-busy={busy || undefined}
      className={cn(
        "mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-3 pb-8 break-keep desktop:max-w-(--lm-layout-desktop-list-max-width) desktop:px-10 desktop:pt-8 desktop:pb-10",
        className,
      )}
    >
      {children}
    </main>
  );
}

/** 머리: 뒤로(투표) + 눈썹 "회식 모드" + 세리프 제목 + 저녁 고정 한 줄 */
export function PartyHeader({
  title,
  showFixed = true,
  trailing,
}: {
  title: string;
  showFixed?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <header className="flex flex-col">
      <div className="-ml-3 flex h-12 items-center justify-between">
        <button
          type="button"
          aria-label={copy.head.back}
          className={cn(
            "inline-flex size-11 items-center justify-center rounded-full text-foreground hover:bg-muted",
            focusRing,
          )}
        >
          <ArrowLeft aria-hidden className="size-5" strokeWidth={1.5} />
        </button>
        {trailing}
      </div>
      <p className="mt-3 type-caption text-muted-foreground">
        {copy.head.eyebrow}
      </p>
      <h1 className="mt-1 type-title text-foreground">{title}</h1>
      {showFixed ? (
        <p className="mt-2 type-body-sm text-muted-foreground">
          {copy.head.fixed}
        </p>
      ) : null}
    </header>
  );
}

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

/* ---------- 지도 자리 ---------- */

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

export function PartyMap({
  candidates,
  active = -1,
  onPick,
  className,
  compact,
  loading,
}: {
  candidates: readonly PartyCandidate[];
  active?: number;
  onPick?: (i: number) => void;
  className?: string;
  /** 모바일 띠 지도(C). 이름 펼침 없이 번호만 */
  compact?: boolean;
  loading?: boolean;
}) {
  const interactive = Boolean(onPick) && candidates.length > 0;
  return (
    <div
      role={interactive ? "group" : "img"}
      aria-label={copy.map.region}
      className={cn(
        "relative min-h-44 flex-1 overflow-hidden bg-muted",
        className,
      )}
    >
      <MapLines />
      {/* 도보 15분 원 (회사 핀 중심) */}
      <span
        aria-hidden
        className={cn(
          "absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-primary/45",
          compact ? "h-[86%]" : "w-[78%] max-w-[34rem]",
        )}
        style={OFFICE_POSITION}
      />
      <span
        aria-hidden
        className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
        style={OFFICE_POSITION}
      >
        <span className="size-3 rotate-45 border-[1.5px] border-foreground bg-background" />
        {compact ? null : (
          <span className="type-caption text-muted-foreground">
            {copy.map.office}
          </span>
        )}
      </span>
      {compact ? null : (
        <span
          aria-hidden
          className="absolute right-4 bottom-4 rounded-chip border border-border bg-background/90 px-3 py-1 type-caption text-muted-foreground"
        >
          {copy.map.radius}
        </span>
      )}
      {loading
        ? null
        : candidates.map((c, i) => {
            const positions = compact
              ? PARTY_PIN_POSITIONS_COMPACT
              : PARTY_PIN_POSITIONS;
            const pos = positions[i] ?? positions[0];
            const isActive = i === active;
            const body = (
              <>
                <PinNumber n={i + 1} active={isActive} />
                {!compact && isActive ? (
                  <span
                    aria-hidden
                    className="rounded-chip border border-primary bg-card px-2.5 py-0.5 type-caption whitespace-nowrap text-foreground"
                  >
                    {c.name}
                  </span>
                ) : null}
              </>
            );
            const place =
              "absolute flex -translate-x-3.5 -translate-y-1/2 items-center gap-1.5";
            return interactive ? (
              <button
                key={c.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => onPick?.(i)}
                className={cn(
                  place,
                  "rounded-full before:absolute before:top-1/2 before:left-3.5 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2",
                  focusRing,
                  isActive && "z-[2]",
                )}
                style={pos}
              >
                {/* 이름은 보이는 글자에서 읽는다(aria-label을 쓰면 보이는 글과 이름이 어긋난다) */}
                <span className="sr-only">
                  {copy.map.pinLabel(i + 1, c.name)}
                </span>
                {body}
              </button>
            ) : (
              <span
                key={c.id}
                aria-hidden
                className={cn(place, isActive && "z-[2]")}
                style={pos}
              >
                {body}
              </span>
            );
          })}
    </div>
  );
}

/** 데스크톱 오른쪽 칸 */
export function DesktopMap(props: Parameters<typeof PartyMap>[0]) {
  return (
    <PartyMap
      {...props}
      className={cn("h-full border-l border-border", props.className)}
    />
  );
}

/* ---------- 근거 ---------- */

const STATUS_SR: Record<EvidenceStatus, string> = {
  met: copy.evidence.met,
  estimate: copy.evidence.estimated,
  unknown: copy.evidence.missing,
};

/** 근거 표시 아이콘(16px 원 안). 색에만 기대지 않게 모양이 다르다: 체크 / 점선 원 안 체크 / 줄 */
export function EvidenceMark({
  status,
  className,
  withLabel,
}: {
  status: EvidenceStatus;
  className?: string;
  /** 스크린 리더용 상태 이름을 함께 읽게 한다(비교표 칸) */
  withLabel?: boolean;
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
      {withLabel ? <span className="sr-only">{STATUS_SR[status]}</span> : null}
    </span>
  );
}

const FIELD_LABEL = {
  budget: copy.fields.budget,
  room: copy.fields.room,
  alcohol: copy.fields.alcohol,
} as const;

/** 근거 줄 목록. 정보 없음이면 "네이버 플레이스에서 확인" 링크를 붙인다(PARTY-04) */
export function EvidenceList({
  items,
  name,
  showField = true,
  className,
}: {
  items: readonly Evidence[];
  name: string;
  showField?: boolean;
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-col gap-1.5", className)}>
      {items.map((e) => (
        <li key={e.key} className="flex min-h-6 items-start gap-2.5">
          <EvidenceMark status={e.status} className="mt-0.5" />
          {showField ? (
            <span className="w-[4.75rem] shrink-0 type-body-sm text-muted-foreground">
              {FIELD_LABEL[e.key]}
              <span className="sr-only">: </span>
            </span>
          ) : null}
          <span className="min-w-0 type-body-sm">
            <span
              className={cn(
                e.status === "met"
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {e.status === "unknown" ? `${e.text}, ` : e.text}
            </span>
            {e.status === "unknown" ? (
              <a
                href={naverPlaceHref(name)}
                target="_blank"
                rel="noreferrer"
                aria-label={copy.evidence.checkNaverLabel(name)}
                className={cn(
                  "relative rounded-sm whitespace-nowrap text-foreground underline decoration-muted-foreground decoration-1 underline-offset-3 hover:decoration-foreground",
                  "before:absolute before:-inset-x-1 before:-inset-y-3",
                  focusRing,
                )}
              >
                {copy.evidence.checkNaver}
              </a>
            ) : null}
            {e.status === "estimate" ? (
              <span className="sr-only">, {copy.evidence.estimated}</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** 표시 뜻(한 줄, caption) */
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

/* ---------- 후보 숫자 ---------- */

/** 도보 | 1인 | 만족 숫자 3칸(numeric-md, 칸 사이 1px 세로선) */
export function CandidateNumbers({
  c,
  className,
}: {
  c: PartyCandidate;
  className?: string;
}) {
  const price = displayPrice(c);
  const band = priceBandParts(price.krw);
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
          {price.estimate ? (
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

/** 카테고리 이름(카테고리 잉크 색) + 작은 그림 */
export function CategoryLine({
  c,
  withIcon = true,
}: {
  c: PartyCandidate;
  withIcon?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {withIcon ? <CategoryIllustration slug={c.category} size={24} /> : null}
      <span className={cn("type-caption", CATEGORY_INK[c.category])}>
        {categoryLabel(c.category)}
      </span>
    </span>
  );
}

/* ---------- 조건 입력 부품 ---------- */

/** 인원 스테퍼: 큰 숫자(numeric-lg) + 원 버튼 −/+ (44px) */
export function HeadcountStepper({
  value,
  onChange,
  large,
  labelledBy,
}: {
  value: number;
  onChange: (n: number) => void;
  /** B 질문 화면: 숫자를 display 크기로 */
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

export function LoadingNote() {
  return <p className="sr-only">{copy.states.loading}</p>;
}

/** 0곳: 빈 상태(이 화면의 유일한 주 행동이라 primary) */
export function PartyEmpty({ onAction }: { onAction?: () => void }) {
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

/** 카카오 실패: 다시 시도 + 네이버 지도에서 보기(PRD 12장) */
export function PartyError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col">
      <ErrorState
        title={copy.states.errorTitle}
        body={copy.states.errorBody}
        action={{ label: copy.states.errorAction, onClick: onRetry }}
      />
      <a
        href={NAVER_MAP_HREF}
        target="_blank"
        rel="noreferrer"
        className={cn(textLinkClass, "mt-3 self-start")}
      >
        {copy.actions.naverMap}
      </a>
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

/** 5곳 미만 안내(목록 아래, 습니다체 + 해요체 + 보조 버튼) */
export function FewNote({
  count,
  onAction,
}: {
  count: number;
  onAction?: () => void;
}) {
  return (
    <section
      aria-labelledby="party-few-title"
      className="mt-6 rounded-card border border-border px-6 py-5"
    >
      <h2 id="party-few-title" className="type-label text-foreground">
        {copy.few.title(count)}
      </h2>
      <p className="mt-1 type-body-sm text-muted-foreground">{copy.few.body}</p>
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

/** 콜드 스타트 안내(목록 위 한 덩어리, 면 없음 + 왼쪽 선) */
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

/** 스크린 리더 알림 자리 */
export function LiveNote({ message }: { message: string }) {
  return (
    <p aria-live="polite" className="sr-only">
      {message}
    </p>
  );
}
