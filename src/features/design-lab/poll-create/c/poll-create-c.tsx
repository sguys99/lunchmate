"use client";
// 투표 만들기 시안 C "먼저 만들고 고치기" (T7.2).
//
// 의도: 묻지 않고 만든다. "친구랑 정하기"를 누르는 순간 기본값(오늘 카드 3장, 30분 뒤, 한 곳만, "○요일 점심")으로
//       투표방이 생기고, 시트는 곧 보내기 화면이다. 빠른 투표는 "친구랑 정하기 → 카카오톡" 2탭.
//       바꾸고 싶은 사람만 항목 줄(제목, 마감, 후보, 방식, D-11 C 항목 줄과 같은 문법)을 눌러 그 자리에서 고친다.
//       고친 내용은 이미 만든 투표방에 바로 반영한다(보내기 전이면 링크 미리보기에도 반영).
// 실수로 만든 경우: 머리 아래 "만들기 취소"(투표방을 지우고 하루 한도에서도 뺀다, 안건).
// 후보 추가 경로: 후보 줄을 펼치면 넣은 후보(빼기) + 즐겨찾기, 최근 간 곳 넣기. 투표방 안에서도 넣을 수 있다(T7.1 화면).
//       상세에서 열면 그 식당 + 오늘 추천 두 곳으로 만든다(후보 2곳 이상이어야 바로 만들 수 있으므로).
// 모션: 시트 slow 300 enter + 성공 표시 slow, 항목 줄 펼침 base 페이드. 축소 모드는 즉시.
import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { focusRing } from "@/components/ui/interaction";
import { pollCreateLabCopy as copy } from "@/copy/design-lab-poll-create";
import type { MockPlace } from "@/features/design-lab/mock";
import { cn } from "@/lib/utils";
import {
  CANDIDATE_MAX,
  DETAIL_PLACE,
  FAVORITES,
  RECENT,
  TODAY,
  clockOf,
  deadlineAt,
  initialDraft,
  nowMinutes,
  type PollDraft,
} from "../mock";
import type { PollCreateParams, PollEntry, PollField } from "../params";
import {
  CandidateNote,
  CandidateRow,
  CandidateSkeleton,
  CandidatesEmpty,
  CreateButton,
  DeadlineField,
  InvitePreview,
  ModeField,
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
  AnchorLine,
  buttonClass,
  deadlineLabel,
  deadlineSentence,
  eyebrowOf,
  sheetStatus,
  useAnnounce,
  useDraft,
  type DraftApi,
} from "../shared";

export function PollCreateC({ p }: { p: PollCreateParams }) {
  const [entry, setEntry] = useState<PollEntry>(p.entry);
  const [open, setOpen] = useState(p.flow !== "home");
  const [round, setRound] = useState(0);
  const { announce, node } = useAnnounce();
  const start = (e: PollEntry) => {
    setEntry(e);
    setRound((r) => r + 1);
    setOpen(true);
  };
  return (
    <>
      {node}
      <PollHome
        inert={open}
        onFriends={() => start("home")}
        onParty={() => start("party")}
      />
      {open ? (
        <SheetC
          key={round}
          p={{ ...p, entry }}
          onClose={() => setOpen(false)}
          onUndo={() => {
            setOpen(false);
            announce(copy.instant.undone);
          }}
        />
      ) : null}
    </>
  );
}

/** C의 첫 값: 상세에서 열면 그 식당 + 오늘 추천 두 곳 */
function initialC(p: PollCreateParams): PollDraft {
  const d = initialDraft(p);
  if (p.entry === "detail" && d.candidates.length > 0) {
    const rest = TODAY.filter((t) => t.id !== DETAIL_PLACE.id).slice(0, 2);
    return { ...d, candidates: [DETAIL_PLACE, ...rest] };
  }
  return d;
}

