"use client";
// 회식 모드 시안 A "조건 한 장" (T7.3).
//
// 의도: 총무가 조건 넷을 한 화면에서 훑고 한 번에 찾는다. 설정 목록처럼 가는 선으로 나눈 조건 칸 넷
//       (인원 스테퍼, 1인 예산 슬라이더, 조건 칩 둘, 기준 위치) → 하단 "후보 찾기" → 번호 목록 5곳.
// 결과: 번호 원(지도 핀과 같은 모양) + 카테고리 + 세리프 식당명 + 숫자 3칸 + 근거 줄(조건마다 한 줄). 카드 대신 가는 선 목록.
//       하단 고정 "이 후보로 투표 만들기"(PARTY-05). 줄에 손을 올리거나 포커스하면 데스크톱 지도 핀이 올리브로.
// 모션: 결과 줄 stagger 70ms 페이드(base, enter), 핀 강조 fast. 축소 모드면 즉시.
import { useId, useState } from "react";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { partyLabCopy as copy } from "@/copy/design-lab-party";
import { cn } from "@/lib/utils";
import {
  DEFAULT_CONDITIONS,
  candidatesFor,
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
  staggerStyle,
  textLinkClass,
} from "../shared";

export function PartyA({ p }: { p: PartyParams }) {
  const forcedResults =
    p.state === "loading" || p.state === "empty" || p.state === "error";
  const [view, setView] = useState<"form" | "results">(
    forcedResults ? "results" : p.view,
  );
  const [cond, setCond] = useState<PartyConditions>(DEFAULT_CONDITIONS);
  const [active, setActive] = useState(p.active);
  const [note, setNote] = useState("");
  const candidates = candidatesFor(p, cond);
  const loading = p.state === "loading";

  const map = (
    <DesktopMap
      candidates={view === "results" && p.state === "ready" ? candidates : []}
      active={active}
      onPick={setActive}
      loading={loading}
    />
  );

  return (
    <PartyFrame map={map}>
      {view === "form" ? (
        <FormA
          cond={cond}
          setCond={setCond}
          offline={p.state === "offline"}
          onFind={() => setView("results")}
        />
      ) : (
        <PartyColumn busy={loading}>
          <PartyHeader
            title={
              p.state === "ready" || p.state === "offline"
                ? copy.head.titleResultsCount(
                    p.state === "offline" ? 5 : candidates.length,
                  )
                : copy.head.title
            }
            showFixed={false}
          />
          <SummaryA cond={cond} onChange={() => setView("form")} />
          {p.state === "loading" ? (
            <div className="mt-6">
              <LoadingNote />
              <CandidateSkeletonList />
            </div>
          ) : p.state === "empty" ? (
            <div className="mt-6">
              <PartyEmpty onAction={() => setView("form")} />
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
                aria-label={copy.matrix.caption}
                className="mt-4 flex flex-col"
              >
                {candidates.map((c, i) => (
                  <li
                    key={c.id}
                    style={staggerStyle(i)}
                    onPointerEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    className={cn(
                      "grid grid-cols-[1.75rem_1fr] gap-x-4 border-b border-border py-6 last:border-b-0",
                      enterClass,
                    )}
                  >
                    <PinNumber
                      n={i + 1}
                      active={i === active}
                      className="mt-0.5"
                    />
                    <div className="flex min-w-0 flex-col">
                      <CategoryLine c={c} withIcon={false} />
                      <h2 className="mt-1 type-heading break-keep text-foreground">
                        <span className="sr-only">{i + 1}번 </span>
                        {c.name}
                      </h2>
                      <CandidateNumbers c={c} className="mt-4" />
                      <EvidenceList
                        items={evidenceFor(c, cond)}
                        name={c.name}
                        className="mt-4"
                      />
                    </div>
                  </li>
                ))}
              </ol>
              {p.few ? (
                <FewNote
                  count={candidates.length}
                  onAction={() => setView("form")}
                />
              ) : null}
              <EvidenceLegend className="mt-6" />
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
      )}
    </PartyFrame>
  );
}

/* ---------- 조건 한 장 ---------- */

function FormA({
  cond,
  setCond,
  offline,
  onFind,
}: {
  cond: PartyConditions;
  setCond: (c: PartyConditions) => void;
  offline: boolean;
  onFind: () => void;
}) {
  const ids = {
    headcount: useId(),
    conditions: useId(),
    conditionsHint: useId(),
  };
  const toggles = [
    ...(cond.room ? ["room"] : []),
    ...(cond.alcohol ? ["alcohol"] : []),
  ];
  return (
    <PartyColumn>
      <PartyHeader title={copy.head.title} />
      <form
        className="mt-6 flex flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          if (!offline) onFind();
        }}
      >
        <div className="flex flex-col divide-y divide-border border-y border-border">
          <section className="flex items-center justify-between gap-4 py-5">
            <h2 id={ids.headcount} className="type-label text-foreground">
              {copy.fields.headcount}
            </h2>
            <HeadcountStepper
              value={cond.headcount}
              onChange={(headcount) => setCond({ ...cond, headcount })}
              labelledBy={ids.headcount}
            />
          </section>
          <section className="py-5">
            <BudgetSlider
              value={cond.budget}
              onChange={(budget) => setCond({ ...cond, budget })}
            />
          </section>
          <section className="py-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id={ids.conditions} className="type-label text-foreground">
                {copy.fields.conditions}
              </h2>
            </div>
            <ChipGroup
              multiple
              aria-labelledby={ids.conditions}
              aria-describedby={ids.conditionsHint}
              value={toggles}
              onValueChange={(v: string[]) =>
                setCond({
                  ...cond,
                  room: v.includes("room"),
                  alcohol: v.includes("alcohol"),
                })
              }
              className="mt-3"
            >
              <Chip value="room">{copy.fields.room}</Chip>
              <Chip value="alcohol">{copy.fields.alcohol}</Chip>
            </ChipGroup>
            <p
              id={ids.conditionsHint}
              className="mt-3 type-caption text-muted-foreground"
            >
              {copy.fields.conditionsHint}
            </p>
          </section>
          <section className="flex items-center justify-between gap-4 py-3">
            <h2 className="type-label text-foreground">{copy.fields.anchor}</h2>
            <p className="flex items-center gap-3">
              <span className="type-body text-foreground">
                {copy.fields.anchorValue}
              </span>
              <button
                type="button"
                aria-label={copy.fields.anchorChangeLabel}
                className={textLinkClass}
              >
                {copy.fields.anchorChange}
              </button>
            </p>
          </section>
        </div>
        <BottomAction note={offline ? <OfflineFormLine /> : null}>
          <button
            type="submit"
            aria-disabled={offline || undefined}
            className={cn(buttonClass("primary"), "w-full")}
          >
            {copy.actions.find}
          </button>
        </BottomAction>
      </form>
    </PartyColumn>
  );
}

function SummaryA({
  cond,
  onChange,
}: {
  cond: PartyConditions;
  onChange: () => void;
}) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-4">
        <p className="min-w-0 type-body-sm text-foreground">
          <span className="sr-only">{copy.summary.label}: </span>
          {conditionTokens(cond).join(", ")}
        </p>
        <button
          type="button"
          onClick={onChange}
          className={cn(textLinkClass, "shrink-0")}
        >
          {copy.summary.change}
        </button>
      </div>
      <p className="type-body-sm text-muted-foreground">{copy.head.fixed}</p>
    </div>
  );
}
