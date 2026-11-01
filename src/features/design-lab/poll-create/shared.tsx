"use client";
// 투표 만들기 시안 공용 조각 (T7.2). 세 안이 같은 부품을 다른 흐름(한 장, 한 질문씩, 먼저 만들고 고치기)에 담는다.
//
// - PollHome: 홈 D1 화면 + 같이 정하기 진입점(REC-10, 실제 홈과 같은 자리: 대안 카드 아래 글자 버튼 둘).
// - PollSheet: 모달 바텀시트 틀(시안은 CSS, 실제는 Base UI Drawer를 누른 뒤 지연 로딩). 데스크톱은 가운데 대화상자.
// - 후보: CandidateRow(넣은 후보, 빼기), PickRow(넣기/빼기 토글), CandidateSkeleton, CandidatesEmpty.
// - 설정: DeadlineField(빠른 선택 칩 + 절대 시각 한 줄 + 직접 입력), ModeField(한 곳만/여러 곳), TitleField, AnchorLine.
// - 보내기: InvitePreview(친구가 받는 링크 미리보기 모양, 식당 이름 없음 POLL-04), ShareActions(카카오톡, 다른 앱, 링크 복사).
// - SheetNotice: 만들기 실패, 하루 한도, 공유 실패, 오프라인 안내(시트 안 한 덩어리, 토스트만으로 알리지 않음).
// 저장은 목업이라 화면 상태만 바꾼다. 서버로 갈 값은 place_id, place_url, 순서와 투표방 설정뿐이다(T7.6).
import {
  AlertCircle,
  Check,
  Link2,
  MapPin,
  MessageCircle,
  Plus,
  Share2,
  WifiOff,
  X,
} from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { LoadingRegion, SkeletonLine } from "@/components/states";
import { buttonClass as rawButtonClass } from "@/components/ui/button-classes";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { focusRing, hitArea44, pressMotion } from "@/components/ui/interaction";
import { Skeleton } from "@/components/ui/skeleton";
import { pollCreateLabCopy as copy } from "@/copy/design-lab-poll-create";
import {
  HomeColumn,
  HomeFrame,
  HomeMap,
} from "@/features/design-lab/home/shared/frame";
import {
  TodayActionBar,
  TodayPicks,
  useTodayPick,
} from "@/features/design-lab/home/shared/today-pick";
import type { MockPlace } from "@/features/design-lab/mock";
import { CATEGORY_INK } from "@/features/design-lab/system/b/parts";
import { categoryLabel } from "@/features/place/categories";
import { CategoryIllustration } from "@/features/place/illustrations";
import { formatPriceBand } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  CANDIDATE_MAX,
  MOCK_INVITE_URL,
  clockOf,
  customDefault,
  deadlineAt,
  deadlineOptions,
  type DeadlineId,
  type PollDraft,
} from "./mock";
import type { PollCreateParams, PollEntry } from "./params";

/** 기본 border-transparent와 variant 테두리색이 겹쳐 cn으로 정리한다 */
export const buttonClass = (...args: Parameters<typeof rawButtonClass>) =>
  cn(rawButtonClass(...args));

/** 시트 안쪽 좌우 여백 (360px에서 20) */
export const SHEET_PAD = "px-7 @max-[23.75rem]/screen:px-5";

/* ---------- 입력 상태 ---------- */

export function useDraft(initial: PollDraft) {
  const [draft, setDraft] = useState<PollDraft>(initial);
  const patch = (next: Partial<PollDraft>) =>
    setDraft((d) => ({ ...d, ...next }));
  const toggle = (place: MockPlace) =>
    setDraft((d) => {
      const has = d.candidates.some((c) => c.id === place.id);
      if (has)
        return {
          ...d,
          candidates: d.candidates.filter((c) => c.id !== place.id),
        };
      if (d.candidates.length >= CANDIDATE_MAX) return d;
      return { ...d, candidates: [...d.candidates, place] };
    });
  return { draft, patch, toggle };
}

export type DraftApi = ReturnType<typeof useDraft>;