function SheetC({
  p,
  onClose,
  onUndo,
}: {
  p: PollCreateParams;
  onClose: () => void;
  onUndo: () => void;
}) {
  const ids = useId();
  const now = nowMinutes(p.clock);
  const draft = useDraft(initialC(p));
  const status = sheetStatus(p);
  const [failed, setFailed] = useState(status === "saveError");
  const [editing, setEditing] = useState<PollField | null>(
    p.flow === "edit" ? p.field : null,
  );
  const { announce, node } = useAnnounce();

  // 만들어진 상태인가: 기본 화면과 공유 실패. 만드는 중, 실패, 한도, 오프라인, 후보 없음은 아직 없다
  // 실패 화면에서 "다시 만들기"를 누르면 만들어진 상태로 넘어간다
  const created =
    (status === "ready" || status === "shareError" || status === "saveError") &&
    !failed;
  const eyebrow = eyebrowOf(p.entry, DETAIL_PLACE.name);

  const footer = created ? (
    <ShareActions failed={status === "shareError"} onShared={announce} />
  ) : status === "limit" ? (
    <button type="button" className={cn(buttonClass("secondary"), "w-full")}>
      {copy.states.limit.goList}
    </button>
  ) : (
    <CreateButton
      label={failed ? copy.states.saveError.retry : copy.create.submitPlain}
      disabled={status !== "saveError" || draft.draft.candidates.length < 2}
      onClick={() => setFailed(false)}
    />
  );

  return (
    <PollSheet
      labelledBy={`${ids}-t`}
      onClose={onClose}
      focusKey={created ? "created" : status}
      footer={footer}
    >
      {node}
      <SheetHead
        id={`${ids}-t`}
        eyebrow={eyebrow}
        title={
          created
            ? copy.instant.title
            : status === "loading"
              ? copy.instant.creating
              : copy.instant.notCreated
        }
        lead={created ? <SuccessMark /> : null}
        serifSize="heading"
        onClose={onClose}
        after={
          created ? (
            <div className="flex flex-col items-start gap-1">
              <p className="type-body-sm break-keep text-muted-foreground">
                {p.entry === "detail"
                  ? copy.instant.detailFilled
                  : copy.instant.body}
              </p>
              <TextButton onClick={onUndo}>{copy.instant.undo}</TextButton>
            </div>
          ) : null
        }
      />
      <SheetBody className="gap-6">
        {failed ? (
          <SheetNotice kind="saveError" />
        ) : status === "limit" || status === "offline" ? (
          <SheetNotice kind={status} />
        ) : status === "shareError" ? (
          <SheetNotice kind="shareError" />
        ) : null}

        {status === "loading" ? (
          <CandidateSkeleton rows={4} />
        ) : status === "empty" ? (
          <CandidatesEmpty />
        ) : status === "limit" ? null : (
          <Rows
            draft={draft}
            now={now}
            editing={editing}
            readOnly={!created}
            onEdit={(f) => setEditing(f)}
            onDone={() => {
              setEditing(null);
              announce(copy.instant.saved);
            }}
            announce={announce}
          />
        )}

        {created ? (
          <InvitePreview draft={draft.draft} now={now} compact />
        ) : null}
      </SheetBody>
    </PollSheet>
  );
}

