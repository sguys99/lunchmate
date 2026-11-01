"use client";
// 투표 만들기 시안 A "한 장 시트" (T7.2).
//
// 의도: 무엇을 정하는지가 한 장에 다 보인다. 오늘 카드 3장이 이미 후보로 들어 있고 기본값(30분 뒤, 한 곳만)이 골라져 있어
//       빠른 투표는 "친구랑 정하기 → 만들고 보내기 → 카카오톡" 3탭. 바꾸고 싶은 사람만 그 자리에서 바꾼다.
// 시트: 머리(눈썹 + 투표 제목 세리프 30 + "제목 바꾸기") → 후보 목록(빼기, "후보 더 넣기" 펼침: 오늘 추천, 즐겨찾기, 최근 간 곳)
//       → 마감 칩 + 절대 시각 한 줄 → 고르는 방식 → 후보 이름 기준 → 하단 고정 "만들고 보내기"(올리브 면 하나).
// 만든 뒤: 같은 시트가 보내기 단계로 바뀐다(성공 표시 + "투표방을 만들었어요", 미리보기, 카카오톡 / 다른 앱 / 링크 복사).
// 후보 추가 경로: 시트 안 펼침 목록(즐겨찾기, 최근 간 곳은 place_id로 저장된 것을 세션 이름으로 보여 줌, T5.12a).
//       지도는 "지도에서 고르기"로 지도 탭에 넘어가 고른 뒤 돌아온다(시안은 자리만).
// 모션: 시트 slow 300 enter, 펼침 목록과 새 후보 줄 base 페이드, 보내기 단계 전환 시 성공 표시 slow. 축소 모드는 즉시.
import { ChevronDown } from "lucide-react";
import { useId, useRef, useState } from "react";
import { pollCreateLabCopy as copy } from "@/copy/design-lab-poll-create";
import type { MockPlace } from "@/features/design-lab/mock";
import { cn } from "@/lib/utils";
import {
  CANDIDATE_MAX,
  DETAIL_PLACE,
  FAVORITES,
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
  BlockHead,
  CandidateNote,
  CandidateRow,
  CandidateSkeleton,
  CandidatesEmpty,
  CountBadge,
  CreateButton,
  DeadlineField,
  InvitePreview,
  ModeField,
  PartyLine,
  PickRow,
  PollHome,
  PollSheet,
  SheetBody,
  SheetHead,
  SheetNotice,
  ShareActions,
  SuccessMark,
  TextButton,
  TitleInput,
  eyebrowOf,
  sheetStatus,
  useAnnounce,
  useDraft,
  type DraftApi,
} from "../shared";

type Phase = "home" | "compose" | "share";

export function PollCreateA({ p }: { p: PollCreateParams }) {
  const [entry, setEntry] = useState<PollEntry>(p.entry);
  const [phase, setPhase] = useState<Phase>(
    p.flow === "share" ? "share" : p.flow === "home" ? "home" : "compose",
  );
  // 진입점을 누를 때마다 그 진입점의 첫 값으로 새 시트를 연다
  const [round, setRound] = useState(0);
  const open = (e: PollEntry) => {
    setEntry(e);
    setRound((r) => r + 1);
    setPhase("compose");
  };

  return (
    <>
      <PollHome
        inert={phase !== "home"}
        onFriends={() => open("home")}
        onParty={() => open("party")}
      />
      {phase !== "home" ? (
        <SheetA
          key={round}
          p={{ ...p, entry }}
          phase={phase}
          pickOpen={p.flow === "pick"}
          onCreated={() => setPhase("share")}
          onClose={() => setPhase("home")}
        />
      ) : null}
    </>
  );
}

function SheetA({
  p,
  phase,
  pickOpen,
  onCreated,
  onClose,
}: {
  p: PollCreateParams;
  phase: Exclude<Phase, "home">;
  pickOpen: boolean;
  onCreated: () => void;
  onClose: () => void;
}) {
  const ids = useId();
  const now = nowMinutes(p.clock);
  const draft = useDraft(initialDraft(p));
  const status = sheetStatus(p);
  const [failed, setFailed] = useState(status === "saveError");
  const { announce, node } = useAnnounce();
  const eyebrow = eyebrowOf(p.entry, DETAIL_PLACE.name);

  if (phase === "share") {
    const at = deadlineAt(draft.draft, now);
    const time = at === null ? null : clockOf(at);
    return (
      <PollSheet labelledBy={`${ids}-t`} onClose={onClose} focusKey="share">
        {node}
        <SheetHead
          id={`${ids}-t`}
          eyebrow={draft.draft.title}
          title={copy.share.title}
          lead={<SuccessMark />}
          onClose={onClose}
          serifSize="heading"
          after={
            time ? (
              <p className="type-body-sm break-keep text-muted-foreground tabular-nums">
                {time.tomorrow
                  ? copy.share.bodyTomorrow(time.hhmm)
                  : copy.share.body(time.hhmm)}
              </p>
            ) : null
          }
        />
        <SheetBody className="gap-6">
          {status === "shareError" ? <SheetNotice kind="shareError" /> : null}
          <InvitePreview draft={draft.draft} now={now} />
          <div className="flex flex-col items-center gap-3">
            <ShareActions
              failed={status === "shareError"}
              onShared={announce}
            />
            <TextButton>{copy.share.goRoom}</TextButton>
          </div>
        </SheetBody>
      </PollSheet>
    );
  }

  const blocked =
    status === "offline" || status === "limit" || status === "loading";
  const ready = canCreate(draft.draft, now) && !blocked;

  return (
    <PollSheet
      labelledBy={`${ids}-t`}
      onClose={onClose}
      focusKey="compose"
      footer={
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
          <CreateButton
            label={failed ? copy.states.saveError.retry : copy.create.submit}
            disabled={!ready}
            onClick={() => {
              setFailed(false);
              onCreated();
            }}
          />
        </div>
      }
    >
      {node}
      <TitleHead
        id={`${ids}-t`}
        eyebrow={eyebrow}
        draft={draft}
        party={draft.draft.kind === "party"}
        onClose={onClose}
      />
      <SheetBody>
        <CandidatesBlock
          p={p}
          draft={draft}
          startOpen={pickOpen}
          announce={announce}
        />
        <DeadlineField draft={draft} now={now} />
        <ModeField draft={draft} />
        <AnchorLine />
      </SheetBody>
    </PollSheet>
  );
}

