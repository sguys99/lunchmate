"use client";
// 투표 만들기 시트 부품 (T7.11, T7.13, D-15, DESIGN.md 5장 "투표 만들기"). create-drawer.tsx가 조립한다.
// - 항목 줄(Row): D-11 항목 줄 문법(라벨 칸, 값, 꺾쇠, 펼침).
// - 마감 큰 칸 2 x 2 (B에서): 위 caption, 아래 시각 numeric-md, 고르면 1.5px primary 테두리.
// - 후보 줄, 넣기 줄, 방식 칩, 제목 칸, 친구에게 보이는 미리보기(서버 OG A를 줄인 모양, 식당 이름 없음), 안내 덩어리.
// 장소 이름과 카테고리는 세션 메모리 값이다. 화면에만 쓰고 저장하지 않는다(CLAUDE.md 7장).
import {
  AlertCircle,
  Check,
  ChevronDown,
  Plus,
  WifiOff,
  X,
} from "lucide-react";
import { useId, type ReactNode } from "react";
import { LoadingRegion, SkeletonLine } from "@/components/states";
import { buttonClass as rawButtonClass } from "@/components/ui/button-classes";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { focusRing, hitArea44, pressMotion } from "@/components/ui/interaction";
import { rowPress } from "@/components/ui/row-press";
import { Skeleton } from "@/components/ui/skeleton";
import { pollCreateCopy as copy } from "@/copy/poll-create";
import { CATEGORY_INK } from "@/features/place/category-ink";
import { categoryLabel, type CategorySlug } from "@/features/place/categories";
import { CategoryIllustration } from "@/features/place/illustrations";
import { cn } from "@/lib/utils";
import {
  clockOf,
  DEADLINE_MIN_LEAD,
  type DeadlineId,
  type DeadlineOption,
} from "./deadline";
import type { PollKind } from "./intent";

/** 기본 border-transparent와 variant 테두리색이 겹쳐 cn으로 정리한다 */
export const buttonClass = (...args: Parameters<typeof rawButtonClass>) =>
  cn(rawButtonClass(...args));

/** 시트 안쪽 좌우 여백 (360px에서 20) */
export const SHEET_PAD = "px-7 max-[23.75rem]:px-5";

export const CANDIDATE_MIN = 2;
export const CANDIDATE_MAX = 5;

/** 시트 안 후보 한 곳. 이름, 카테고리는 세션 메모리(저장 금지) */
export type SheetPlace = {
  placeId: string;
  placeUrl: string;
  name: string | null;
  category: CategorySlug | null;
};

/* ---------- 글자 버튼, 항목 줄 ---------- */

