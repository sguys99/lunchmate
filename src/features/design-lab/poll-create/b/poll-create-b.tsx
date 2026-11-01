"use client";
// 투표 만들기 시안 B "한 질문씩" (T7.2).
//
// 의도: 제보(D-13 C)와 같은 문법으로 한 화면에 질문 하나만 묻는다. 세리프 질문이 제목이고, 고를 것만 크게 보인다.
//       1 "어디 중에서 고를까요?"(후보 체크 목록) → 2 "언제까지 정할까요?"(마감 큰 칸 2 x 2 + 방식 + 제목) → 3 보내기.
//       빠른 투표는 "친구랑 정하기 → 다음 → 만들고 보내기 → 카카오톡" 4탭.
// 시트: 고정 높이(단계가 바뀌어도 출렁이지 않음), 위 진행 막대 3칸, 하단 고정 줄(이전 아이콘 + 주 버튼 하나).
// 후보 추가 경로: 1단계 목록이 곧 고르는 곳. 오늘 추천(체크된 채) → 즐겨찾기 → 최근 간 곳, 머리에 "3/5" 고정.
//       상세에서 열면 그 식당이 맨 위에 체크된 채, 회식 모드에서 열면 다섯 곳이 체크된 채.
// 모션: 시트 slow 300 enter, 단계 전환은 새 질문이 4px 옆에서 base 페이드, 진행 막대 채움 fast. 축소 모드는 즉시.
import { ChevronLeft } from "lucide-react";
import { useId, useState } from "react";
import { focusRing } from "@/components/ui/interaction";
import { pollCreateLabCopy as copy } from "@/copy/design-lab-poll-create";
import type { MockPlace } from "@/features/design-lab/mock";
import { cn } from "@/lib/utils";
import {
  CANDIDATE_MAX,
  DETAIL_PLACE,
  FAVORITES,
  PARTY_FIVE,
  RECENT,
  TODAY,
  canCreate,
  clockOf,
  deadlineAt,
  initialDraft,
  nowMinutes,
} from "../mock";
import type { PollCreateParams, PollEntry } from "../params";
import {
  AnchorLine,
  CandidateNote,
  CandidateSkeleton,
  CandidatesEmpty,
  CloseButton,
  CreateButton,
  DeadlineField,
  InvitePreview,
  ModeField,
  PartyLine,
  PickRow,
  PollHome,
  PollSheet,
  SHEET_PAD,
  ShareActions,
  SheetBody,
  SheetNotice,
  SuccessMark,
  TextButton,
  TitleInput,
  eyebrowOf,
  sheetStatus,
  useAnnounce,
  useDraft,
  type DraftApi,
} from "../shared";

type Step = 0 | 1 | 2 | 3;

export function PollCreateB({ p }: { p: PollCreateParams }) {
  const [entry, setEntry] = useState<PollEntry>(p.entry);
  const [step, setStep] = useState<Step>(
    p.flow === "home"
      ? 0
      : p.flow === "share"
        ? 3
        : p.flow === "compose"
          ? // 만들기 실패는 만들기 버튼이 있는 2단계에서 보인다
            p.state === "error" && p.fail === "save"
            ? 2
            : p.step
          : 1,
  );
  const [round, setRound] = useState(0);
  const open = (e: PollEntry) => {
    setEntry(e);
    setRound((r) => r + 1);
    setStep(1);
  };
  return (
    <>
      <PollHome
        inert={step !== 0}
        onFriends={() => open("home")}
        onParty={() => open("party")}
      />
      {step !== 0 ? (
        <SheetB
          key={round}
          p={{ ...p, entry }}
          step={step}
          setStep={setStep}
          onClose={() => setStep(0)}
        />
      ) : null}
    </>
  );
}