/** 항목 줄 4개. 하나만 펼친다(펼친 줄 안에 편집기 + "다 고쳤어요") */
function Rows({
  draft,
  now,
  editing,
  readOnly,
  onEdit,
  onDone,
  announce,
}: {
  draft: DraftApi;
  now: number;
  editing: PollField | null;
  readOnly: boolean;
  onEdit: (f: PollField | null) => void;
  onDone: () => void;
  announce: (t: string) => void;
}) {
  const d = draft.draft;
  const rows: { field: PollField; label: string; value: ReactNode }[] = [
    { field: "title", label: copy.instant.rows.title, value: d.title },
    {
      field: "deadline",
      label: copy.instant.rows.deadline,
      value: <DeadlineValue draft={d} now={now} />,
    },
    {
      field: "candidates",
      label: copy.instant.rows.candidates,
      value: (
        <span className="flex min-w-0 flex-col">
          <span className="tabular-nums">
            {copy.candidates.count(d.candidates.length)}
          </span>
          <span className="truncate type-caption text-muted-foreground">
            {d.candidates.map((c) => c.name).join(", ")}
          </span>
        </span>
      ),
    },
    {
      field: "mode",
      label: copy.instant.rows.mode,
      value: d.multi ? copy.mode.multi : copy.mode.single,
    },
  ];

  return (
    <div className="flex flex-col">
      <ul className="flex flex-col border-y border-border">
        {rows.map((r) => (
          <Row
            key={r.field}
            label={r.label}
            value={r.value}
            open={editing === r.field}
            readOnly={readOnly}
            onToggle={() => onEdit(editing === r.field ? null : r.field)}
          >
            {r.field === "title" ? (
              <TitleInput draft={draft} />
            ) : r.field === "deadline" ? (
              <DeadlineField draft={draft} now={now} headless />
            ) : r.field === "candidates" ? (
              <CandidateEditor draft={draft} announce={announce} />
            ) : (
              <ModeField draft={draft} />
            )}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={onDone}
                className={buttonClass("secondary", "sm")}
              >
                {copy.instant.done}
              </button>
            </div>
          </Row>
        ))}
      </ul>
      <div className="pt-4">
        <AnchorLine compact />
      </div>
    </div>
  );
}

/** 마감 줄 값: "30분 뒤 11:35". 칩 이름에 시각이 들어 있으면(11:30, 내일 12:00) 이름만 */
function DeadlineValue({ draft, now }: { draft: PollDraft; now: number }) {
  const at = deadlineAt(draft, now);
  const label = deadlineLabel(draft.deadline, draft.kind);
  if (at === null)
    return (
      <span className="text-destructive">{deadlineSentence(draft, now)}</span>
    );
  const { hhmm, tomorrow } = clockOf(at);
  const showTime = !label.includes(":");
  return (
    <span className="tabular-nums">
      {draft.deadline === "custom"
        ? tomorrow
          ? copy.deadline.tomorrowAt(hhmm)
          : hhmm
        : label}
      {showTime && draft.deadline !== "custom" ? (
        <span className="text-muted-foreground"> {hhmm}</span>
      ) : null}
    </span>
  );
}

function Row({
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
          className="flex flex-col gap-4 pb-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)]"
        >
          {children}
        </div>
      ) : null}
    </li>
  );
}

/** 후보 줄 펼침: 넣은 후보(빼기) + 즐겨찾기, 최근 간 곳 넣기 */
function CandidateEditor({
  draft,
  announce,
}: {
  draft: DraftApi;
  announce: (t: string) => void;
}) {
  const list = draft.draft.candidates;
  const full = list.length >= CANDIDATE_MAX;
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
  const extra = [...FAVORITES, ...RECENT].filter(
    (pl) => !list.some((c) => c.id === pl.id),
  );
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col">
        {list.map((c) => (
          <CandidateRow key={c.id} place={c} onRemove={() => toggle(c)} />
        ))}
      </ul>
      <CandidateNote count={list.length} />
      <div className="flex flex-col rounded-card border border-border bg-card px-4 pt-3 pb-1">
        <p className="type-caption text-muted-foreground">
          {copy.candidates.favorites}, {copy.candidates.recent}
        </p>
        <ul className="flex flex-col">
          {extra.slice(0, 4).map((pl) => (
            <PickRow
              key={pl.id}
              place={pl}
              picked={false}
              full={full}
              onToggle={() => toggle(pl)}
            />
          ))}
        </ul>
      </div>
      <p className="type-caption break-keep text-muted-foreground">
        {copy.instant.addInRoom}
      </p>
    </div>
  );
}