/** 스크린 리더 안내 한 줄 (aria-live) */
export function useAnnounce() {
  const [text, setText] = useState("");
  const node = (
    <p aria-live="polite" className="sr-only">
      {text}
    </p>
  );
  return { announce: setText, node };
}

export function eyebrowOf(entry: PollEntry, detailName: string): string {
  if (entry === "detail") return copy.sheet.eyebrow.detail(detailName);
  if (entry === "party") return copy.sheet.eyebrow.party;
  return copy.sheet.eyebrow.home;
}

/** 시트 안에서 보여 줄 상태: 4상태와 실패 종류를 한 값으로 */
export type SheetStatus =
  | "ready"
  | "loading"
  | "empty"
  | "saveError"
  | "limit"
  | "shareError"
  | "offline";

export function sheetStatus(p: PollCreateParams): SheetStatus {
  if (p.state === "error") {
    if (p.fail === "limit") return "limit";
    if (p.fail === "share") return "shareError";
    return "saveError";
  }
  return p.state;
}

/* ---------- 홈 ---------- */

/**
 * 홈 D1 + 같이 정하기 진입점. 시트가 떠 있는 동안 뒤 화면은 inert.
 * 진입점은 실제 홈(today-screen.tsx Entries)과 같은 자리: 대안 카드 아래 밑줄 글자 버튼 둘.
 */
export function PollHome({
  inert = false,
  onFriends,
  onParty,
  friendsLabel = copy.entries.friends,
}: {
  inert?: boolean;
  onFriends: () => void;
  onParty: () => void;
  friendsLabel?: string;
}) {
  const t = useTodayPick();
  const link = cn(
    "inline-flex min-h-11 items-center rounded-sm type-label text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground",
    focusRing,
  );
  return (
    <div inert={inert} className="flex min-h-dvh flex-1 flex-col">
      <HomeFrame map={<HomeMap picks={t.lab.picks} active={t.heroIndex} />}>
        <HomeColumn className="pb-0 desktop:pt-8 desktop:pb-0">
          {t.header}
          <TodayPicks t={t} className="mt-5 desktop:mt-4" />
          <nav
            aria-label={copy.entries.label}
            className="mt-4 flex items-center gap-5 pb-6"
          >
            <button
              type="button"
              aria-haspopup="dialog"
              aria-describedby="poll-friends-hint"
              onClick={(e) => {
                rememberOpener(e.currentTarget);
                onFriends();
              }}
              className={link}
            >
              {friendsLabel}
            </button>
            <span id="poll-friends-hint" className="sr-only">
              {copy.entries.friendsHint}
            </span>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={(e) => {
                rememberOpener(e.currentTarget);
                onParty();
              }}
              className={link}
            >
              {copy.entries.party}
            </button>
          </nav>
          <TodayActionBar t={t} />
        </HomeColumn>
      </HomeFrame>
    </div>
  );
}

/* ---------- 시트 틀 ---------- */

let lastOpener: HTMLElement | null = null;

/** 시트를 여는 버튼의 onClick에서 부른다. 닫힌 뒤 이 버튼으로 포커스를 돌려준다 */
export function rememberOpener(el: HTMLElement) {
  lastOpener = el;
}

/**
 * 모달 바텀시트 (시안은 CSS 틀, 실제는 Base UI Drawer). 열리면 [data-sheet-focus]로 포커스,
 * focusKey가 바뀔 때마다 다시(단계가 바뀌면 새 질문으로). Esc와 딤 누르기로 닫히고, 닫히면 연 버튼으로 돌아간다.
 */
