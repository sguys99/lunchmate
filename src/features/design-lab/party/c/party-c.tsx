"use client";
// 회식 모드 시안 C "결과 먼저" (T7.3).
//
// 의도: 입력 화면을 거치지 않는다. 지난번 조건(처음이면 기본값)으로 바로 후보 5곳과 지도를 보여 주고,
//       맨 위 조건 문장의 낱말(8명, 1인 4만 원, 룸/단체석, 주류)을 누르면 그 조건 하나만 그 자리에서 고친다.
//       회식 모드도 홈처럼 "열자마자 답"이라는 10초 원칙을 따른다.
// 지도: 모바일은 조건 문장 아래 띠 지도(번호 핀 5개, 회사, 도보 15분 원), 데스크톱은 오른쪽 칸. 핀과 줄이 서로를 강조한다.
// 목록: 줄마다 체크 "투표에 넣기"(기본 5곳 모두). 하단 "N곳으로 투표 만들기"는 고른 수를 따라 바뀌고 2곳 미만이면 꺼진다(POLL-01 후보 2~5).
// 모션: 고치기 칸 높이 base(AutoHeight), 조건을 바꾸면 목록이 페이드로 다시 들어옴(stagger 70), 핀 강조 fast. 축소 모드면 즉시.
import { useState, type ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { focusRing } from "@/components/ui/interaction";
import { partyLabCopy as copy } from "@/copy/design-lab-party";
import { AutoHeight } from "@/features/design-lab/home/shared/yesterday";
import { cn } from "@/lib/utils";
import {
  DEFAULT_CONDITIONS,
  candidatesFor,
  evidenceFor,
  unknownShare,
  type PartyConditions,
} from "../mock";
import type { PartyEditField, PartyParams } from "../params";
import {
  BottomAction,
  BudgetSlider,
  CandidateNumbers,
  CandidateSkeletonList,
  CategoryLine,
  ColdNote,
  DesktopMap,
  EvidenceLegend,
  EvidenceList,
  FewNote,
  HeadcountStepper,
  LiveNote,
  LoadingNote,
  PartyColumn,
  PartyEmpty,
  PartyError,
  PartyFrame,
  PartyHeader,
  PartyMap,
  PartyOffline,
  PinNumber,
  buttonClass,
  enterClass,
  staggerStyle,
} from "../shared";

export function PartyC({ p }: { p: PartyParams }) {
  const [cond, setCond] = useState<PartyConditions>(DEFAULT_CONDITIONS);
  const [draft, setDraft] = useState<PartyConditions>(DEFAULT_CONDITIONS);
  const [edit, setEdit] = useState<PartyEditField | null>(p.edit);
  const [active, setActive] = useState(p.active);
  const [round, setRound] = useState(0);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const candidates = candidatesFor(p, cond);
  const picked = candidates.filter((c) => !excluded.includes(c.id));
  const ready = p.state === "ready";

  const openEdit = (f: PartyEditField) => {
    setDraft(cond);
    setEdit(edit === f ? null : f);
  };
  const apply = () => {
    setCond(draft);
    setEdit(null);
    setRound((r) => r + 1);
    setExcluded([]);
    setNote(copy.lab.applied);
  };

  const pins = ready ? candidates : [];

  return (
    <PartyFrame
      map={
        <DesktopMap
          candidates={pins}
          active={active}
          onPick={setActive}
          loading={p.state === "loading"}
        />
      }
    >
      <PartyColumn busy={p.state === "loading"}>
        <PartyHeader
          title={
            ready
              ? copy.head.titleResultsCount(candidates.length)
              : copy.head.title
          }
        />

        <Sentence cond={cond} edit={edit} onOpen={openEdit} />
        <AutoHeight>
          {edit ? (
            <Editor
              field={edit}
              draft={draft}
              setDraft={setDraft}
              onApply={apply}
              onClose={() => setEdit(null)}
            />
          ) : null}
        </AutoHeight>

        <div className="mt-5 desktop:hidden">
          <PartyMap
            compact
            candidates={pins}
            active={active}
            onPick={setActive}
            loading={p.state === "loading"}
            className="h-40 min-h-40 flex-none rounded-card border border-border"
          />
        </div>

        {p.state === "loading" ? (
          <div className="mt-4">
            <LoadingNote />
            <CandidateSkeletonList />
          </div>
        ) : p.state === "empty" ? (
          <div className="mt-6">
            <PartyEmpty onAction={() => openEdit("budget")} />
          </div>
        ) : p.state === "error" ? (
          <div className="mt-6">
            <PartyError onRetry={() => setNote(copy.lab.retried)} />
          </div>
        ) : p.state === "offline" ? (
          <div className="mt-6">
            <PartyOffline />
          </div>
        ) : (
          <>
            {p.cold || unknownShare(candidates, cond) > 0.6 ? (
              <ColdNote className="mt-6" />
            ) : null}
            <ol
              key={round}
              aria-label={copy.matrix.caption}
              className="mt-2 flex flex-col"
            >
              {candidates.map((c, i) => {
                const included = !excluded.includes(c.id);
                return (
                  <li
                    key={c.id}
                    style={staggerStyle(i)}
                    className={cn(
                      "grid grid-cols-[1.75rem_1fr_auto] items-start gap-x-3 border-b border-border py-5 last:border-b-0",
                      enterClass,
                    )}
                  >
                    <PinNumber
                      n={i + 1}
                      active={i === active}
                      className="mt-1"
                    />
                    <div className="flex min-w-0 flex-col">
                      <button
                        type="button"
                        aria-pressed={i === active}
                        onClick={() => setActive(i)}
                        className={cn(
                          "flex flex-col items-start rounded-sm text-left",
                          focusRing,
                        )}
                      >
                        <CategoryLine c={c} withIcon={false} />
                        <span className="mt-1 type-heading break-keep text-foreground">
                          {c.name}
                        </span>
                      </button>
                      <CandidateNumbers c={c} className="mt-3" />
                      <EvidenceList
                        items={evidenceFor(c, cond)}
                        name={c.name}
                        className="mt-3"
                      />
                    </div>
                    <label className="flex min-h-11 min-w-11 cursor-pointer items-start justify-end pt-1">
                      <Checkbox
                        checked={included}
                        aria-label={copy.candidate.includeLabel(c.name)}
                        onCheckedChange={(v) =>
                          setExcluded((xs) =>
                            v ? xs.filter((x) => x !== c.id) : [...xs, c.id],
                          )
                        }
                      />
                    </label>
                  </li>
                );
              })}
            </ol>
            {p.few ? (
              <FewNote
                count={candidates.length}
                onAction={() => openEdit("budget")}
              />
            ) : null}
            <EvidenceLegend className="mt-6" />
            <BottomAction
              note={
                picked.length < 2 ? (
                  <p
                    role="status"
                    className="mb-3 type-body-sm text-muted-foreground"
                  >
                    {copy.actions.createPollMin}
                  </p>
                ) : null
              }
            >
              <button
                type="button"
                aria-disabled={picked.length < 2 || undefined}
                onClick={() =>
                  picked.length >= 2 && setNote(copy.actions.createdNotice)
                }
                className={cn(buttonClass("primary"), "w-full")}
              >
                {copy.actions.createPollCount(picked.length)}
              </button>
            </BottomAction>
          </>
        )}
        <LiveNote message={note} />
      </PartyColumn>
    </PartyFrame>
  );
}

/* ---------- 조건 문장 ---------- */

const FIELD_NAME: Record<PartyEditField, string> = {
  people: copy.fields.headcount,
  budget: copy.fields.budget,
  room: copy.fields.room,
  alcohol: copy.fields.alcohol,
};

function Sentence({
  cond,
  edit,
  onOpen,
}: {
  cond: PartyConditions;
  edit: PartyEditField | null;
  onOpen: (f: PartyEditField) => void;
}) {
  const tokens: { f: PartyEditField; text: string; off?: boolean }[] = [
    { f: "people", text: copy.summary.headcount(cond.headcount) },
    { f: "budget", text: copy.summary.budget(cond.budget) },
    {
      f: "room",
      text: cond.room ? copy.summary.room : copy.summary.roomOff,
      off: !cond.room,
    },
    {
      f: "alcohol",
      text: cond.alcohol ? copy.summary.alcohol : copy.summary.alcoholOff,
      off: !cond.alcohol,
    },
  ];
  // 고칠 수 있는 낱말은 점선 밑줄(글자 버튼). 문장처럼 읽히고, 쉼표는 장식이라 스크린 리더에서 뺀다.
  return (
    <p className="mt-5 type-heading leading-[1.6] text-foreground">
      <span className="sr-only">{copy.summary.label}: </span>
      {tokens.map((t, i) => (
        <span key={t.f}>
          <button
            type="button"
            aria-expanded={edit === t.f}
            aria-controls="party-c-editor"
            aria-label={`${copy.summary.editLabel(FIELD_NAME[t.f])}, ${t.text}`}
            onClick={() => onOpen(t.f)}
            className={cn(
              "relative inline rounded-sm underline decoration-dashed decoration-1 underline-offset-[0.3em] transition-colors duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
              "before:absolute before:-inset-x-1 before:-inset-y-2.5",
              edit === t.f
                ? "text-primary decoration-primary decoration-solid decoration-[1.5px]"
                : t.off
                  ? "text-muted-foreground decoration-muted-foreground"
                  : "decoration-muted-foreground hover:decoration-foreground",
              focusRing,
            )}
          >
            {t.text}
          </button>
          {i < tokens.length - 1 ? <span aria-hidden>, </span> : null}
        </span>
      ))}
    </p>
  );
}

/* ---------- 조건 하나 고치기 ---------- */

function Editor({
  field,
  draft,
  setDraft,
  onApply,
  onClose,
}: {
  field: PartyEditField;
  draft: PartyConditions;
  setDraft: (c: PartyConditions) => void;
  onApply: () => void;
  onClose: () => void;
}) {
  let body: ReactNode;
  if (field === "people") {
    body = (
      <HeadcountStepper
        value={draft.headcount}
        onChange={(headcount) => setDraft({ ...draft, headcount })}
        labelledBy="party-c-editor-title"
      />
    );
  } else if (field === "budget") {
    body = (
      <BudgetSlider
        hideLabel
        label={copy.fields.budget}
        value={draft.budget}
        onChange={(budget) => setDraft({ ...draft, budget })}
      />
    );
  } else {
    const key = field;
    const on = draft[key];
    body = (
      <ChipGroup
        aria-labelledby="party-c-editor-title"
        value={[on ? "on" : "off"]}
        onValueChange={(v: string[]) => {
          if (v[0]) setDraft({ ...draft, [key]: v[0] === "on" });
        }}
      >
        <Chip value="on">
          {key === "room" ? copy.questions.roomYes : copy.questions.alcoholYes}
        </Chip>
        <Chip value="off">
          {key === "room" ? copy.questions.roomNo : copy.questions.alcoholNo}
        </Chip>
      </ChipGroup>
    );
  }
  const hint =
    field === "room"
      ? copy.questions.roomYesHint
      : field === "alcohol"
        ? copy.questions.alcoholYesHint
        : null;
  return (
    <section
      id="party-c-editor"
      aria-labelledby="party-c-editor-title"
      className="mt-3 rounded-card border border-border bg-card px-5 pt-4 pb-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="party-c-editor-title" className="type-label text-foreground">
          {FIELD_NAME[field]}
        </h2>
        {field === "budget" ? (
          <span className="type-numeric-md text-foreground">
            {copy.fields.budgetValue(draft.budget)}
          </span>
        ) : null}
      </div>
      <div className="mt-3">{body}</div>
      {hint ? (
        <p className="mt-3 type-caption text-muted-foreground">{hint}</p>
      ) : null}
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className={buttonClass("ghost", "sm")}
        >
          {copy.summary.close}
        </button>
        <button
          type="button"
          onClick={onApply}
          className={buttonClass("secondary", "sm")}
        >
          {copy.summary.apply}
        </button>
      </div>
    </section>
  );
}
