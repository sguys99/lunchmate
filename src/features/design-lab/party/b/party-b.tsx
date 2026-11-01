"use client";
// 회식 모드 시안 B "한 질문씩, 나란히 비교" (T7.3).
//
// 의도: 조건은 대화처럼 한 번에 하나만 묻고(질문 넷, 화면마다 선택지 3개 이하), 결과는 후보 5곳을 조건 칸으로 나란히 놓은
//       비교표로 보여 준다. 총무가 "어디가 룸 근거가 있고 어디가 정보 없음인지"를 한눈에 가른다.
// 질문: 몇 명이 가나요?(큰 숫자 스테퍼 + 자주 쓰는 인원 칩) → 1인 예산은 얼마인가요?(큰 금액 + 칩 3 + 슬라이더)
//       → 룸이나 단체석이 필요한가요?(두 줄 고르기) → 술도 함께하나요?(두 줄 고르기). 맨 위 진행 막대 4칸.
// 결과: 표(후보 | 예산 | 자리 | 주류). 칸은 근거 표시(체크 / 점선 체크 / 줄), 예산은 가격대 숫자.
//       줄을 누르면 그 아래로 숫자 3칸과 근거 문장, 네이버 플레이스 링크가 펼쳐진다. 하단 "이 후보로 투표 만들기".
// 모션: 질문 바뀜 4px 옆에서 페이드(base, enter), 진행 막대 채움 fast, 펼침 높이 base. 축소 모드면 즉시.
import { Check } from "lucide-react";
import { Fragment, useId, useState, type ReactNode } from "react";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { focusRing } from "@/components/ui/interaction";
import { partyLabCopy as copy } from "@/copy/design-lab-party";
import { formatShortWon, priceBandParts } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  DEFAULT_CONDITIONS,
  QUICK_BUDGETS,
  QUICK_HEADCOUNTS,
  candidatesFor,
  displayPrice,
  evidenceFor,
  unknownShare,
  type PartyConditions,
} from "../mock";
import type { PartyParams } from "../params";
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
  EvidenceMark,
  FewNote,
  HeadcountStepper,
  LiveNote,
  LoadingNote,
  OfflineFormLine,
  PartyColumn,
  PartyEmpty,
  PartyError,
  PartyFrame,
  PartyHeader,
  PartyOffline,
  PinNumber,
  buttonClass,
  conditionTokens,
  enterClass,
  textLinkClass,
} from "../shared";

const TOTAL = 4;