export function TextButton({
  children,
  onClick,
  className,
  ...rest
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  "aria-disabled"?: boolean;
  "aria-describedby"?: string;
}) {
  return (
    <button
      type="button"
      onClick={rest["aria-disabled"] ? undefined : onClick}
      className={cn(
        "inline-flex h-7 w-fit shrink-0 items-center gap-1 rounded-sm px-0.5 type-caption text-muted-foreground underline decoration-border underline-offset-3 hover:text-foreground active:text-foreground aria-disabled:pointer-events-none aria-disabled:opacity-60",
        hitArea44,
        focusRing,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Row({
  label,
  value,
  open,
  readOnly,
  onToggle,
  children,
}: {
  label: string;
  value: ReactNode;
  open: boolean;
  readOnly: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const id = useId();
  const head = (
    <>
      <span className="w-12 shrink-0 type-caption text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 flex-1 type-body-sm">{value}</span>
    </>
  );
  return (
    <li className="border-b border-border last:border-b-0">
      {readOnly ? (
        <div className="flex min-h-14 items-center gap-4 py-2">{head}</div>
      ) : (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={onToggle}
          className={cn(
            "flex min-h-14 w-full items-center gap-4 rounded-md py-2 text-left",
            focusRing,
            rowPress,
          )}
        >
          {head}
          <span className="sr-only">{copy.instant.editHint}</span>
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
              open && "rotate-180",
            )}
            strokeWidth={1.5}
          />
        </button>
      )}
      {open && !readOnly ? (
        <div
          id={id}
          className="flex flex-col gap-4 pb-4 ease-enter motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)]"
        >
          {children}
        </div>
      ) : null}
    </li>
  );
}

export function RowsSkeleton() {
  return (
    <LoadingRegion label={copy.instant.creating}>
      <ul aria-hidden className="flex flex-col border-y border-border">
        {[0, 1, 2, 3].map((i) => (
          <li
            key={i}
            className="flex min-h-14 items-center gap-4 border-b border-border py-2 last:border-b-0"
          >
            <SkeletonLine type="caption" className="w-10" />
            <SkeletonLine type="body" className={i === 2 ? "w-40" : "w-24"} />
          </li>
        ))}
      </ul>
    </LoadingRegion>
  );
}

/* ---------- 후보 ---------- */

function PlaceMeta({ place }: { place: SheetPlace }) {
  if (!place.category) return null;
  return (
    <span className={cn("type-caption", CATEGORY_INK[place.category])}>
      {categoryLabel(place.category)}
    </span>
  );
}

/** 이름을 모르면 "후보 2" (T0.16-2 대체 이름) */
export function placeName(place: SheetPlace, index: number): string {
  return place.name ?? copy.candidates.unnamed(index + 1);
}

/** 넣은 후보 한 줄: 그림 40 + 이름 + 카테고리 + 빼기 */
export function CandidateRow({
  place,
  index,
  onRemove,
  removeDisabled,
}: {
  place: SheetPlace;
  index: number;
  onRemove?: () => void;
  removeDisabled?: boolean;
}) {
  const name = placeName(place, index);
  return (
    <li className="flex min-h-16 items-center gap-3 border-b border-border py-2 last:border-b-0">
      {place.category ? (
        <CategoryIllustration slug={place.category} size={40} />
      ) : (
        <span
          aria-hidden
          className="size-10 shrink-0 rounded-full border border-dashed border-border"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate type-label">{name}</span>
        <PlaceMeta place={place} />
      </div>
      {onRemove ? (
        <button
          type="button"
          aria-label={copy.candidates.remove(name)}
          aria-disabled={removeDisabled || undefined}
          onClick={removeDisabled ? undefined : onRemove}
          className={cn(
            "-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted active:text-foreground aria-disabled:opacity-40",
            focusRing,
            pressMotion,
          )}
        >
          <X aria-hidden className="size-4" strokeWidth={1.5} />
        </button>
      ) : null}
    </li>
  );
}

/** 넣기/빼기 토글 줄 (aria-pressed). 5곳이 차면 넣지 않은 줄은 꺼진다 */
export function PickRow({
  place,
  picked,
  full,
  onToggle,
}: {
  place: SheetPlace & { name: string };
  picked: boolean;
  full: boolean;
  onToggle: () => void;
}) {
  const disabled = !picked && full;
  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        aria-pressed={picked}
        aria-disabled={disabled || undefined}
        onClick={disabled ? undefined : onToggle}
        className={cn(
          "flex min-h-14 w-full items-center gap-3 rounded-md py-2 text-left aria-disabled:opacity-50",
          focusRing,
          rowPress,
        )}
      >
        {place.category ? (
          <CategoryIllustration slug={place.category} size={32} />
        ) : (
          <span aria-hidden className="size-8 shrink-0" />
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate type-label">{place.name}</span>
          <PlaceMeta place={place} />
          <span className="sr-only">{copy.candidates.pickHint}</span>
        </span>
        <span
          aria-hidden
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-full border transition-[border-color,color] duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
            picked
              ? "[border-width:1.5px] border-primary text-primary"
              : "border-border text-muted-foreground",
          )}
        >
          {picked ? (
            <Check className="size-4" strokeWidth={2} />
          ) : (
            <Plus className="size-4" strokeWidth={1.5} />
          )}
        </span>
      </button>
    </li>
  );
}

export function PickSkeleton() {
  return (
    <LoadingRegion label={copy.candidates.loading}>
      <ul aria-hidden className="flex flex-col">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex min-h-14 items-center gap-3 py-2">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <SkeletonLine type="label" className={i === 1 ? "w-20" : "w-28"} />
          </li>
        ))}
      </ul>
    </LoadingRegion>
  );
}

/** 후보가 모자랄 때, 다 찼을 때 한 줄 */
export function CandidateNote({ count }: { count: number }) {
  if (count >= CANDIDATE_MAX)
    return (
      <p className="type-caption break-keep text-muted-foreground">
        {copy.candidates.full}
      </p>
    );
  if (count >= CANDIDATE_MIN) return null;
  return (
    <p className="type-caption break-keep text-foreground">
      {copy.candidates.needOne}
    </p>
  );
}

/* ---------- 마감 ---------- */

export function deadlineLabel(id: DeadlineId, kind: PollKind): string {
  if (id === "fixed") return kind === "dinner" ? "18:00" : "11:30";
  return copy.deadline[id];
}

/** 고른 마감의 "11:35에 마감합니다." */
export function deadlineSentence(at: number | null, kind: PollKind): string {
  if (at === null)
    return kind === "party"
      ? copy.deadline.customPartyRange
      : copy.deadline.customTooSoon;
  const { hhmm, dayOffset } = clockOf(at);
  return dayOffset === 0
    ? copy.deadline.at(hhmm)
    : copy.deadline.atDay(copy.deadline.dayLabel(dayOffset), hhmm);
}

/** 마감 줄 값: "30분 뒤 11:35", 고정 시각 칸이면 시각만 */
export function deadlineValue(
  id: DeadlineId,
  at: number | null,
  kind: PollKind,
): string {
  if (at === null) return copy.deadline.customTooSoon;
  const { hhmm, dayOffset } = clockOf(at);
  const day = dayOffset === 0 ? "" : `${copy.deadline.dayLabel(dayOffset)} `;
  if (id === "custom" || id === "fixed") return `${day}${hhmm}`;
  const label = deadlineLabel(id, kind);
  return label.includes(":") ? label : `${label} ${day}${hhmm}`;
}

/** 마감 큰 칸 2 x 2 (D-15 B에서). 상대 시각은 이름 위 + 시각 아래, 정해진 시각은 "오늘/내일" 위 + 시각 아래 */
export function DeadlineTiles({
  labelledBy,
  options,
  kind,
  value,
  customAt,
  onSelect,
}: {
  labelledBy: string;
  options: readonly DeadlineOption[];
  kind: PollKind;
  value: DeadlineId;
  customAt: number | null;
  onSelect: (id: DeadlineId) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="grid grid-cols-2 gap-2"
    >
      {options.map((o) => {
        const on = value === o.id;
        const time = o.at === null ? null : clockOf(o.at);
        const relative = o.id === "in10" || o.id === "in30" || o.id === "in60";
        const caption =
          o.id === "custom"
            ? copy.deadline.custom
            : relative
              ? deadlineLabel(o.id, kind)
              : time && time.dayOffset > 0
                ? copy.deadline.tileTomorrow
                : copy.deadline.tileToday;
        const big =
          o.id === "custom"
            ? on && customAt !== null
              ? clockOf(customAt).hhmm
              : "--:--"
            : (time?.hhmm ?? "");
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={
              o.id === "custom" && big === "--:--"
                ? copy.deadline.custom
                : `${caption} ${big}`
            }
            onClick={() => onSelect(o.id)}
            className={cn(
              "flex min-h-20 flex-col items-start justify-between rounded-card border bg-card px-4 py-3 text-left",
              on
                ? "[border-width:1.5px] border-primary"
                : "border-border hover:bg-muted active:bg-muted",
              focusRing,
              pressMotion,
            )}
          >
            <span
              className={cn(
                "type-caption",
                on ? "text-primary" : "text-muted-foreground",
              )}
            >
              {caption}
            </span>
            <span className="type-numeric-md tabular-nums">{big}</span>
          </button>
        );
      })}
    </div>
  );
}

