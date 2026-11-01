"use client";
// 식후 피드백 시안 공용 조각 (T6.1). 세 안이 같은 입력 부품을 다른 그릇과 흐름에 담는다.
//
// - FeedbackHome: 홈 D1 화면(머리, 큰 카드, 대안 두 장, 하단 행동 줄)에 띠 자리 하나를 뚫은 틀. 띠는 안마다 다르다.
// - BandAsk: D1 묻는 띠(그림 36 + 질문 + 안 갔어요 / 👍 👎). 이름을 못 찾으면 그림 대신 빈 원, 질문을 바꾸고 카카오맵 링크.
// - BandThanks, BandSaved, BandError, BandSkeleton: 띠의 나머지 상태.
// - 입력 부품: PriceChips(추정가 둘레 칩 + 직접), PriceStepper(큰 숫자 + 500원 단계), TagChips(8종), ReviewField(100자),
//   VisibilityField(공개 / 나만 보기 + 집계 포함 고지 한 줄, PRD 11.2, T6.28), RatingField(상세에서 쓸 때만).
// - DetailFrame: 식당 상세(D-10) 바깥 틀. 머리(카테고리, 이름), 하단 길찾기는 상세와 같고 본문은 후기 자리만 그린다.
// 저장은 목업이라 화면 상태만 바꾼다. 비공개 후기 텍스트는 목업에도 다른 사람 목록에 없다(AC-FB-2).
import {
  AlertCircle,
  Check,
  ExternalLink,
  Minus,
  Plus,
  ThumbsDown,
  ThumbsUp,
  Utensils,
} from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { buttonClass as rawButtonClass } from "@/components/ui/button-classes";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { focusRing, hitArea44, pressMotion } from "@/components/ui/interaction";
import { Skeleton } from "@/components/ui/skeleton";
import { feedbackLabCopy as copy } from "@/copy/design-lab-feedback";
import { CategoryCaption } from "@/features/design-lab/home/shared/card-bits";
import {
  HomeColumn,
  HomeFrame,
  HomeMap,
  HomeStateMessage,
} from "@/features/design-lab/home/shared/frame";
import {
  ActionBarSkeleton,
  TodayActionBar,
  TodayJustPickLayer,
  TodayPicks,
  TodayPicksSkeleton,
  useTodayPick,
} from "@/features/design-lab/home/shared/today-pick";
import {
  ThumbButton,
  SkippedButton,
  feedbackCopy as bandCopy,
} from "@/features/design-lab/home/shared/yesterday";
import type { MockPlace } from "@/features/design-lab/mock";
import {
  DetailScreen,
  NameUnresolved,
  PrimaryAction,
} from "@/features/design-lab/place/shared";
import {
  MOCK_PLACE_URL,
  type PlaceDetail,
} from "@/features/design-lab/place/detail-mock";
import { getHomeContent } from "@/features/design-lab/system/states";
import { CategoryIllustration } from "@/features/place/illustrations";
import { formatWon } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  MY_REVIEW,
  PRICE_STEP,
  REVIEW_MAX,
  YESTERDAY,
  type MyReview,
} from "./mock";
import { isNameFail, type FeedbackAnswer, type FeedbackParams } from "./params";

/** 기본 border-transparent와 variant 테두리색이 겹쳐 cn으로 정리한다(테두리 버튼이 투명해지는 것 방지) */
const buttonClass = (...args: Parameters<typeof rawButtonClass>) =>
  cn(rawButtonClass(...args));

export { bandCopy };

/* ---------- 입력 상태 ---------- */

export type Draft = {
  thumb: "up" | "down" | null;
  priceKRW: number | null;
  /** 칩 대신 직접 입력 중 */
  customPrice: boolean;
  tags: string[];
  text: string;
  isPublic: boolean;
};

export const EMPTY_DRAFT: Draft = {
  thumb: null,
  priceKRW: null,
  customPrice: false,
  tags: [],
  text: "",
  isPublic: true,
};