/** 머리: 눈썹 + 투표 제목(세리프 30) + 제목 바꾸기. 누르면 제목 자리가 입력으로 바뀐다 */
function TitleHead({
  id,
  eyebrow,
  draft,
  party,
  onClose,
}: {
  id: string;
  eyebrow: string;
  draft: DraftApi;
  party: boolean;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <SheetHead
      id={id}
      eyebrow={eyebrow}
      title={
        editing ? (
          <span className="sr-only">{copy.title.inputLabel}</span>
        ) : (
          draft.draft.title
        )
      }
      onClose={onClose}
      after={
        <div className="flex flex-col gap-2">
          {editing ? (
            <TitleInput
              draft={draft}
              inputRef={inputRef}
              onDone={() => setEditing(false)}
            />
          ) : (
            <TextButton
              onClick={() => {
                setEditing(true);
                requestAnimationFrame(() => inputRef.current?.focus());
              }}
            >
              {copy.title.edit}
            </TextButton>
          )}
          {party ? <PartyLine /> : null}
        </div>
      }
    />
  );
}

/** 후보 목록 + "후보 더 넣기" 펼침 */
function CandidatesBlock({
  p,
  draft,
  startOpen,
  announce,
}: {
  p: PollCreateParams;
  draft: DraftApi;
  startOpen: boolean;
  announce: (t: string) => void;
}) {
  const ids = useId();
  const [open, setOpen] = useState(startOpen || p.entry === "detail");
  const [fresh, setFresh] = useState<string | null>(null);
  const list = draft.draft.candidates;
  const full = list.length >= CANDIDATE_MAX;
  const status = sheetStatus(p);

  const toggle = (place: MockPlace) => {
    const has = list.some((c) => c.id === place.id);
    if (!has && full) return;
    draft.toggle(place);
    setFresh(has ? null : place.id);
    announce(
      has
        ? copy.candidates.removed(place.name)
        : copy.candidates.added(place.name),
    );
  };

  // 오늘 추천은 홈에서 연 빠른 투표면 이미 들어 있어 펼침 목록에서 뺀다
  const groups: { title: string; places: readonly MockPlace[] }[] = [
    ...(p.entry === "home"
      ? []
      : [{ title: copy.candidates.fromToday, places: TODAY }]),
    { title: copy.candidates.favorites, places: FAVORITES },
    { title: copy.candidates.recent, places: RECENT },
  ];

  return (
    <section aria-labelledby={`${ids}-h`} className="flex flex-col gap-2">
      <BlockHead
        id={`${ids}-h`}
        title={copy.candidates.title}
        aside={status === "loading" ? null : <CountBadge n={list.length} />}
      />
      {status === "loading" ? (
        <CandidateSkeleton />
      ) : status === "empty" ? (
        <CandidatesEmpty />
      ) : (
        <>
          <ul className="flex flex-col">
            {list.map((c) => (
              <CandidateRow
                key={c.id}
                place={c}
                fresh={fresh === c.id}
                onRemove={() => toggle(c)}
              />
            ))}
          </ul>
          <CandidateNote count={list.length} />
          <button
            type="button"
            aria-expanded={open}
            aria-controls={`${ids}-more`}
            onClick={() => setOpen((v) => !v)}
            className="flex min-h-11 w-fit items-center gap-1.5 rounded-sm type-label text-foreground underline decoration-border underline-offset-4 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
          >
            {open ? copy.candidates.addClose : copy.candidates.add}
            <ChevronDown
              aria-hidden
              className={cn(
                "size-4 text-muted-foreground transition-transform duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
                open && "rotate-180",
              )}
              strokeWidth={1.5}
            />
          </button>
          {open ? (
            <div
              id={`${ids}-more`}
              className="flex flex-col gap-4 rounded-card border border-border bg-card px-4 pt-3 pb-2 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)]"
            >
              {groups.map((g) => (
                <div key={g.title} className="flex flex-col">
                  <h4 className="type-caption text-muted-foreground">
                    {g.title}
                  </h4>
                  <ul className="flex flex-col">
                    {g.places.map((place) => (
                      <PickRow
                        key={place.id}
                        place={place}
                        picked={list.some((c) => c.id === place.id)}
                        full={full}
                        onToggle={() => toggle(place)}
                      />
                    ))}
                  </ul>
                </div>
              ))}
              <TextButton className="mb-1">
                {copy.candidates.fromMap}
              </TextButton>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