export { DEADLINE_MIN_LEAD };

/* ---------- 방식, 제목 ---------- */

export function ModeField({
  multi,
  onChange,
}: {
  multi: boolean;
  onChange: (multi: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2.5">
      <span id={id} className="sr-only">
        {copy.instant.rows.mode}
      </span>
      <ChipGroup
        aria-labelledby={id}
        value={[multi ? "multi" : "single"]}
        onValueChange={(v: unknown[]) => {
          if (v[0] === "single") onChange(false);
          if (v[0] === "multi") onChange(true);
        }}
      >
        <Chip value="single">{copy.mode.single}</Chip>
        <Chip value="multi">{copy.mode.multi}</Chip>
      </ChipGroup>
      <p className="type-caption break-keep text-muted-foreground">
        {multi ? copy.mode.multiNote : copy.mode.singleNote}
      </p>
    </div>
  );
}

export function TitleInput({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error: string | null;
}) {
  const errId = useId();
  const empty = value.trim() === "";
  const message = empty ? copy.title.empty : error;
  return (
    <div className="flex flex-col gap-1.5">
      <input
        aria-label={copy.title.inputLabel}
        aria-invalid={Boolean(message) || undefined}
        aria-describedby={message ? errId : undefined}
        value={value}
        maxLength={copy.title.max}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "min-h-12 min-w-0 rounded-md border border-input bg-card px-4 type-body",
          focusRing,
        )}
      />
      {message ? (
        <p id={errId} className="type-caption text-destructive">
          {message}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- 보내기 ---------- */

/**
 * 친구가 받는 링크 미리보기. D-17 서버 OG A(마루 부리 제목 + 숫자 두 칸)를 줄인 모양.
 * 식당 이름과 카테고리는 넣지 않는다(서버 OG는 카카오를 부르지 않음, POLL-04).
 */
export function InvitePreview({
  kind,
  title,
  candidateCount,
  closesAt,
  url,
}: {
  kind: PollKind;
  title: string;
  candidateCount: number;
  closesAt: number | null;
  url: string;
}) {
  const time = closesAt === null ? null : clockOf(closesAt);
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="type-caption text-muted-foreground">
        {copy.share.previewLabel}
      </figcaption>
      <div className="overflow-hidden rounded-card border border-border bg-card">
        <div className="flex aspect-[2/1] flex-col justify-between bg-muted px-5 py-4">
          <div className="flex items-center justify-between type-caption text-muted-foreground">
            <span>{copy.share.previewBrand}</span>
            <span>{copy.share.previewKind[kind]}</span>
          </div>
          <span className="type-heading break-keep">{title}</span>
          <div className="flex items-end gap-4">
            <span className="flex flex-col">
              <span className="type-caption text-muted-foreground">
                {copy.share.previewCandidates}
              </span>
              <span className="type-numeric-md tabular-nums">
                {candidateCount}
                <span className="ml-0.5 type-caption text-muted-foreground">
                  {copy.share.previewCandidatesUnit}
                </span>
              </span>
            </span>
            <span aria-hidden className="h-8 w-px bg-border" />
            <span className="flex flex-col">
              <span className="type-caption text-muted-foreground">
                {copy.share.previewDeadline}
              </span>
              <span className="type-numeric-md tabular-nums">
                {time
                  ? time.dayOffset > 0
                    ? `${copy.deadline.dayLabel(time.dayOffset)} ${time.hhmm}`
                    : time.hhmm
                  : ""}
              </span>
            </span>
          </div>
        </div>
        <p className="truncate border-t border-border px-5 py-2.5 type-caption text-muted-foreground">
          {url}
        </p>
      </div>
      <p className="type-caption break-keep text-muted-foreground">
        {copy.share.previewNote}
      </p>
    </figure>
  );
}

/** 성공 표시 (제목 앞 원 안 체크, slow 페이드) */
export function SuccessMark() {
  return (
    <span
      aria-hidden
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-success-surface text-success-foreground ease-enter motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:[animation-duration:var(--lm-duration-slow)]"
    >
      <Check className="size-4" strokeWidth={2} />
    </span>
  );
}

/**
 * 시트 안 안내 덩어리. 오류는 destructive 글자만(빨간 면 없음), 오프라인과 한도는 중립.
 * role=status라 나타날 때 읽힌다.
 */
export function SheetNotice({
  tone,
  title,
  body,
  action,
}: {
  tone: "danger" | "neutral" | "offline";
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  const Icon = tone === "offline" ? WifiOff : AlertCircle;
  return (
    <div
      role="status"
      className="flex gap-3 rounded-card border border-border bg-card px-4 py-3.5"
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-4 shrink-0",
          tone === "danger" ? "text-destructive" : "text-muted-foreground",
        )}
        strokeWidth={1.5}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p
          className={cn(
            "type-label break-keep",
            tone === "danger" ? "text-destructive" : "text-foreground",
          )}
        >
          {title}
        </p>
        {body ? (
          <p className="type-caption break-keep text-muted-foreground">
            {body}
          </p>
        ) : null}
        {action ? <div className="pt-1">{action}</div> : null}
      </div>
    </div>
  );
}

/** 마감 칸이 지금 몇 분 앞까지 고를 수 있는지(직접 입력 min) */
export function minCustom(now: number): number {
  return Math.ceil((now + DEADLINE_MIN_LEAD) / 5) * 5;
}