export function PollSheet({
  labelledBy,
  onClose,
  focusKey,
  tall = false,
  children,
  footer,
}: {
  labelledBy: string;
  onClose: () => void;
  focusKey?: string;
  /** B: 단계가 바뀌어도 높이가 출렁이지 않게 고정 높이 */
  tall?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  // 뒤 화면이 inert가 되면 연 버튼이 포커스를 잃으므로, 누를 때 기억해 둔 버튼(rememberOpener)을 먼저 쓴다
  useLayoutEffect(() => {
    opener.current = lastOpener ?? document.activeElement;
    const prev = opener;
    return () => {
      const el = prev.current;
      // 뒤 화면의 inert가 풀린 다음 프레임에 돌려준다
      if (el instanceof HTMLElement)
        requestAnimationFrame(() => el.focus({ preventScroll: true }));
    };
  }, []);

  useEffect(() => {
    dialogRef.current
      ?.querySelector<HTMLElement>("[data-sheet-focus]")
      ?.focus({ preventScroll: true });
  }, [focusKey]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center desktop:items-center desktop:p-8"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-overlay motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)]"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          "relative flex max-h-[92dvh] w-full max-w-(--lm-layout-max-width) flex-col rounded-t-sheet border-t border-border bg-popover",
          tall && "h-[88dvh] desktop:h-[min(46rem,85dvh)]",
          "desktop:max-h-[85dvh] desktop:max-w-md desktop:rounded-card desktop:border",
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-slow)] motion-safe:[animation-timing-function:var(--lm-ease-enter)] motion-safe:slide-in-from-bottom-2",
        )}
      >
        <span
          aria-hidden
          className="mx-auto mt-3 h-1 w-9 shrink-0 rounded-full bg-border desktop:hidden"
        />
        {children}
        {footer ? (
          <div
            className={cn(
              "shrink-0 border-t border-border pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]",
              SHEET_PAD,
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** 시트 머리: 눈썹(어디서 열었나) + 제목 + 닫기 */
export function SheetHead({
  id,
  eyebrow,
  title,
  onClose,
  serifSize = "title",
  after,
  lead,
}: {
  id: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  onClose: () => void;
  serifSize?: "title" | "heading";
  /** 제목 아래 한 줄(제목 바꾸기 버튼, 회식 표시 등) */
  after?: ReactNode;
  /** 제목 앞(성공 표시 등) */
  lead?: ReactNode;
}) {
  return (
    <div
      className={cn("flex items-start gap-3 pt-4 pb-1 desktop:pt-6", SHEET_PAD)}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {eyebrow ? (
          <span className="type-caption text-muted-foreground">{eyebrow}</span>
        ) : null}
        <div className="flex items-center gap-2.5">
          {lead}
          <h2
            id={id}
            data-sheet-focus
            tabIndex={-1}
            className={cn(
              "min-w-0 break-keep outline-none",
              serifSize === "title" ? "type-title" : "type-heading",
            )}
          >
            {title}
          </h2>
        </div>
        {after}
      </div>
      <CloseButton onClick={onClose} />
    </div>
  );
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={copy.sheet.close}
      onClick={onClick}
      className={cn(
        "-mt-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
        focusRing,
      )}
    >
      <X aria-hidden className="size-5" strokeWidth={1.5} />
    </button>
  );
}

/** 시트 스크롤 본문 */
export function SheetBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto pt-4 pb-7",
        SHEET_PAD,
        className,
      )}
    >
      {children}
    </div>
  );
}

/** 밑줄 글자 버튼 (caption) */
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

/** 블록 머리: 라벨 + 오른쪽 보조(개수 등) */
export function BlockHead({
  id,
  title,
  aside,
}: {
  id: string;
  title: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 id={id} className="type-label">
        {title}
      </h3>
      {aside}
    </div>
  );
}

/** 후보 개수 "3/5" */
export function CountBadge({ n }: { n: number }) {
  return (
    <span className="type-caption text-muted-foreground tabular-nums">
      {copy.candidates.countOf(n, CANDIDATE_MAX)}
    </span>
  );
}

/* ---------- 후보 ---------- */

function PlaceMeta({ place }: { place: MockPlace }) {
  return (
    <span className="flex items-center gap-2 type-caption text-muted-foreground">
      <span className={CATEGORY_INK[place.category]}>
        {categoryLabel(place.category)}
      </span>
      <span aria-hidden className="h-3 w-px bg-border" />
      <span className="tabular-nums">
        {copy.candidates.walk(place.walkMinutes)}
      </span>
      <span aria-hidden className="h-3 w-px bg-border" />
      <span className="tabular-nums">{formatPriceBand(place.priceKRW)}</span>
    </span>
  );
}