function SheetB({
  p,
  step,
  setStep,
  onClose,
}: {
  p: PollCreateParams;
  step: Exclude<Step, 0>;
  setStep: (s: Step) => void;
  onClose: () => void;
}) {
  const ids = useId();
  const now = nowMinutes(p.clock);
  const draft = useDraft(initialDraft(p));
  const status = sheetStatus(p);
  const [failed, setFailed] = useState(status === "saveError");
  const { announce, node } = useAnnounce();
  const list = draft.draft.candidates;
  const blocked =
    status === "offline" || status === "limit" || status === "loading";

  const title =
    step === 1
      ? copy.steps.where
      : step === 2
        ? copy.steps.when
        : copy.share.title;

  let footer = null;
  if (step === 1) {
    // 한도와 오프라인은 첫 단계에서 바로 알린다(끝까지 고른 뒤에 막히지 않게)
    footer = (
      <div className="flex flex-col gap-3">
        {status === "offline" || status === "limit" ? (
          <SheetNotice
            kind={status}
            action={
              status === "limit" ? (
                <TextButton>{copy.states.limit.goList}</TextButton>
              ) : undefined
            }
          />
        ) : null}
        <Footer onBack={null}>
          <CreateButton
            label={copy.create.next}
            disabled={list.length < 2 || blocked}
            onClick={() => setStep(2)}
          />
        </Footer>
      </div>
    );
  } else if (step === 2) {
    footer = (
      <div className="flex flex-col gap-3">
        {failed ? (
          <SheetNotice kind="saveError" />
        ) : status === "offline" || status === "limit" ? (
          <SheetNotice
            kind={status}
            action={
              status === "limit" ? (
                <TextButton>{copy.states.limit.goList}</TextButton>
              ) : undefined
            }
          />
        ) : null}
        <Footer onBack={() => setStep(1)}>
          <CreateButton
            label={failed ? copy.states.saveError.retry : copy.create.submit}
            disabled={!canCreate(draft.draft, now) || blocked}
            onClick={() => {
              setFailed(false);
              setStep(3);
            }}
          />
        </Footer>
      </div>
    );
  }

  return (
    <PollSheet
      labelledBy={`${ids}-t`}
      onClose={onClose}
      focusKey={String(step)}
      tall
      footer={footer}
    >
      {node}
      <div className={cn("flex flex-col gap-4 pt-4 desktop:pt-6", SHEET_PAD)}>
        <div className="flex items-center gap-3">
          <Progress step={step} />
          <CloseButton onClick={onClose} />
        </div>
        <div
          key={step}
          className="flex flex-col gap-1.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)] motion-safe:slide-in-from-right-1"
        >
          <span className="type-caption text-muted-foreground">
            {step === 3
              ? draft.draft.title
              : eyebrowOf(p.entry, DETAIL_PLACE.name)}
          </span>
          <div className="flex items-center gap-2.5">
            {step === 3 ? <SuccessMark /> : null}
            <h2
              id={`${ids}-t`}
              data-sheet-focus
              tabIndex={-1}
              className={cn(
                "break-keep outline-none",
                step === 3 ? "type-heading" : "type-title",
              )}
            >
              {title}
            </h2>
          </div>
          <StepHint p={p} step={step} draft={draft} now={now} />
        </div>
      </div>

      <SheetBody
        key={`b${step}`}
        className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)] motion-safe:slide-in-from-right-1"
      >
        {step === 1 ? (
          <WhereStep
            p={p}
            draft={draft}
            announce={announce}
            labelledBy={`${ids}-t`}
          />
        ) : step === 2 ? (
          <WhenStep draft={draft} now={now} />
        ) : (
          <>
            {status === "shareError" ? <SheetNotice kind="shareError" /> : null}
            <InvitePreview draft={draft.draft} now={now} />
            <div className="flex flex-col items-center gap-3">
              <ShareActions
                failed={status === "shareError"}
                onShared={announce}
              />
              <TextButton>{copy.share.goRoom}</TextButton>
            </div>
          </>
        )}
      </SheetBody>
    </PollSheet>
  );
}

function StepHint({
  p,
  step,
  draft,
  now,
}: {
  p: PollCreateParams;
  step: Exclude<Step, 0>;
  draft: DraftApi;
  now: number;
}) {
  let text: string;
  if (step === 1) {
    text =
      p.entry === "party"
        ? copy.steps.whereHintParty
        : p.entry === "detail"
          ? copy.steps.whereHintDetail
          : copy.steps.whereHint;
  } else if (step === 2) {
    text = copy.steps.whenHint;
  } else {
    const at = deadlineAt(draft.draft, now);
    const time = at === null ? null : clockOf(at);
    text = time
      ? time.tomorrow
        ? copy.share.bodyTomorrow(time.hhmm)
        : copy.share.body(time.hhmm)
      : "";
  }
  return (
    <p className="type-body-sm break-keep text-muted-foreground tabular-nums">
      {text}
    </p>
  );
}