export function draftFromReview(r: MyReview): Draft {
  return {
    thumb: r.thumb,
    priceKRW: r.priceKRW,
    customPrice: false,
    tags: [...r.tags],
    text: r.text,
    isPublic: r.isPublic,
  };
}

export function useDraft(initial: Draft) {
  const [draft, setDraft] = useState<Draft>(initial);
  const patch = (next: Partial<Draft>) => setDraft((d) => ({ ...d, ...next }));
  return { draft, patch, reset: (d: Draft) => setDraft(d) };
}

export type DraftApi = ReturnType<typeof useDraft>;

/** 무언가 하나라도 골랐나 (가격, 태그, 글) */
export function hasDetails(d: Draft): boolean {
  return d.priceKRW !== null || d.tags.length > 0 || d.text.trim() !== "";
}

/* ---------- 띠의 데이터 ---------- */

/** 띠를 어떻게 그릴지: 로딩이면 뼈대, 물을 곳 없음(empty)과 오프라인은 없음(D1), 나머지는 살아 있는 띠 */
export function bandMode(p: FeedbackParams): "skeleton" | "none" | "live" {
  if (p.state === "loading") return "skeleton";
  if (p.state === "empty" || p.state === "offline") return "none";
  return "live";
}

/** 띠가 묻는 곳. 이름을 못 찾았으면 null 이름 */
export function bandPlace(p: FeedbackParams): {
  place: MockPlace;
  name: string | null;
} {
  return { place: YESTERDAY, name: isNameFail(p) ? null : YESTERDAY.name };
}

/** 시작 단계를 띠 답으로 */
export function initialAnswer(p: FeedbackParams): FeedbackAnswer | null {
  if (p.flow === "ask" || p.flow === "later") return null;
  return p.answer;
}

/* ---------- 홈 틀 ---------- */

/**
 * 홈 D1 화면 + 띠 자리. 로딩과 오프라인은 홈 상태 그대로(D1), empty와 error는 추천 카드는 정상이고 띠만 달라진다.
 * inert면 시트가 떠 있는 동안 뒤 화면을 막는다(B).
 */
export function FeedbackHome({
  p,
  band,
  inert = false,
}: {
  p: FeedbackParams;
  band: ReactNode;
  inert?: boolean;
}) {
  const homeState =
    p.state === "loading" || p.state === "offline" ? p.state : "ready";
  const content = getHomeContent(homeState);
  const t = useTodayPick();
  const strip = band ? <div className="mt-5 desktop:mt-4">{band}</div> : null;

  if (content.kind !== "ready") {
    const loading = content.kind === "loading";
    return (
      <div inert={inert} className="flex min-h-dvh flex-1 flex-col">
        <HomeFrame>
          <HomeColumn
            className={cn("desktop:pt-8", loading && "pb-0 desktop:pb-0")}
          >
            {t.header}
            {strip}
            {loading ? (
              <>
                <TodayPicksSkeleton label={content.label} className="mt-5" />
                <ActionBarSkeleton />
              </>
            ) : (
              <HomeStateMessage
                content={content}
                className="mt-auto pt-6 desktop:mt-12"
              />
            )}
          </HomeColumn>
        </HomeFrame>
      </div>
    );
  }

  return (
    <div inert={inert} className="flex min-h-dvh flex-1 flex-col">
      <HomeFrame map={<HomeMap picks={t.lab.picks} active={t.heroIndex} />}>
        <HomeColumn className="pb-0 desktop:pt-8 desktop:pb-0">
          {t.header}
          <p aria-live="polite" className="sr-only">
            {t.lab.announcement}
          </p>
          {strip}
          <TodayPicks t={t} className="mt-5 pb-6 desktop:mt-4" />
          <TodayActionBar t={t} />
          <TodayJustPickLayer t={t} />
        </HomeColumn>
      </HomeFrame>
    </div>
  );
}

/* ---------- 띠 ---------- */