/** 넣은 후보 한 줄: 그림 40 + 이름 + 메타(카테고리 | 도보 | 가격대) + 빼기 */
export function CandidateRow({
  place,
  onRemove,
  fresh = false,
}: {
  place: MockPlace;
  onRemove?: () => void;
  /** 방금 넣은 줄은 base 페이드로 들어온다 */
  fresh?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex min-h-16 items-center gap-3 border-b border-border py-2 last:border-b-0",
        fresh &&
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)] motion-safe:slide-in-from-top-1",
      )}
    >
      <CategoryIllustration slug={place.category} size={40} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate type-label">{place.name}</span>
        <PlaceMeta place={place} />
      </div>
      {onRemove ? (
        <button
          type="button"
          aria-label={copy.candidates.remove(place.name)}
          onClick={onRemove}
          className={cn(
            "-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
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
  size = 32,
}: {
  place: MockPlace;
  picked: boolean;
  full: boolean;
  onToggle: () => void;
  size?: 32 | 40;
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
        )}
      >
        <CategoryIllustration slug={place.category} size={size} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate type-label">{place.name}</span>
          <PlaceMeta place={place} />
          <span className="sr-only">{copy.candidates.pickHint}</span>
        </span>
        <span
          aria-hidden
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-full border transition-[border-color,color,background-color] duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
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

export function CandidateSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <LoadingRegion label={copy.candidates.loading}>
      <ul aria-hidden className="flex flex-col">
        {Array.from({ length: rows }, (_, i) => (
          <li
            key={i}
            className="flex min-h-16 items-center gap-3 border-b border-border py-2 last:border-b-0"
          >
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-1">
              <SkeletonLine
                type="label"
                className={i === 1 ? "w-20" : "w-28"}
              />
              <SkeletonLine type="caption" className="w-36" />
            </div>
          </li>
        ))}
      </ul>
    </LoadingRegion>
  );
}

export function CandidatesEmpty() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-border px-5 py-5">
      <CategoryIllustration slug="hansik" size={40} />
      <div className="flex flex-col gap-1">
        <p className="type-label">{copy.candidates.emptyTitle}</p>
        <p className="type-body-sm break-keep text-muted-foreground">
          {copy.candidates.emptyBody}
        </p>
      </div>
      <button type="button" className={buttonClass("secondary", "sm")}>
        <MapPin aria-hidden className="size-4" strokeWidth={1.5} />
        {copy.candidates.fromMap}
      </button>
    </div>
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
  if (count >= 2) return null;
  return (
    <p className="type-caption break-keep text-foreground">
      {count === 1
        ? copy.candidates.needOne
        : copy.candidates.needMore(2 - count)}
    </p>
  );
}

/* ---------- 설정 ---------- */

/** 마감 칩 이름 */
export function deadlineLabel(id: DeadlineId, kind: PollDraft["kind"]): string {
  if (id === "fixed") return kind === "party" ? "18:00" : "11:30";
  return copy.deadline.chips[id];
}

/** 고른 마감의 "11:35에 마감합니다." */
export function deadlineSentence(draft: PollDraft, now: number): string {
  const at = deadlineAt(draft, now);
  if (at === null) return copy.deadline.customTooSoon;
  const { hhmm, tomorrow } = clockOf(at);
  return tomorrow ? copy.deadline.atTomorrow(hhmm) : copy.deadline.at(hhmm);
}

/**
 * 마감 빠른 선택. 칩(chips) 또는 큰 칸(tiles: 칸마다 라벨 + 시각 숫자). 직접을 고르면 시각 입력이 열린다.
 * 아래 한 줄이 고른 결과를 절대 시각으로 말한다(aria-live).
 */
