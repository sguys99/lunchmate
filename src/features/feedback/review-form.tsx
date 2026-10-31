"use client";
// 후기 시트 입력 부품 (T6.9, T6.10, FB-02, FB-03, FB-06, FB-07, D-11 B 한 장 시트, DESIGN.md 5장 "식후 피드백").
// review-sheet-drawer.tsx가 쓴다(같은 지연 로딩 청크). 시안 `/design-lab/feedback/b`의 부품을 실제 문구와 값으로 옮긴 것.
// 순서: (상세 쓰기, 접힌 줄, 수정) 한 탭 답 → 1인 가격(스테퍼 + 칩 3) → 태그 8종 2열 → 한 줄 후기(늘 보임)
//   → 공개 범위와 집계 포함 고지 한 줄 → (수정) 내 후기 삭제.
// 접근성: 칩 묶음은 role="group" + 제목 id, 가격 숫자 aria-live, 글자 수는 aria-describedby, 금칙어 오류는 role="alert".
import {
  AlertCircle,
  Minus,
  Plus,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { focusRing, hitArea44, pressMotion } from "@/components/ui/interaction";
import { feedbackCopy, reviewTagLabels } from "@/copy/feedback";
import { cn } from "@/lib/utils";
import {
  REVIEW_BODY_MAX,
  REVIEW_PRICE_MAX,
  REVIEW_PRICE_MIN,
  REVIEW_TAGS,
  isReviewTag,
} from "./labels";
import {
  bodyLength,
  clampPrice,
  limitBody,
  pricePresets,
  shortWon,
  stepPrice,
  type ReviewDraft,
} from "./review-draft";

const copy = feedbackCopy.sheet;

export type FieldKey = "rating" | "price" | "tags" | "body";

type Patch = (next: Partial<ReviewDraft>) => void;

/** 밑줄 글자 버튼 (caption, 터치 44) */
export const textButton = cn(
  "inline-flex h-7 w-fit shrink-0 items-center gap-1 rounded-sm px-0.5 type-caption text-muted-foreground underline decoration-border underline-offset-3 hover:text-foreground aria-disabled:pointer-events-none aria-disabled:opacity-60",
  hitArea44,
  focusRing,
);

/** 입력 묶음 제목 (label 15) + 보조 한 줄. 시트 안은 h3 */
function FieldHead({
  id,
  title,
  hint,
}: {
  id: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h3 id={id} className="type-label text-foreground">
        {title}
      </h3>
      {hint ? (
        <p className="type-caption break-keep text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** 항목 칸: 항목 줄에서 열 때 이 칸으로 스크롤하고 첫 입력에 초점을 둔다 */
function Field({
  name,
  focus,
  className,
  children,
}: {
  name: FieldKey;
  focus: FieldKey | null;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focus !== name) return;
    const el = ref.current;
    if (!el) return;
    // 그 항목 위치로(D-11 안건 6). 초점은 Popup initialFocus가 [data-first]로 옮긴다
    el.scrollIntoView({ block: "start" });
  }, [focus, name]);
  return (
    <div
      ref={ref}
      data-field={name}
      className={cn("flex scroll-mt-2 flex-col", className)}
    >
      {children}
    </div>
  );
}

/* ---------- 한 탭 답 ---------- */

export function RatingField({
  draft,
  patch,
  focus,
  hint,
}: {
  draft: ReviewDraft;
  patch: Patch;
  focus: FieldKey | null;
  hint: boolean;
}) {
  const id = useId();
  return (
    <Field name="rating" focus={focus} className="gap-3">
      <FieldHead
        id={id}
        title={copy.rating}
        hint={hint ? copy.ratingHint : undefined}
      />
      <ChipGroup
        aria-labelledby={id}
        value={draft.rating ? [draft.rating] : []}
        onValueChange={(v: unknown[]) => {
          const next = v[0];
          // 한 탭 답은 지울 수 없다(다시 눌러도 그대로)
          if (next === "up" || next === "down") patch({ rating: next });
        }}
      >
        <Chip value="up" data-first="" className="px-5">
          <ThumbsUp aria-hidden strokeWidth={1.5} />
          {feedbackCopy.ratings.up}
        </Chip>
        <Chip value="down" className="px-5">
          <ThumbsDown aria-hidden strokeWidth={1.5} />
          {feedbackCopy.ratings.down}
        </Chip>
      </ChipGroup>
    </Field>
  );
}

/* ---------- 1인 가격 ---------- */

export function PriceField({
  draft,
  patch,
  focus,
  estimate,
  estimateKind,
}: {
  draft: ReviewDraft;
  patch: Patch;
  focus: FieldKey | null;
  /** 추정가 또는 제보 중앙값(원) */
  estimate: number;
  estimateKind: "estimate" | "report";
}) {
  const id = useId();
  const value = draft.priceKrw;
  const shown = value ?? clampPrice(estimate);
  const presets = pricePresets(estimate);
  const atMin = value !== null && value <= REVIEW_PRICE_MIN;
  const atMax = value !== null && value >= REVIEW_PRICE_MAX;
  const round = cn(
    "inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-border text-foreground hover:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-40",
    pressMotion,
    focusRing,
  );
  const hint =
    estimateKind === "report"
      ? copy.priceReportHint(shortWon(Math.round(estimate / 100) * 100))
      : copy.priceEstimateHint(shortWon(estimate));
  return (
    <Field name="price" focus={focus} className="gap-3">
      <div className="flex items-start justify-between gap-3">
        <FieldHead id={id} title={copy.price} hint={hint} />
        {value !== null ? (
          <button
            type="button"
            onClick={() => patch({ priceKrw: null })}
            className={textButton}
          >
            {copy.priceClear}
          </button>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          data-first=""
          aria-label={copy.priceDecrease}
          aria-disabled={atMin || undefined}
          onClick={() => patch({ priceKrw: stepPrice(value, estimate, -1) })}
          className={round}
        >
          <Minus aria-hidden className="size-5" strokeWidth={1.5} />
        </button>
        <p
          aria-live="polite"
          className={cn(
            "flex items-baseline gap-1 tabular-nums transition-colors duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
            value === null ? "text-muted-foreground" : "text-foreground",
          )}
        >
          <span className="type-numeric-lg">
            {shown.toLocaleString("ko-KR")}
          </span>
          <span className="type-body-sm">{copy.priceUnit}</span>
          {value === null ? (
            <span className="sr-only">{copy.priceUnset}</span>
          ) : null}
        </p>
        <button
          type="button"
          aria-label={copy.priceIncrease}
          aria-disabled={atMax || undefined}
          onClick={() => patch({ priceKrw: stepPrice(value, estimate, 1) })}
          className={round}
        >
          <Plus aria-hidden className="size-5" strokeWidth={1.5} />
        </button>
      </div>
      <ChipGroup
        aria-labelledby={id}
        value={value !== null && presets.includes(value) ? [String(value)] : []}
        onValueChange={(v: unknown[]) => {
          const next = v[0];
          patch({ priceKrw: next === undefined ? null : Number(next) });
        }}
        className="justify-center"
      >
        {presets.map((v) => (
          <Chip key={v} value={String(v)} className="tabular-nums">
            {shortWon(v)}
          </Chip>
        ))}
      </ChipGroup>
    </Field>
  );
}

/* ---------- 태그 ---------- */

export function TagsField({
  draft,
  patch,
  focus,
}: {
  draft: ReviewDraft;
  patch: Patch;
  focus: FieldKey | null;
}) {
  const id = useId();
  return (
    <Field name="tags" focus={focus} className="gap-3">
      <FieldHead id={id} title={copy.tags} hint={copy.tagsHint} />
      <ChipGroup
        multiple
        aria-labelledby={id}
        value={[...draft.tags]}
        onValueChange={(v: unknown[]) =>
          patch({
            tags: REVIEW_TAGS.filter((t) =>
              v.some((x) => typeof x === "string" && isReviewTag(x) && x === t),
            ),
          })
        }
        className="grid grid-cols-2"
      >
        {REVIEW_TAGS.map((tag, i) => (
          <Chip
            key={tag}
            value={tag}
            data-first={i === 0 ? "" : undefined}
            className="w-full"
          >
            {reviewTagLabels[tag]}
          </Chip>
        ))}
      </ChipGroup>
    </Field>
  );
}

/* ---------- 한 줄 후기 ---------- */

export function BodyField({
  draft,
  patch,
  focus,
  error,
}: {
  draft: ReviewDraft;
  patch: Patch;
  focus: FieldKey | null;
  /** 금칙어 오류 문장(MOD-04). 있으면 칸 아래 role="alert" */
  error: string | null;
}) {
  const id = useId();
  const countId = `${id}-count`;
  const errorId = `${id}-error`;
  const n = bodyLength(draft.body);
  return (
    <Field name="body" focus={focus} className="gap-2">
      <label htmlFor={id} className="type-label">
        {copy.review}
      </label>
      <div className="relative">
        <textarea
          id={id}
          data-first=""
          rows={2}
          enterKeyHint="done"
          aria-describedby={error ? `${countId} ${errorId}` : countId}
          aria-invalid={error ? true : undefined}
          placeholder={copy.reviewPlaceholder}
          value={draft.body}
          onChange={(e) => patch({ body: limitBody(e.target.value) })}
          className={cn(
            "block w-full resize-none rounded-input border bg-card px-4 pt-3 pb-7 type-body text-foreground outline-none placeholder:text-muted-foreground",
            "transition-[border-color] duration-(--lm-duration-fast) ease-standard focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid motion-reduce:transition-none",
            error ? "border-destructive" : "border-input",
          )}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute right-4 bottom-2 type-caption text-muted-foreground tabular-nums"
        >
          {copy.reviewCount(n, REVIEW_BODY_MAX)}
        </span>
        <span id={countId} className="sr-only">
          {copy.reviewCountLabel(n, REVIEW_BODY_MAX)}
        </span>
      </div>
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1.5 type-caption break-keep text-destructive"
        >
          <AlertCircle
            aria-hidden
            className="mt-px size-3.5 shrink-0"
            strokeWidth={1.75}
          />
          {error}
        </p>
      ) : null}
    </Field>
  );
}

/* ---------- 공개 범위 ---------- */

export function VisibilityField({
  draft,
  patch,
}: {
  draft: ReviewDraft;
  patch: Patch;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <span id={id} className="type-label">
          {copy.visibility}
        </span>
        <ChipGroup
          aria-labelledby={id}
          value={[draft.isPublic ? "public" : "private"]}
          onValueChange={(v: unknown[]) => {
            // 둘 중 하나는 늘 골라져 있다(다시 눌러 지우지 않는다)
            if (v[0] === "public") patch({ isPublic: true });
            if (v[0] === "private") patch({ isPublic: false });
          }}
          className="flex-nowrap"
        >
          <Chip value="public">{feedbackCopy.visibility.public}</Chip>
          <Chip value="private">{feedbackCopy.visibility.private}</Chip>
        </ChipGroup>
      </div>
      <p className="type-caption break-keep text-muted-foreground">
        {draft.isPublic ? <>{copy.publicNote} </> : null}
        {feedbackCopy.aggregateNote}
      </p>
    </div>
  );
}

/* ---------- 삭제 확인 ---------- */

export function DeleteConfirm({
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  busy: boolean;
  error: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const id = useId();
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  return (
    <div
      role="group"
      aria-labelledby={id}
      className="flex flex-col gap-3 rounded-card border border-border bg-card p-5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)]"
    >
      <h3 id={id} ref={ref} tabIndex={-1} className="type-label outline-none">
        {copy.confirm.title}
      </h3>
      <p className="type-caption break-keep text-muted-foreground">
        {copy.confirm.body}
      </p>
      {error}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          aria-disabled={busy || undefined}
          aria-busy={busy || undefined}
          onClick={busy ? undefined : onConfirm}
          className={buttonClass("destructive", "sm")}
        >
          {copy.confirm.confirm}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={buttonClass("secondary", "sm")}
        >
          {copy.confirm.cancel}
        </button>
      </div>
    </div>
  );
}

/** 시트 바닥과 삭제 확인의 오류 한 줄 */
export function FormError({
  title,
  body,
}: {
  title: string;
  body?: string;
}) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 type-body-sm break-keep text-destructive"
    >
      <AlertCircle
        aria-hidden
        className="mt-[0.2rem] size-4 shrink-0"
        strokeWidth={1.75}
      />
      <span>
        {title}
        {body ? (
          <span className="block type-caption text-muted-foreground">
            {body}
          </span>
        ) : null}
      </span>
    </p>
  );
}