/** 띠 바깥 선(위아래 헤어라인, 면 없음). D1 그대로 */
export function BandRule({
  children,
  label,
  className,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <section
      aria-label={label ?? bandCopy.label}
      className={cn("border-y border-border", className)}
    >
      {children}
    </section>
  );
}

/** 이름 없는 날의 그림 자리: 카테고리도 모르니 빈 원과 수저 */
function UnknownArt() {
  return (
    <span
      aria-hidden
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
    >
      <Utensils className="size-4" strokeWidth={1.5} />
    </span>
  );
}

/** 카카오맵 글자 링크 (이름 못 찾은 날, place_url만 저장해 둔 값) */
function KakaoMapLink({ className }: { className?: string }) {
  return (
    <a
      href={MOCK_PLACE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={copy.unnamed.kakaoMapLabel}
      className={cn(
        "inline-flex h-7 w-fit items-center gap-1 rounded-sm px-0.5 type-caption text-muted-foreground underline decoration-border underline-offset-3 hover:text-foreground",
        hitArea44,
        focusRing,
        className,
      )}
    >
      {copy.unnamed.kakaoMap}
      <ExternalLink aria-hidden className="size-3" strokeWidth={1.75} />
    </a>
  );
}

/** 묻는 띠 (D1). extra는 안 갔어요 옆 글자 버튼 자리(C의 "나중에") */
export function BandAsk({
  place,
  name,
  onAnswer,
  extra,
}: {
  place: MockPlace;
  name: string | null;
  onAnswer: (a: FeedbackAnswer) => void;
  extra?: ReactNode;
}) {
  // 글자 버튼이 둘 이상이면(이름 없는 날의 카카오맵, C의 나중에) 질문 아래 좁은 칸에서 세 줄로 쌓이지 않게
  // 띠 폭 전체를 쓰는 둘째 줄로 내린다(360px 확인)
  const wide = name === null || extra !== undefined;
  const links = (
    <div className="-ml-0.5 flex flex-wrap items-center gap-x-4">
      <SkippedButton onAnswer={onAnswer} />
      {name ? null : <KakaoMapLink />}
      {extra}
    </div>
  );
  return (
    <div className={cn("flex flex-col py-2.5", wide && "pb-1.5")}>
      <div className="flex min-h-11 items-center gap-3">
        {name ? (
          <CategoryIllustration slug={place.category} size={36} />
        ) : (
          <UnknownArt />
        )}
        <div className="flex min-w-0 flex-1 flex-col items-start">
          <p className="type-body-sm break-keep">
            {name ? bandCopy.question(name) : copy.unnamed.question}
          </p>
          {wide ? null : links}
        </div>
        <div className="flex items-center gap-2">
          <ThumbButton kind="up" onAnswer={onAnswer} />
          <ThumbButton kind="down" onAnswer={onAnswer} />
        </div>
      </div>
      {wide ? <div className="pl-12">{links}</div> : null}
    </div>
  );
}

/** 한 줄 상태(체크 + 문장). action은 오른쪽 글자 버튼 자리 */
export function BandLine({
  children,
  srBody,
  action,
  focusOnMount = false,
  tone = "done",
  className,
}: {
  children: ReactNode;
  srBody?: string;
  action?: ReactNode;
  focusOnMount?: boolean;
  tone?: "done" | "error" | "quiet";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusOnMount) ref.current?.focus({ preventScroll: true });
  }, [focusOnMount]);
  const Icon = tone === "error" ? AlertCircle : Check;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      className={cn(
        "flex min-h-11 items-center gap-3 py-1 outline-none motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)]",
        className,
      )}
    >
      <p
        role="status"
        className="flex min-w-0 flex-1 items-center gap-2 type-body-sm text-muted-foreground"
      >
        {tone === "quiet" ? null : (
          <Icon
            aria-hidden
            className={cn(
              "size-4 shrink-0",
              tone === "error" ? "text-destructive" : "text-success",
            )}
            strokeWidth={1.75}
          />
        )}
        <span
          className={cn(
            "min-w-0 break-keep",
            tone === "error" ? "text-destructive" : "text-foreground",
            tone === "quiet" && "text-muted-foreground",
          )}
        >
          {children}
          {srBody ? <span className="sr-only"> {srBody}</span> : null}
        </span>
      </p>
      {action}
    </div>
  );
}