/** 진행 막대 3칸 (채움 fast) */
function Progress({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex flex-1 items-center gap-1.5">
      <span className="sr-only">{copy.create.stepOf(step, 3)}</span>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          aria-hidden
          className="h-1 flex-1 overflow-hidden rounded-full bg-vote-bar-track"
        >
          <span
            className={cn(
              "block h-full rounded-full bg-primary transition-[width] duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
              n <= step ? "w-full" : "w-0",
            )}
          />
        </span>
      ))}
    </div>
  );
}

function Footer({
  onBack,
  children,
}: {
  onBack: (() => void) | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      {onBack ? (
        <button
          type="button"
          aria-label={copy.create.back}
          onClick={onBack}
          className={cn(
            "inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-border text-foreground hover:bg-muted",
            focusRing,
          )}
        >
          <ChevronLeft aria-hidden className="size-5" strokeWidth={1.5} />
        </button>
      ) : null}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** 1단계: 후보 체크 목록. 그룹마다 caption 머리, 개수는 첫 머리 오른쪽 */
function WhereStep({
  p,
  draft,
  announce,
  labelledBy,
}: {
  p: PollCreateParams;
  draft: DraftApi;
  announce: (t: string) => void;
  labelledBy: string;
}) {
  const status = sheetStatus(p);
  const list = draft.draft.candidates;
  const full = list.length >= CANDIDATE_MAX;
  if (status === "loading") return <CandidateSkeleton rows={5} />;
  if (status === "empty") return <CandidatesEmpty />;

  const toggle = (place: MockPlace) => {
    const has = list.some((c) => c.id === place.id);
    if (!has && full) return;
    draft.toggle(place);
    announce(
      has
        ? copy.candidates.removed(place.name)
        : copy.candidates.added(place.name),
    );
  };

  const seen = new Set<string>();
  const dedupe = (places: readonly MockPlace[]) =>
    places.filter((pl) => (seen.has(pl.id) ? false : (seen.add(pl.id), true)));
  const groups = [
    ...(p.entry === "party"
      ? [{ title: copy.sheet.eyebrow.party, places: dedupe(PARTY_FIVE) }]
      : p.entry === "detail"
        ? [{ title: DETAIL_PLACE.name, places: dedupe([DETAIL_PLACE]) }]
        : []),
    { title: copy.candidates.fromToday, places: dedupe(TODAY) },
    { title: copy.candidates.favorites, places: dedupe(FAVORITES) },
    { title: copy.candidates.recent, places: dedupe(RECENT) },
  ].filter((g) => g.places.length > 0);

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      className="flex flex-col gap-5"
    >
      {groups.map((g, i) => (
        <div key={g.title} className="flex flex-col">
          <div className="flex items-baseline justify-between">
            <h3 className="type-caption text-muted-foreground">{g.title}</h3>
            {i === 0 ? (
              <span
                aria-live="polite"
                className="type-caption text-foreground tabular-nums"
              >
                {copy.candidates.countOf(list.length, CANDIDATE_MAX)}
              </span>
            ) : null}
          </div>
          <ul className="flex flex-col">
            {g.places.map((place) => (
              <PickRow
                key={place.id}
                place={place}
                size={40}
                picked={list.some((c) => c.id === place.id)}
                full={full}
                onToggle={() => toggle(place)}
              />
            ))}
          </ul>
          {i === 0 ? (
            <div className="pt-2">
              <CandidateNote count={list.length} />
            </div>
          ) : null}
        </div>
      ))}
      <TextButton>{copy.candidates.fromMap}</TextButton>
    </div>
  );
}

/** 2단계: 마감 큰 칸 + 방식 + 제목(줄로 보이고 누르면 입력) + 기준 */
function WhenStep({ draft, now }: { draft: DraftApi; now: number }) {
  const [editTitle, setEditTitle] = useState(false);
  return (
    <>
      <DeadlineField draft={draft} now={now} layout="tiles" headless />
      <ModeField draft={draft} />
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="type-label">{copy.title.label}</h3>
          {editTitle ? null : (
            <div className="flex min-w-0 items-center gap-3">
              <span className="truncate type-body-sm">{draft.draft.title}</span>
              <TextButton onClick={() => setEditTitle(true)}>
                {copy.title.edit}
              </TextButton>
            </div>
          )}
        </div>
        {editTitle ? (
          <TitleInput draft={draft} onDone={() => setEditTitle(false)} />
        ) : null}
        {draft.draft.kind === "party" ? <PartyLine /> : null}
      </div>
      <AnchorLine />
    </>
  );
}
