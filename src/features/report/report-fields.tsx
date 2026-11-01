"use client";
// 질문 시트 안 입력 부품 (T6.15, T6.16, T6.19, T6.22, D-13 C). 시트 청크(report-sheet-drawer)만 쓴다.
// 할인 유형 칩, 내용 60자, 종료일 칩 + 날짜 고르기, 요일과 시간대 칩, 사유 라디오, 기타 글, 식당 정보 세부, 상태 줄.
import { Check, CircleAlert, WifiOff } from "lucide-react";
import { useId, type ReactNode } from "react";
import { LoadingRegion, SkeletonLine } from "@/components/states";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { focusRing } from "@/components/ui/interaction";
import { Skeleton } from "@/components/ui/skeleton";
import { moderationCopy } from "@/copy/moderation";
import { reportCopy, reportLabels } from "@/copy/report";
import { cn } from "@/lib/utils";
import {
  CLOSED_DETAILS,
  DEAL_CONTENT_MAX,
  DEAL_SLOTS,
  DEAL_TYPES,
  INFO_FIELDS,
  REPORT_NOTE_MAX,
  type ClosedDetail,
  type DealSlot,
  type DealType,
  type InfoField,
} from "./labels";

const copy = reportCopy;

export function FieldLabel({
  id,
  children,
  optional,
  className,
}: {
  id: string;
  children: ReactNode;
  optional?: boolean;
  className?: string;
}) {
  return (
    <p
      id={id}
      className={cn("flex items-baseline gap-2 type-label", className)}
    >
      {children}
      {optional ? (
        <span className="type-caption text-muted-foreground">
          {copy.sheet.optional}
        </span>
      ) : null}
    </p>
  );
}

/** 칸 아래 오류 한 줄 (role="alert") */
function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p
      id={id}
      role="alert"
      className="flex min-w-0 flex-1 items-start gap-1.5 type-caption break-keep text-destructive"
    >
      <CircleAlert
        aria-hidden
        className="mt-0.5 size-3.5 shrink-0"
        strokeWidth={1.75}
      />
      {children}
    </p>
  );
}

/* ---------- 할인 ---------- */

export function DealTypeChips({
  value,
  onChange,
  labelId,
}: {
  value: DealType | null;
  onChange: (t: DealType) => void;
  labelId: string;
}) {
  return (
    <ChipGroup
      aria-labelledby={labelId}
      value={value ? [value] : []}
      onValueChange={(v) => {
        const next = v[0] as DealType | undefined;
        // 같은 칩을 다시 눌러도 다음으로 간다(선택 해제 대신)
        onChange(next ?? value ?? "other");
      }}
    >
      {DEAL_TYPES.map((t) => (
        <Chip key={t} value={t}>
          {reportLabels.dealTypes[t]}
        </Chip>
      ))}
    </ChipGroup>
  );
}

/** 내용 60자. 글자 수와 금칙어 오류를 함께 읽힌다 */
export function DealTextField({
  type,
  value,
  onChange,
  banned,
  labelId,
  onEnter,
}: {
  type: DealType | null;
  value: string;
  onChange: (v: string) => void;
  banned: boolean;
  labelId: string;
  onEnter?: () => void;
}) {
  const countId = useId();
  const errId = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Input
        aria-labelledby={labelId}
        aria-describedby={cn(countId, banned && errId)}
        aria-invalid={banned || undefined}
        maxLength={DEAL_CONTENT_MAX}
        value={value}
        enterKeyHint="next"
        placeholder={copy.deal.placeholders[type ?? "lunch_special"]}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            onEnter?.();
          }
        }}
      />
      <div className="flex items-start gap-3">
        {banned ? (
          <FieldError id={errId}>{moderationCopy.banned}</FieldError>
        ) : (
          <span className="flex-1" />
        )}
        <p
          id={countId}
          className="shrink-0 type-caption text-muted-foreground tabular-nums"
        >
          <span aria-hidden>
            {copy.deal.textCount(value.length, DEAL_CONTENT_MAX)}
          </span>
          <span className="sr-only">
            {copy.deal.textCountSr(value.length, DEAL_CONTENT_MAX)}
          </span>
        </p>
      </div>
    </div>
  );
}

const PICK = "pick";