export function DeadlineField({
  draft,
  now,
  layout = "chips",
  headless = false,
}: {
  draft: DraftApi;
  now: number;
  layout?: "chips" | "tiles";
  /** B: 단계 질문이 제목이라 블록 머리를 숨긴다 */
  headless?: boolean;
}) {
  const id = useId();
  const options = deadlineOptions(draft.draft.kind, now);
  const lateSwap =
    draft.draft.kind === "lunch" && !options.some((o) => o.id === "fixed");
  const select = (v: unknown[]) => {
    const next = v[0] as DeadlineId | undefined;
    if (!next) return;
    draft.patch({
      deadline: next,
      customAt:
        next === "custom" && draft.draft.customAt === ""
          ? customDefault(now)
          : draft.draft.customAt,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {headless ? (
        <span id={`${id}-h`} className="sr-only">
          {copy.deadline.title}
        </span>
      ) : (
        <BlockHead id={`${id}-h`} title={copy.deadline.title} />
      )}
      {layout === "chips" ? (
        <ChipGroup
          aria-labelledby={`${id}-h`}
          value={[draft.draft.deadline]}
          onValueChange={select}
        >
          {options.map((o) => (
            <Chip key={o.id} value={o.id} className="tabular-nums">
              {deadlineLabel(o.id, draft.draft.kind)}
            </Chip>
          ))}
        </ChipGroup>
      ) : (
        <DeadlineTiles
          labelledBy={`${id}-h`}
          options={options}
          kind={draft.draft.kind}
          value={draft.draft.deadline}
          customAt={draft.draft.customAt}
          onSelect={(v) => select([v])}
        />
      )}
      {draft.draft.deadline === "custom" ? (
        <label className="flex items-center justify-between gap-3 rounded-md border border-input bg-card px-4 py-2">
          <span className="type-label">{copy.deadline.customLabel}</span>
          <input
            type="time"
            step={300}
            value={draft.draft.customAt}
            onChange={(e) => draft.patch({ customAt: e.target.value })}
            className={cn(
              "min-h-11 rounded-sm bg-transparent text-right type-numeric-md tabular-nums",
              focusRing,
            )}
          />
        </label>
      ) : null}
      <p
        aria-live="polite"
        className={cn(
          "type-caption tabular-nums",
          deadlineAt(draft.draft, now) === null
            ? "text-destructive"
            : "text-muted-foreground",
        )}
      >
        {deadlineSentence(draft.draft, now)}
        {lateSwap ? ` ${copy.deadline.lateNote}` : ""}
      </p>
    </div>
  );
}

/** B: 마감 큰 칸 2 x 2. 라벨 caption + 시각 numeric-md. 고르면 테두리 1.5 올리브 */
function DeadlineTiles({
  labelledBy,
  options,
  kind,
  value,
  customAt,
  onSelect,
}: {
  labelledBy: string;
  options: readonly { id: DeadlineId; at: number | null }[];
  kind: PollDraft["kind"];
  value: DeadlineId;
  customAt: string;
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
        // 상대 시각(10분 뒤)은 이름 위 + 시각 아래, 정해진 시각(11:30, 내일 12:00)은 "오늘/내일" 위 + 시각 아래
        const relative = o.id === "in10" || o.id === "in30" || o.id === "in60";
        const caption =
          o.id === "custom"
            ? copy.deadline.chips.custom
            : relative
              ? deadlineLabel(o.id, kind)
              : time?.tomorrow
                ? copy.deadline.tileTomorrow
                : copy.deadline.tileToday;
        const big =
          o.id === "custom"
            ? customAt && on
              ? customAt
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
                ? copy.deadline.chips.custom
                : `${caption} ${big}`
            }
            onClick={() => onSelect(o.id)}
            className={cn(
              "flex min-h-20 flex-col items-start justify-between rounded-card border bg-card px-4 py-3 text-left",
              on
                ? "[border-width:1.5px] border-primary"
                : "border-border hover:bg-muted",
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

/** 고르는 방식: 한 곳만 / 여러 곳 (POLL-01 복수 선택 여부) */
export function ModeField({ draft }: { draft: DraftApi }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <h3 id={id} className="type-label">
          {copy.mode.title}
        </h3>
        <ChipGroup
          aria-labelledby={id}
          value={[draft.draft.multi ? "multi" : "single"]}
          onValueChange={(v: unknown[]) => {
            if (v[0] === "single") draft.patch({ multi: false });
            if (v[0] === "multi") draft.patch({ multi: true });
          }}
        >
          <Chip value="single">{copy.mode.single}</Chip>
          <Chip value="multi">{copy.mode.multi}</Chip>
        </ChipGroup>
      </div>
      <p className="type-caption break-keep text-muted-foreground">
        {draft.draft.multi ? copy.mode.multiNote : copy.mode.singleNote}
      </p>
    </div>
  );
}

/** 제목 고치기 입력 (최대 20자) */
export function TitleInput({
  draft,
  inputRef,
  onDone,
}: {
  draft: DraftApi;
  inputRef?: RefObject<HTMLInputElement | null>;
  onDone?: () => void;
}) {
  const empty = draft.draft.title.trim() === "";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          aria-label={copy.title.inputLabel}
          value={draft.draft.title}
          maxLength={copy.title.max}
          onChange={(e) => draft.patch({ title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !empty) onDone?.();
          }}
          className={cn(
            "min-h-12 min-w-0 flex-1 rounded-md border border-input bg-card px-4 type-body",
            focusRing,
          )}
        />
        {onDone ? (
          <button
            type="button"
            aria-disabled={empty || undefined}
            onClick={empty ? undefined : onDone}
            className={buttonClass("secondary", "sm")}
          >
            {copy.title.done}
          </button>
        ) : null}
      </div>
      {empty ? (
        <p className="type-caption text-destructive">{copy.title.empty}</p>
      ) : null}
    </div>
  );
}

/** 후보 이름 기준(T7.6 기준점): 방장 사무실 핀 또는 지도에서 찍은 점. 현위치 금지 */
export function AnchorLine({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <MapPin
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
          strokeWidth={1.5}
        />
        <span className="type-caption text-muted-foreground">
          {copy.anchor.label}
        </span>
        <span className="min-w-0 flex-1 truncate type-caption text-foreground">
          {copy.anchor.office}
        </span>
        <TextButton>{copy.anchor.change}</TextButton>
      </div>
      {compact ? null : (
        <p className="type-caption break-keep text-muted-foreground">
          {copy.anchor.note}
        </p>
      )}
    </div>
  );
}

/** 회식 투표 표시 한 줄 */
export function PartyLine() {
  return (
    <p className="flex items-center gap-2 type-caption text-muted-foreground">
      <span className="inline-flex h-6 items-center rounded-badge border border-input px-2 text-foreground">
        {copy.kind.party}
      </span>
      {copy.kind.partyNote}
    </p>
  );
}

/* ---------- 보내기 ---------- */

/**
 * 친구가 받는 링크 미리보기 모양. 식당 이름과 카테고리는 넣지 않는다(서버 OG는 카카오를 부르지 않음, POLL-04).
 * 실제 OG 모양은 T7.4에서 고른다. 여기서는 "무엇이 보이는가"만 알린다.
 */
export function InvitePreview({
  draft,
  now,
  compact = false,
}: {
  draft: PollDraft;
  now: number;
  compact?: boolean;
}) {
  const at = deadlineAt(draft, now);
  const time = at === null ? null : clockOf(at);
  const meta = time
    ? time.tomorrow
      ? copy.share.previewMetaTomorrow(draft.candidates.length, time.hhmm)
      : copy.share.previewMeta(draft.candidates.length, time.hhmm)
    : "";
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="type-caption text-muted-foreground">
        {copy.share.previewLabel}
      </figcaption>
      <div className="overflow-hidden rounded-card border border-border bg-card">
        <div
          className={cn(
            "flex flex-col justify-between border-b border-border bg-muted px-5 py-4",
            compact ? "aspect-[2.6/1]" : "aspect-[2/1]",
          )}
        >
          <span className="type-caption text-muted-foreground">
            {copy.share.previewBrand}
          </span>
          <span className="type-heading break-keep">{draft.title}</span>
          <span className="type-caption text-muted-foreground tabular-nums">
            {meta}
          </span>
        </div>
        <p className="truncate px-5 py-2.5 type-caption text-muted-foreground tabular-nums">
          {MOCK_INVITE_URL}
        </p>
      </div>
      {compact ? null : (
        <p className="type-caption break-keep text-muted-foreground">
          {copy.share.previewNote}
        </p>
      )}
    </figure>
  );
}

/**
 * 보내기 버튼: 카카오톡(주 버튼, 화면에 하나) + 다른 앱으로(Web Share, 지원할 때만) + 링크 복사.
 * 공유 실패(fail=share)면 카카오톡 버튼 대신 안내와 링크 복사가 주 버튼이 된다.
 */
export function ShareActions({
  failed = false,
  onShared,
}: {
  failed?: boolean;
  onShared?: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const copyLink = () => {
    setCopied(true);
    onShared?.(copy.share.copied);
  };
  return (
    <div className="flex flex-col gap-2">
      {failed ? (
        <button
          type="button"
          onClick={copyLink}
          className={buttonClass("primary")}
        >
          {copied ? (
            <Check aria-hidden strokeWidth={2} />
          ) : (
            <Link2 aria-hidden strokeWidth={1.5} />
          )}
          {copied ? copy.share.copiedShort : copy.share.copy}
        </button>
      ) : (
        <>
          <button type="button" className={buttonClass("primary")}>
            <MessageCircle aria-hidden strokeWidth={1.5} />
            {copy.share.kakao}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={buttonClass("secondary")}>
              <Share2 aria-hidden className="size-4" strokeWidth={1.5} />
              {copy.share.webShare}
            </button>
            <button
              type="button"
              onClick={copyLink}
              className={buttonClass("secondary")}
            >
              {copied ? (
                <Check aria-hidden className="size-4" strokeWidth={2} />
              ) : (
                <Link2 aria-hidden className="size-4" strokeWidth={1.5} />
              )}
              {copied ? copy.share.copiedShort : copy.share.copy}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** 성공 표시 (제목 앞 원 안 체크) */
export function SuccessMark() {
  return (
    <span
      aria-hidden
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-success-surface text-success-foreground motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:[animation-duration:var(--lm-duration-slow)]"
    >
      <Check className="size-4" strokeWidth={2} />
    </span>
  );
}

/* ---------- 안내 ---------- */

/**
 * 시트 안 안내 덩어리. 오류는 destructive 글자만(빨간 면 없음), 오프라인과 한도는 중립.
 * role=status라 나타날 때 읽힌다. action은 글자 버튼 하나.
 */
export function SheetNotice({
  kind,
  action,
}: {
  kind: "saveError" | "limit" | "shareError" | "offline";
  action?: ReactNode;
}) {
  const text =
    kind === "saveError"
      ? copy.states.saveError
      : kind === "limit"
        ? copy.states.limit
        : kind === "shareError"
          ? copy.states.shareError
          : copy.states.offline;
  const Icon = kind === "offline" ? WifiOff : AlertCircle;
  const danger = kind === "saveError" || kind === "shareError";
  return (
    <div
      role="status"
      className="flex gap-3 rounded-card border border-border bg-card px-4 py-3.5"
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-4 shrink-0",
          danger ? "text-destructive" : "text-muted-foreground",
        )}
        strokeWidth={1.5}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p
          className={cn(
            "type-label break-keep",
            danger ? "text-destructive" : "text-foreground",
          )}
        >
          {text.title}
        </p>
        <p className="type-caption break-keep text-muted-foreground">
          {text.body}
        </p>
        {action ? <div className="pt-1">{action}</div> : null}
      </div>
    </div>
  );
}

/** 만들기 버튼: 꺼지면 aria-disabled(포커스는 받음) */
export function CreateButton({
  label,
  disabled,
  onClick,
  className,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
      className={cn(buttonClass("primary"), "w-full", className)}
    >
      {label}
    </button>
  );
}