/** 밑줄 글자 버튼 (caption, 터치 44) */
export function TextButton({
  children,
  onClick,
  className,
  ...rest
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  "aria-label"?: string;
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
  "aria-disabled"?: boolean;
  "aria-haspopup"?: "dialog" | "menu";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 w-fit shrink-0 items-center gap-1 rounded-sm px-0.5 type-caption text-muted-foreground underline decoration-border underline-offset-3 hover:text-foreground aria-disabled:pointer-events-none aria-disabled:opacity-60",
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

/** 답한 뒤 고마움 줄 (D1). 안 갔어요면 선택 입력을 권하지 않는다(FB-05) */
export function BandThanks({
  answer,
  action,
  focusOnMount,
}: {
  answer: FeedbackAnswer;
  action?: ReactNode;
  focusOnMount?: boolean;
}) {
  return (
    <BandLine
      srBody={answer === "skipped" ? bandCopy.skippedBody : bandCopy.thanksBody}
      action={answer === "skipped" ? undefined : action}
      focusOnMount={focusOnMount}
    >
      {bandCopy.thanks}
    </BandLine>
  );
}

/** 보내지 못함 (state=error). 고른 답은 남아 있고 다시 보내기 하나 */
export function BandError({ onRetry }: { onRetry: () => void }) {
  return (
    <BandLine
      tone="error"
      srBody={copy.states.saveError.body}
      action={
        <TextButton onClick={onRetry}>{copy.states.saveError.retry}</TextButton>
      }
    >
      {copy.states.saveError.title}
    </BandLine>
  );
}

/** 띠 로딩: 같은 높이(64)의 그림 원, 글자 막대, 원형 버튼 두 개 */
export function BandSkeleton() {
  return (
    <BandRule label={copy.states.loadingLabel}>
      <div aria-hidden className="flex min-h-16 items-center gap-3 py-2.5">
        <Skeleton className="size-9 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-44 max-w-full" />
          <Skeleton className="h-3 w-14" />
        </div>
        <Skeleton className="size-11 rounded-full" />
        <Skeleton className="size-11 rounded-full" />
      </div>
    </BandRule>
  );
}

/* ---------- 입력 부품 ---------- */

/** 입력 묶음 제목 (label 15) + 보조 한 줄 */
export function FieldHead({
  id,
  title,
  hint,
  className,
  serif = false,
  as: Heading = "h3",
}: {
  id: string;
  title: string;
  hint?: string;
  className?: string;
  /** 제목 단계. 홈 띠 안은 h2(오늘의 추천 h1 바로 아래), 상세와 시트는 h3 */
  as?: "h2" | "h3";
  /** C: 한 번에 하나 묻는 질문은 세리프 heading */
  serif?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Heading
        id={id}
        className={cn(
          serif ? "type-heading break-keep" : "type-label text-foreground",
        )}
      >
        {title}
      </Heading>
      {hint ? (
        <p className="type-caption break-keep text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** 한 탭 답 (상세에서 쓸 때만. 홈은 띠에서 이미 답했다) */
export function RatingField({
  value,
  onChange,
  labelledBy,
  size = "md",
}: {
  value: "up" | "down" | null;
  onChange: (v: "up" | "down") => void;
  labelledBy: string;
  size?: "md" | "lg";
}) {
  return (
    <ChipGroup
      aria-labelledby={labelledBy}
      value={value ? [value] : []}
      onValueChange={(v: unknown[]) => {
        const next = v[0];
        if (next === "up" || next === "down") onChange(next);
      }}
      className={cn(size === "lg" && "gap-3")}
    >
      <Chip value="up" className={cn(size === "lg" && "h-12 px-6")}>
        <ThumbsUp aria-hidden strokeWidth={1.5} />
        {bandCopy.up}
      </Chip>
      <Chip value="down" className={cn(size === "lg" && "h-12 px-6")}>
        <ThumbsDown aria-hidden strokeWidth={1.5} />
        {bandCopy.down}
      </Chip>
    </ChipGroup>
  );
}

/** 짧은 가격 이름: 9000 → "9천 원", 10000 → "1만 원", 11000 → "1만 1천 원" */
export function shortWon(priceKRW: number): string {
  const man = Math.floor(priceKRW / 10000);
  const cheon = Math.floor((priceKRW % 10000) / 1000);
  const rest = priceKRW % 1000;
  if (rest !== 0) return formatWon(priceKRW);
  if (man === 0) return `${cheon}천 원`;
  return cheon === 0 ? `${man}만 원` : `${man}만 ${cheon}천 원`;
}

/**
 * 가격 스테퍼 (B): 큰 숫자 + 500원 내리기/올리기 + 추정가 둘레 칩 3개.
 * 처음에는 값이 없고 추정가를 옅게 보여 준다. 칩이나 +/-를 누르면 그 값에서 시작한다.
 */
export function PriceStepper({
  draft,
  estimateKRW,
  presets,
  labelledBy,
}: {
  draft: DraftApi;
  estimateKRW: number;
  presets: readonly number[];
  labelledBy: string;
}) {
  const value = draft.draft.priceKRW;
  const shown = value ?? estimateKRW;
  const step = (dir: 1 | -1) =>
    draft.patch({
      priceKRW: Math.max(PRICE_STEP, shown + dir * PRICE_STEP),
      customPrice: false,
    });
  const round = cn(
    "inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-border text-foreground hover:bg-muted",
    pressMotion,
    focusRing,
  );
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label={copy.composer.priceDecrease}
          onClick={() => step(-1)}
          className={round}
        >
          <Minus aria-hidden className="size-5" strokeWidth={1.5} />
        </button>
        <p
          aria-live="polite"
          className={cn(
            "flex items-baseline gap-1 tabular-nums transition-colors duration-(--lm-duration-fast) motion-reduce:transition-none",
            value === null ? "text-muted-foreground" : "text-foreground",
          )}
        >
          <span className="type-numeric-lg">
            {shown.toLocaleString("ko-KR")}
          </span>
          <span className="type-body-sm">{copy.composer.priceUnit}</span>
          {value === null ? (
            <span className="sr-only">{copy.composer.priceUnset}</span>
          ) : null}
        </p>
        <button
          type="button"
          aria-label={copy.composer.priceIncrease}
          onClick={() => step(1)}
          className={round}
        >
          <Plus aria-hidden className="size-5" strokeWidth={1.5} />
        </button>
      </div>
      <ChipGroup
        aria-labelledby={labelledBy}
        value={value !== null && presets.includes(value) ? [String(value)] : []}
        onValueChange={(v: unknown[]) => {
          const next = v[0];
          draft.patch({
            priceKRW: next === undefined ? null : Number(next),
            customPrice: false,
          });
        }}
        className="justify-center"
      >
        {presets.map((v) => (
          <Chip key={v} value={String(v)} className="tabular-nums">
            {shortWon(v)}
          </Chip>
        ))}
      </ChipGroup>
    </div>
  );
}

/** 태그 8종, 여러 개 */
export function TagChips({
  draft,
  labelledBy,
  className,
  chipClassName,
}: {
  draft: DraftApi;
  labelledBy: string;
  className?: string;
  chipClassName?: string;
}) {
  return (
    <ChipGroup
      multiple
      aria-labelledby={labelledBy}
      value={draft.draft.tags}
      onValueChange={(v: unknown[]) =>
        draft.patch({ tags: v.filter((x): x is string => typeof x === "string") })
      }
      className={className}
    >
      {copy.composer.tagList.map((tag) => (
        <Chip key={tag} value={tag} className={chipClassName}>
          {tag}
        </Chip>
      ))}
    </ChipGroup>
  );
}

/** 한 줄 후기 100자. 글자 수는 오른쪽 아래, 다 차면 더 받지 않는다 */
export function ReviewField({
  draft,
  label,
  autoFocus,
  rows = 2,
  labelHidden = false,
}: {
  draft: DraftApi;
  label: string;
  autoFocus?: boolean;
  rows?: number;
  /** C: 위 질문이 같은 말이라 글자 이름은 스크린 리더에만 */
  labelHidden?: boolean;
}) {
  const id = useId();
  const countId = `${id}-count`;
  const n = [...draft.draft.text].length;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={labelHidden ? "sr-only" : "type-label"}>
        {label}
      </label>
      <div className="relative">
        <textarea
          id={id}
          rows={rows}
          maxLength={REVIEW_MAX}
          autoFocus={autoFocus}
          aria-describedby={countId}
          placeholder={copy.composer.reviewPlaceholder}
          value={draft.draft.text}
          onChange={(e) => draft.patch({ text: e.target.value })}
          className={cn(
            "block w-full resize-none rounded-input border border-input bg-card px-4 pt-3 pb-7 type-body text-foreground outline-none placeholder:text-muted-foreground",
            "transition-[border-color] duration-(--lm-duration-fast) ease-standard focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid motion-reduce:transition-none",
          )}
        />
        <span
          id={countId}
          className="pointer-events-none absolute right-4 bottom-2 type-caption text-muted-foreground tabular-nums"
        >
          {copy.composer.reviewCount(n, REVIEW_MAX)}
        </span>
      </div>
    </div>
  );
}

/** 공개 범위 (FB-03 기본 공개) + 집계 포함 고지 한 줄 (PRD 11.2, T6.28) */
export function VisibilityField({
  draft,
  layout = "row",
}: {
  draft: DraftApi;
  layout?: "row" | "stack";
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2.5">
      <div
        className={cn(
          "flex gap-3",
          layout === "row"
            ? "items-center justify-between"
            : "flex-col items-start",
        )}
      >
        <span id={id} className="type-label">
          {copy.composer.visibility}
        </span>
        <ChipGroup
          aria-labelledby={id}
          value={[draft.draft.isPublic ? "public" : "private"]}
          onValueChange={(v: unknown[]) => {
            // 둘 중 하나는 늘 골라져 있다(다시 눌러 지우지 않는다)
            if (v[0] === "public") draft.patch({ isPublic: true });
            if (v[0] === "private") draft.patch({ isPublic: false });
          }}
        >
          <Chip value="public">{copy.composer.public}</Chip>
          <Chip value="private">{copy.composer.private}</Chip>
        </ChipGroup>
      </div>
      <p className="type-caption break-keep text-muted-foreground">
        {draft.draft.isPublic ? (
          <>
            {copy.composer.publicNote}{" "}
          </>
        ) : null}
        {copy.composer.aggregateNote}
      </p>
    </div>
  );
}

/** 보내지 못함 (composer 안, state=error) */
export function ComposerError() {
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
        {copy.states.saveError.title}{" "}
        <span className="text-muted-foreground">
          {copy.states.saveError.body}
        </span>
      </span>
    </p>
  );
}

/* ---------- 상세 틀 ---------- */

/**
 * 식당 상세(D-10) 바깥 틀: 홈 "상세"에서 연 화면(뒤로 버튼 + 하단 길찾기 + 데스크톱 지도).
 * 본문은 머리(카테고리, 이름, 후기 요약)와 children(후기 자리)만.
 */
export function DetailFrame({
  p,
  detail,
  children,
  inert = false,
}: {
  p: FeedbackParams;
  detail: PlaceDetail;
  children: ReactNode;
  inert?: boolean;
}) {
  const unnamed = isNameFail(p);
  const mode = unnamed ? "name" : p.state === "offline" ? "offline" : "ready";
  return (
    <div inert={inert} className="flex min-h-dvh flex-1 flex-col">
      <DetailScreen
        from="home"
        pinLabel={unnamed ? null : detail.place.name}
        footer={<PrimaryAction detail={detail} mode={mode} className="w-full" />}
      >
        <div className="flex flex-col gap-2 pt-2 pb-6">
          {unnamed ? (
            <NameUnresolved />
          ) : (
            <>
              <CategoryCaption place={detail.place} />
              <h1 className="type-title break-keep text-balance">
                {detail.place.name}
              </h1>
            </>
          )}
        </div>
        <div className="flex flex-col pb-10">{children}</div>
      </DetailScreen>
    </div>
  );
}

/** 상세 안 블록 제목 (세리프 아님, 상세 접힘 행 제목과 같은 label 위계) */
export function SectionTitle({
  id,
  children,
  aside,
}: {
  id?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <h2 id={id} className="type-label">
        {children}
      </h2>
      {aside}
    </div>
  );
}

/** 내 후기 요약 (가격, 태그, 글). 줄 하나에 하나씩 */
export function MyReviewSummary({
  review,
  className,
}: {
  review: MyReview;
  className?: string;
}) {
  const Thumb = review.thumb === "up" ? ThumbsUp : ThumbsDown;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="flex items-center gap-2 type-caption text-muted-foreground">
        <Thumb aria-hidden className="size-4" strokeWidth={1.5} />
        <span className="sr-only">
          {review.thumb === "up" ? bandCopy.up : bandCopy.down}
        </span>
        <span>
          {review.isPublic
            ? copy.detail.mineMeta(review.visitMonth)
            : copy.detail.mineMetaPrivate(review.visitMonth)}
        </span>
        {review.priceKRW !== null ? (
          <>
            <span aria-hidden className="h-3 w-px bg-border" />
            <span className="tabular-nums">{formatWon(review.priceKRW)}</span>
          </>
        ) : null}
      </p>
      <p className="type-body-sm break-keep">{review.text}</p>
      {review.tags.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {review.tags.map((t) => (
            <li
              key={t}
              className="rounded-badge border border-border px-2 py-0.5 type-caption"
            >
              {t}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** 삭제 확인 줄 (FB-07). 되돌릴 수 없어 한 번 더 묻는다 */
export function DeleteConfirm({
  onConfirm,
  onCancel,
  className,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  return (
    <div
      role="group"
      aria-labelledby="fb-delete-title"
      className={cn(
        "flex flex-col gap-3 rounded-card border border-border bg-card p-5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)]",
        className,
      )}
    >
      <h3
        id="fb-delete-title"
        ref={ref}
        tabIndex={-1}
        className="type-label outline-none"
      >
        {copy.detail.confirm.title}
      </h3>
      <p className="type-caption break-keep text-muted-foreground">
        {copy.detail.confirm.body}
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={onConfirm}
          className={buttonClass("destructive", "sm")}
        >
          {copy.detail.confirm.confirm}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={buttonClass("secondary", "sm")}
        >
          {copy.detail.confirm.cancel}
        </button>
      </div>
    </div>
  );
}

/** 지운 뒤 한 줄 */
export function RemovedLine() {
  return <BandLine focusOnMount>{copy.detail.removed}</BandLine>;
}

/** 상세 오프라인: 후기 쓰기를 끄고 이유 한 줄 */
export function WriteOffline() {
  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        aria-disabled
        className={buttonClass("secondary", "sm")}
      >
        {copy.detail.write}
      </button>
      <p className="type-caption text-muted-foreground">
        {copy.states.offline.write}
      </p>
    </div>
  );
}

/** 신고 진입점을 누르면(목업) 신고 시트는 T6.3 몫이라 스크린 리더에 알리기만 한다 */
export function useReportNotice() {
  const [message, setMessage] = useState("");
  return {
    open: () => setMessage(copy.report.pending),
    status: (
      <p role="status" className="sr-only">
        {message}
      </p>
    ),
  };
}

export { MY_REVIEW };