/** 종료일: 3일, 7일(기본), 2주, 30일 + 날짜 고르기 */
export function UntilField({
  chip,
  endsOn,
  range,
  picking,
  onChip,
  onPick,
  onDate,
}: {
  /** 빠른 칩 일수. 직접 고른 날이면 null */
  chip: number | null;
  endsOn: string;
  range: { min: string; max: string };
  picking: boolean;
  onChip: (days: number) => void;
  onPick: () => void;
  onDate: (key: string) => void;
}) {
  const labelId = useId();
  const dateId = useId();
  const hintId = useId();
  return (
    <div className="flex flex-col gap-2.5">
      <FieldLabel id={labelId}>{copy.deal.untilLabel}</FieldLabel>
      <ChipGroup
        aria-labelledby={labelId}
        value={[picking || chip === null ? PICK : String(chip)]}
        onValueChange={(v) => {
          const next = v[0] as string | undefined;
          if (!next) return;
          if (next === PICK) onPick();
          else onChip(Number(next));
        }}
      >
        {copy.deal.untilOptions.map((o) => (
          <Chip key={o.days} value={String(o.days)}>
            {o.label}
          </Chip>
        ))}
        <Chip value={PICK}>{copy.deal.untilPick}</Chip>
      </ChipGroup>
      {picking || chip === null ? (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={dateId}
            className="type-caption text-muted-foreground"
          >
            {copy.deal.untilPickLabel}
          </label>
          <Input
            id={dateId}
            type="date"
            min={range.min}
            max={range.max}
            value={endsOn}
            aria-describedby={hintId}
            onChange={(e) => onDate(e.target.value)}
            className="max-w-48 tabular-nums"
          />
        </div>
      ) : null}
      <p id={hintId} className="type-caption break-keep text-muted-foreground">
        {copy.deal.untilHint}
      </p>
    </div>
  );
}

/** 요일(칩 7개, 사이 4, 360에서는 두 줄)과 시간대(점심, 오후, 저녁). 모두 선택 */
export function WhenFields({
  dayIndexes,
  slots,
  onDays,
  onSlots,
}: {
  dayIndexes: readonly number[];
  slots: readonly DealSlot[];
  onDays: (v: number[]) => void;
  onSlots: (v: DealSlot[]) => void;
}) {
  const daysId = useId();
  const slotsId = useId();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <FieldLabel id={daysId} optional>
          {copy.deal.daysLabel}
        </FieldLabel>
        <ChipGroup
          multiple
          aria-labelledby={daysId}
          value={dayIndexes.map(String)}
          onValueChange={(v) =>
            onDays((v as string[]).map(Number).sort((a, b) => a - b))
          }
          className="gap-1"
        >
          {reportLabels.dealDays.map((d, i) => (
            <Chip key={d} value={String(i)} className="w-11 px-0">
              {d}
            </Chip>
          ))}
        </ChipGroup>
      </div>
      <div className="flex flex-col gap-2">
        <FieldLabel id={slotsId} optional>
          {copy.deal.slotsLabel}
        </FieldLabel>
        <ChipGroup
          multiple
          aria-labelledby={slotsId}
          value={[...slots]}
          onValueChange={(v) =>
            onSlots(DEAL_SLOTS.filter((s) => (v as string[]).includes(s)))
          }
        >
          {DEAL_SLOTS.map((s) => (
            <Chip key={s} value={s}>
              {reportLabels.dealSlots[s]}
              <span className="type-caption text-muted-foreground">
                {copy.deal.slotHints[s]}
              </span>
            </Chip>
          ))}
        </ChipGroup>
      </div>
    </div>
  );
}

/* ---------- 신고 사유 (MOD-01, DEAL-04) ---------- */