export function PartyB({ p }: { p: PartyParams }) {
  const forcedResults =
    p.state === "loading" || p.state === "empty" || p.state === "error";
  const [view, setView] = useState<"form" | "results">(
    forcedResults ? "results" : p.view,
  );
  const [q, setQ] = useState<number>(p.q);
  const [cond, setCond] = useState<PartyConditions>(DEFAULT_CONDITIONS);
  const [open, setOpen] = useState(p.active >= 0 ? p.active : 0);
  const [note, setNote] = useState("");
  const candidates = candidatesFor(p, cond);

  const map = (
    <DesktopMap
      candidates={view === "results" && p.state === "ready" ? candidates : []}
      active={open}
      onPick={setOpen}
      loading={p.state === "loading"}
    />
  );

  if (view === "form") {
    return (
      <PartyFrame map={map}>
        <Questions
          q={q}
          setQ={setQ}
          cond={cond}
          setCond={setCond}
          offline={p.state === "offline"}
          onFind={() => setView("results")}
        />
      </PartyFrame>
    );
  }

  const columns: ("budget" | "room" | "alcohol")[] = [
    "budget",
    ...(cond.room ? (["room"] as const) : []),
    ...(cond.alcohol ? (["alcohol"] as const) : []),
  ];

  return (
    <PartyFrame map={map}>
      <PartyColumn busy={p.state === "loading"}>
        <PartyHeader
          title={
            p.state === "ready"
              ? copy.head.titleResultsCount(candidates.length)
              : copy.head.title
          }
          showFixed={false}
        />
        <p className="mt-4 flex flex-wrap items-center gap-x-3 type-body-sm text-foreground">
          <span className="sr-only">{copy.summary.label}: </span>
          <span>{conditionTokens(cond).join(", ")}</span>
          <button
            type="button"
            onClick={() => {
              setQ(1);
              setView("form");
            }}
            className={textLinkClass}
          >
            {copy.summary.changeShort}
          </button>
        </p>
        {p.state === "loading" ? (
          <div className="mt-6">
            <LoadingNote />
            <CandidateSkeletonList />
          </div>
        ) : p.state === "empty" ? (
          <div className="mt-6">
            <PartyEmpty
              onAction={() => {
                setQ(2);
                setView("form");
              }}
            />
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
            <table className="mt-6 w-full table-fixed border-collapse">
              <caption className="sr-only">{copy.matrix.caption}</caption>
              <colgroup>
                <col />
                <col className="w-[5.25rem]" />
                {columns.slice(1).map((k) => (
                  <col key={k} className="w-12" />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b border-border">
                  <th
                    scope="col"
                    className="pb-3 text-left type-caption font-medium text-muted-foreground"
                  >
                    {copy.matrix.place}
                  </th>
                  {columns.map((k) => (
                    <th
                      key={k}
                      scope="col"
                      className={cn(
                        "pb-3 type-caption font-medium text-muted-foreground",
                        k === "budget" ? "text-left" : "text-center",
                      )}
                    >
                      {copy.matrix[k]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => {
                  const ev = evidenceFor(c, cond);
                  const isOpen = open === i;
                  const price = displayPrice(c);
                  const band = priceBandParts(price.krw);
                  const detailId = `party-b-row-${c.id}`;
                  return (
                    <Fragment key={c.id}>
                      <tr
                        className={cn(
                          "border-border",
                          !isOpen && "border-b",
                          enterClass,
                        )}
                        style={{ animationDelay: `${i * 70}ms` }}
                      >
                        <th scope="row" className="py-1 text-left font-normal">
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-controls={detailId}
                            onClick={() => setOpen(isOpen ? -1 : i)}
                            className={cn(
                              "flex min-h-16 w-full items-center gap-3 rounded-md text-left",
                              focusRing,
                            )}
                          >
                            <PinNumber n={i + 1} active={isOpen} />
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate type-label text-foreground">
                                {c.name}
                              </span>
                              <span className="mt-0.5">
                                <CategoryLine c={c} withIcon={false} />
                              </span>
                            </span>
                          </button>
                        </th>
                        {columns.map((k) => {
                          if (k === "budget") {
                            return (
                              <td
                                key={k}
                                className="py-1 pl-3 whitespace-nowrap"
                              >
                                <span className="type-label text-foreground tabular-nums">
                                  {band.amount}
                                </span>
                                <span className="ml-0.5 type-caption text-muted-foreground">
                                  {band.unit.replace(" 원대", "")}
                                </span>
                                {price.estimate ? (
                                  <span className="block type-caption text-muted-foreground">
                                    {copy.candidate.estimate}
                                  </span>
                                ) : null}
                              </td>
                            );
                          }
                          const e = ev.find((x) => x.key === k);
                          return (
                            <td key={k} className="py-1 text-center">
                              {e ? (
                                <EvidenceMark
                                  status={e.status}
                                  withLabel
                                  className="mx-auto"
                                />
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                      <tr
                        id={detailId}
                        hidden={!isOpen}
                        className="border-b border-border"
                      >
                        <td colSpan={columns.length + 1} className="pb-5 pl-10">
                          <div className={enterClass}>
                            <CandidateNumbers c={c} />
                            <EvidenceList
                              items={ev}
                              name={c.name}
                              className="mt-4"
                            />
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-4 type-caption text-muted-foreground">
              {copy.matrix.expandHint}
            </p>
            <EvidenceLegend className="mt-2" />
            {p.few ? (
              <FewNote
                count={candidates.length}
                onAction={() => {
                  setQ(2);
                  setView("form");
                }}
              />
            ) : null}
            <BottomAction>
              <button
                type="button"
                onClick={() => setNote(copy.actions.createdNotice)}
                className={cn(buttonClass("primary"), "w-full")}
              >
                {copy.actions.createPoll}
              </button>
            </BottomAction>
          </>
        )}
        <LiveNote message={note} />
      </PartyColumn>
    </PartyFrame>
  );
}

/* ---------- 질문 ---------- */

function Questions({
  q,
  setQ,
  cond,
  setCond,
  offline,
  onFind,
}: {
  q: number;
  setQ: (n: number) => void;
  cond: PartyConditions;
  setCond: (c: PartyConditions) => void;
  offline: boolean;
  onFind: () => void;
}) {
  const titleId = useId();
  const question = [
    copy.questions.headcount,
    copy.questions.budget,
    copy.questions.room,
    copy.questions.alcohol,
  ][q - 1];
  const answered = conditionTokens(cond).slice(0, q - 1);
  const last = q === TOTAL;

  return (
    <PartyColumn>
      <header className="flex flex-col">
        <div className="-ml-3 flex h-12 items-center gap-3">
          <button
            type="button"
            aria-label={q > 1 ? copy.questions.prev : copy.head.back}
            onClick={() => q > 1 && setQ(q - 1)}
            className={cn(
              "inline-flex size-11 items-center justify-center rounded-full text-foreground hover:bg-muted",
              focusRing,
            )}
          >
            <BackIcon />
          </button>
          <div
            role="progressbar"
            aria-label={copy.questions.progress(q, TOTAL)}
            aria-valuemin={1}
            aria-valuemax={TOTAL}
            aria-valuenow={q}
            className="ml-auto flex w-28 gap-1.5"
          >
            {Array.from({ length: TOTAL }, (_, i) => (
              <span
                key={i}
                className="h-0.5 flex-1 overflow-hidden rounded-full bg-border"
              >
                <span
                  className={cn(
                    "block h-full origin-left bg-primary transition-transform duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
                    i < q ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </span>
            ))}
          </div>
        </div>
        <p className="mt-8 min-h-5 type-caption text-muted-foreground">
          {answered.length > 0 ? answered.join(", ") : copy.head.eyebrow}
        </p>
      </header>

      <section
        key={q}
        aria-labelledby={titleId}
        className={cn(
          "mt-2 flex flex-1 flex-col",
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)] motion-safe:[animation-timing-function:var(--lm-ease-enter)] motion-safe:slide-in-from-right-1",
        )}
      >
        <h1 id={titleId} className="type-title text-balance text-foreground">
          {question}
        </h1>
        {q === 1 ? (
          <p className="mt-2 type-body-sm text-muted-foreground">
            {copy.head.fixed}
          </p>
        ) : null}

        <div className="mt-10">
          {q === 1 ? (
            <div className="flex flex-col items-start gap-8">
              <HeadcountStepper
                large
                value={cond.headcount}
                onChange={(headcount) => setCond({ ...cond, headcount })}
                labelledBy={titleId}
              />
              <ChipGroup
                aria-label={copy.questions.quickHeadcount}
                value={
                  (QUICK_HEADCOUNTS as readonly number[]).includes(
                    cond.headcount,
                  )
                    ? [String(cond.headcount)]
                    : []
                }
                onValueChange={(v: string[]) => {
                  const n = Number(v[0]);
                  if (n) setCond({ ...cond, headcount: n });
                }}
              >
                {QUICK_HEADCOUNTS.map((n) => (
                  <Chip key={n} value={String(n)}>
                    {copy.fields.headcountValue(n)}
                  </Chip>
                ))}
              </ChipGroup>
            </div>
          ) : q === 2 ? (
            <div className="flex flex-col gap-8">
              <p aria-hidden className="flex items-baseline tabular-nums">
                <span className="text-[3.5rem] leading-none font-[450] tracking-[-0.03em] text-foreground">
                  {formatShortWon(cond.budget)
                    .replace(" 원", "")
                    .replace("원", "")}
                </span>
                <span className="ml-1 type-label text-muted-foreground">
                  {cond.budget >= 10_000 ? "원" : ""}
                </span>
              </p>
              <ChipGroup
                aria-label={copy.questions.quickBudget}
                value={
                  (QUICK_BUDGETS as readonly number[]).includes(cond.budget)
                    ? [String(cond.budget)]
                    : []
                }
                onValueChange={(v: string[]) => {
                  const n = Number(v[0]);
                  if (n) setCond({ ...cond, budget: n });
                }}
              >
                {QUICK_BUDGETS.map((n) => (
                  <Chip key={n} value={String(n)}>
                    {formatShortWon(n)}
                  </Chip>
                ))}
              </ChipGroup>
              <BudgetSlider
                hideLabel
                label={copy.fields.budget}
                value={cond.budget}
                onChange={(budget) => setCond({ ...cond, budget })}
              />
            </div>
          ) : q === 3 ? (
            <ChoiceRows
              labelledBy={titleId}
              value={cond.room}
              onChange={(room) => setCond({ ...cond, room })}
              yes={copy.questions.roomYes}
              yesHint={copy.questions.roomYesHint}
              no={copy.questions.roomNo}
            />
          ) : (
            <ChoiceRows
              labelledBy={titleId}
              value={cond.alcohol}
              onChange={(alcohol) => setCond({ ...cond, alcohol })}
              yes={copy.questions.alcoholYes}
              yesHint={copy.questions.alcoholYesHint}
              no={copy.questions.alcoholNo}
            />
          )}
        </div>
      </section>

      <BottomAction note={offline && last ? <OfflineFormLine /> : null}>
        <button
          type="button"
          aria-disabled={(offline && last) || undefined}
          onClick={() => {
            if (!last) setQ(q + 1);
            else if (!offline) onFind();
          }}
          className={cn(buttonClass("primary"), "w-full")}
        >
          {last ? copy.questions.find : copy.questions.next}
        </button>
      </BottomAction>
    </PartyColumn>
  );
}

function BackIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

/** 두 줄 고르기(라디오). 고른 줄은 테두리 1.5px 올리브 + 체크 */
function ChoiceRows({
  labelledBy,
  value,
  onChange,
  yes,
  yesHint,
  no,
}: {
  labelledBy: string;
  value: boolean;
  onChange: (v: boolean) => void;
  yes: string;
  yesHint: string;
  no: string;
}) {
  const row = (
    selected: boolean,
    label: string,
    hint: ReactNode,
    v: boolean,
  ) => (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onChange(v)}
      className={cn(
        "flex min-h-16 w-full items-center gap-4 rounded-lg border px-5 py-4 text-left transition-[border-color,box-shadow] duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
        selected
          ? "border-primary ring-[0.5px] ring-primary ring-inset"
          : "border-border hover:bg-muted",
        focusRing,
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "type-label",
            selected ? "text-primary" : "text-foreground",
          )}
        >
          {label}
        </span>
        {hint ? (
          <span className="mt-1 type-body-sm text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-full border",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input",
        )}
      >
        {selected ? <Check className="size-3.5" strokeWidth={2.5} /> : null}
      </span>
    </button>
  );
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="flex flex-col gap-3"
    >
      {row(value, yes, yesHint, true)}
      {row(!value, no, null, false)}
    </div>
  );
}