/** 세로 라디오 행(fieldset + legend). 행 전체가 터치 영역(48) */
export function RadioRows<K extends string>({
  name,
  legend,
  options,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  options: readonly { key: K; label: string; hint?: string }[];
  value: K | null;
  onChange: (k: K) => void;
}) {
  return (
    <fieldset className="flex flex-col">
      <legend className="sr-only">{legend}</legend>
      <div className="flex flex-col border-t border-border">
        {options.map((o) => (
          <label
            key={o.key}
            className="flex min-h-12 cursor-pointer items-center gap-3 border-b border-border py-2.5"
          >
            <input
              type="radio"
              name={name}
              value={o.key}
              checked={value === o.key}
              onChange={() => onChange(o.key)}
              className={cn(
                "size-5 shrink-0 appearance-none rounded-full border border-input bg-card transition-[border-width,border-color] duration-(--lm-duration-fast) ease-standard checked:border-[6px] checked:border-primary motion-reduce:transition-none",
                focusRing,
              )}
            />
            <span className="flex min-w-0 flex-col">
              <span className="type-body-sm">{o.label}</span>
              {o.hint ? (
                <span className="type-caption break-keep text-muted-foreground">
                  {o.hint}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** 기타 사유 자세히 (선택, 100자, 금칙어) */
export function EtcField({
  value,
  onChange,
  banned,
}: {
  value: string;
  onChange: (v: string) => void;
  banned: boolean;
}) {
  const id = useId();
  const errId = useId();
  const countId = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="type-caption text-muted-foreground">
        {copy.flag.etcLabel}
      </label>
      <Input
        id={id}
        aria-invalid={banned || undefined}
        aria-describedby={cn(countId, banned && errId)}
        maxLength={REPORT_NOTE_MAX}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="flex items-start gap-3">
        {banned ? (
          <FieldError id={errId}>{moderationCopy.banned}</FieldError>
        ) : (
          <span className="flex-1" />
        )}
        <p
          id={countId}
          className="shrink-0 type-caption text-muted-foreground tabular-nums"
        >
          <span aria-hidden>{`${value.length}/${REPORT_NOTE_MAX}`}</span>
          <span className="sr-only">
            {copy.flag.etcCountSr(value.length, REPORT_NOTE_MAX)}
          </span>
        </p>
      </div>
    </div>
  );
}

/* ---------- 식당 정보 제보 세부 (PLACE-05, 모두 선택, 자유 글 없음) ---------- */

export function ClosedChips({
  labelId,
  value,
  onChange,
}: {
  labelId: string;
  value: ClosedDetail | null;
  onChange: (v: ClosedDetail | null) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <ChipGroup
        aria-labelledby={labelId}
        value={value ? [value] : []}
        onValueChange={(v) =>
          onChange((v[0] as ClosedDetail | undefined) ?? null)
        }
      >
        {CLOSED_DETAILS.map((k) => (
          <Chip key={k} value={k}>
            {reportLabels.closedDetails[k]}
          </Chip>
        ))}
      </ChipGroup>
      <p className="type-caption break-keep text-muted-foreground">
        {copy.place.closedNote}
      </p>
    </div>
  );
}

export function InfoChips({
  labelId,
  value,
  onChange,
}: {
  labelId: string;
  value: readonly InfoField[];
  onChange: (v: InfoField[]) => void;
}) {
  return (
    <ChipGroup
      multiple
      aria-labelledby={labelId}
      value={[...value]}
      onValueChange={(v) =>
        onChange(INFO_FIELDS.filter((f) => (v as string[]).includes(f)))
      }
    >
      {INFO_FIELDS.map((k) => (
        <Chip key={k} value={k}>
          {reportLabels.infoFields[k]}
        </Chip>
      ))}
    </ChipGroup>
  );
}

export function PriceInput({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  invalid: boolean;
}) {
  const id = useId();
  const errId = useId();
  const noteId = useId();
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="flex items-baseline gap-2 type-caption text-muted-foreground"
      >
        {copy.place.priceLabel}
        <span>{copy.sheet.optional}</span>
      </label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          placeholder={copy.place.pricePlaceholder}
          value={value}
          aria-invalid={invalid || undefined}
          aria-describedby={cn(noteId, invalid && errId)}
          onChange={(e) =>
            onChange(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
          }
          className="max-w-40 tabular-nums"
        />
        <span className="type-body-sm text-muted-foreground">
          {copy.place.priceUnit}
        </span>
      </div>
      {invalid ? (
        <FieldError id={errId}>{copy.place.priceRange}</FieldError>
      ) : null}
      <p id={noteId} className="type-caption break-keep text-muted-foreground">
        {copy.place.priceNote}
      </p>
    </div>
  );
}

/* ---------- 상태 줄 ---------- */

/** 보내기 실패와 거절 이유. 버튼 위에 둔다 */
export function FormError({ title, body }: { title: string; body?: string }) {
  return (
    <div role="alert" className="flex items-start gap-2.5 text-destructive">
      <CircleAlert
        aria-hidden
        className="mt-0.5 size-4 shrink-0"
        strokeWidth={1.75}
      />
      <p className="type-body-sm break-keep">
        {title}
        {body ? (
          <span className="block type-caption text-muted-foreground">
            {body}
          </span>
        ) : null}
      </p>
    </div>
  );
}

export function OfflineLine() {
  return (
    <div
      role="status"
      className="flex items-start gap-3 border-y border-border py-3"
    >
      <WifiOff
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.5}
      />
      <p className="type-body-sm break-keep">
        {copy.sheet.offlineTitle}
        <span className="block type-caption text-muted-foreground">
          {copy.sheet.offlineBody}
        </span>
      </p>
    </div>
  );
}

/** 하루 한도 (MOD-05, DEAL-04). 질문 대신 보인다 */
export function LimitBlock({ title, body }: { title: string; body: string }) {
  return (
    <section role="alert" className="flex flex-col gap-2">
      <h3 className="type-label break-keep">{title}</h3>
      <p className="type-body-sm break-keep text-muted-foreground">{body}</p>
    </section>
  );
}

/** 완료 표시(체크 원 base + 제목 + 설명) */
export function DoneMark({ title, body }: { title: string; body: string }) {
  return (
    <div role="status" className="flex items-start gap-3">
      <span
        aria-hidden
        className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-primary text-primary motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-75 motion-safe:[animation-duration:var(--lm-duration-base)] motion-safe:[animation-timing-function:var(--lm-ease-enter)]"
      >
        <Check className="size-4" strokeWidth={1.75} />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="type-label break-keep">{title}</h3>
        <p className="type-caption break-keep text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

/** 입력 자리 스켈레톤 (한도와 중복 확인을 불러오는 동안) */
export function FormSkeleton() {
  return (
    <LoadingRegion label={copy.sheet.loading} className="flex flex-col gap-4">
      <SkeletonLine type="heading" className="w-44" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-10 w-20 rounded-chip" />
        <Skeleton className="h-10 w-16 rounded-chip" />
        <Skeleton className="h-10 w-24 rounded-chip" />
        <Skeleton className="h-10 w-20 rounded-chip" />
      </div>
    </LoadingRegion>
  );
}
