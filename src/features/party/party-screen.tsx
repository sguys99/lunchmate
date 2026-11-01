"use client";
// 회식 모드 /poll/party (T7.25~T7.28, PARTY-01~05, D-16, DESIGN.md 5장 "회식 모드").
//
// 흐름: 기억된 조건이 없으면 첫 질문 2개(인원, 예산, B) → 결과. 있으면 바로 결과(C, 10초 원칙).
//   결과: 머리 + 조건 문장(낱말을 눌러 하나만 고침) + 기준 위치 + 모바일 지도 띠 + 후보 5곳(A 근거 줄) + "N곳으로 투표 만들기".
// 데이터: 사무실 핀(저장 값) 기준 도보 15분 카카오 FD6 반경 검색(세션 메모리) → place_stats 익명 집계 → rankParty(순수 함수).
//   현위치는 쓰지 않는다(기준점은 투표방 anchor가 되므로 저장 가능한 사무실 핀만, D-16 안건 9).
//   조건 4개만 기기에 남긴다(conditions.ts). 장소 이름과 좌표는 저장, 이벤트, 서버로 보내지 않는다(CLAUDE.md 7장).
// 상태: 설정 읽기 실패, 기준 위치 없음, 로딩(뼈대), 0곳, 5곳 미만, 콜드 스타트, 카카오 오류(래퍼 재시도 1회 뒤), 오프라인.
// 모션: CSS만. 고치기 칸 높이 base, 질문 바뀜 4px 페이드 base, 결과 stagger 70, 핀 강조 fast. 축소 모드면 즉시.
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Fragment,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { PageColumn, PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/states";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { focusRing } from "@/components/ui/interaction";
import { anchorPickerCopy } from "@/copy/anchor-picker";
import { partyCopy as copy } from "@/copy/party";
import { AnchorPickerLazy } from "@/features/map/anchor-picker-lazy";
import type { UserPinnedLatLng } from "@/features/onboarding/pin";
import { placeStatsAction } from "@/features/place/stats-actions";
import type { PlaceStats } from "@/features/place/place-stats-model";
import { openPollCreate } from "@/features/poll/create/intent";
import { pollTabHref } from "@/features/poll/routes";
import { sortOffices, type OfficeOption } from "@/features/rec/base-location";
import { toVisits } from "@/features/rec/history";
import { kakaoCategorySlug } from "@/features/rec/kakao-category";
import type { TodayData } from "@/features/rec/load-today";
import { formatShortWon } from "@/lib/format";
import { restaurantsInRadiusQuery } from "@/lib/kakao/queries";
import { useOnlineStatus } from "@/lib/network";
import { cn } from "@/lib/utils";
import {
  DEFAULT_CONDITIONS,
  PARTY_RADIUS_M,
  POLL_MIN_PLACES,
  QUICK_BUDGETS,
  QUICK_HEADCOUNTS,
  readSavedConditions,
  saveConditions,
  type PartyConditions,
} from "./conditions";
import { firstSearch, partyEvent, partySearched } from "./events";
import { PartyMapStrip } from "./party-map";
import { usePartyMap } from "./party-store";
import {
  BottomAction,
  BudgetSlider,
  CandidateNumbers,
  CandidateSkeletonList,
  CategoryLine,
  ColdNote,
  EvidenceLegend,
  EvidenceList,
  FewNote,
  HeadcountStepper,
  LiveNote,
  PartyEmpty,
  PartyError,
  PartyOffline,
  PinNumber,
  buttonClass,
  enterClass,
  staggerStyle,
} from "./parts";
import { COLD_SHARE, rankParty, unknownShare, type PartyPick } from "./rank";

type EditField = "people" | "budget" | "room" | "alcohol";
type Phase = "boot" | "ask" | "results";

const FIELD_NAME: Record<EditField, string> = {
  people: copy.fields.headcount,
  budget: copy.fields.budget,
  room: copy.fields.room,
  alcohol: copy.fields.alcohol,
};

export function PartyScreen({ data }: { data: TodayData }) {
  const router = useRouter();
  const online = useOnlineStatus();
  const offices = useMemo(() => sortOffices(data.offices), [data.offices]);
  const [officeId, setOfficeId] = useState<string | null>(
    offices[0]?.id ?? null,
  );
  // 지도에서 찍은 기준(D-16 안건 9). 사용자가 놓은 핀만, 이 화면 메모리에만 둔다(서버, 기기 저장 없음)
  const [picked, setPicked] = useState<UserPinnedLatLng | null>(null);
  const savedOffice: OfficeOption | null =
    offices.find((o) => o.id === officeId) ?? offices[0] ?? null;
  const office: OfficeOption | null = picked
    ? {
        id: `picked:${picked.lat.toFixed(5)},${picked.lng.toFixed(5)}`,
        name: copy.base.picked,
        isDefault: false,
        position: { lat: picked.lat, lng: picked.lng },
      }
    : savedOffice;

  const [phase, setPhase] = useState<Phase>("boot");
  const [step, setStep] = useState<1 | 2>(1);
  const [cond, setCond] = useState<PartyConditions>(DEFAULT_CONDITIONS);
  const [note, setNote] = useState("");

  // 기억된 조건은 브라우저에서만 읽는다(서버 렌더와 첫 화면을 맞추려고 마운트 뒤에 정한다)
  useEffect(() => {
    const saved = readSavedConditions();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장소는 브라우저 값이라 마운트 뒤 한 번 맞춘다
    if (saved) setCond(saved);
    setPhase(saved ? "results" : "ask");
  }, []);

  if (data.loadFailed) {
    return (
      <PartyColumn>
        <Header />
        <div className="mt-10">
          <PartyError
            withNaver={false}
            title={copy.states.loadFailedTitle}
            body={copy.states.loadFailedBody}
            action={copy.states.loadFailedAction}
            onRetry={() => router.refresh()}
          />
        </div>
      </PartyColumn>
    );
  }

  if (!office) {
    return (
      <PartyColumn>
        <Header />
        <EmptyState
          className="mt-10"
          title={copy.base.needTitle}
          body={copy.base.needBody}
          action={{
            label: copy.base.needAction,
            href: "/me/offices/new",
            variant: "primary",
          }}
        />
      </PartyColumn>
    );
  }

  if (phase === "boot") {
    return (
      <PartyColumn busy>
        <Header />
        <p className="sr-only">{copy.states.loading}</p>
        <CandidateSkeletonList />
      </PartyColumn>
    );
  }

  if (phase === "ask") {
    return (
      <Questions
        step={step}
        setStep={setStep}
        cond={cond}
        setCond={setCond}
        onFind={() => {
          saveConditions(cond);
          setPhase("results");
        }}
      />
    );
  }

  return (
    <Results
      data={data}
      online={online}
      offices={offices}
      office={office}
      onOffice={(id) => {
        setPicked(null);
        setOfficeId(id);
      }}
      onPickMap={setPicked}
      cond={cond}
      onApply={(next) => {
        setCond(next);
        saveConditions(next);
        setNote(copy.summary.applied);
      }}
      note={note}
    />
  );
}

function PartyColumn({
  children,
  busy,
}: {
  children: ReactNode;
  busy?: boolean;
}) {
  return (
    <PageColumn className="pt-3 desktop:pt-8">
      <div aria-busy={busy || undefined} className="flex flex-1 flex-col">
        {children}
      </div>
    </PageColumn>
  );
}

function Header({ title = copy.head.title }: { title?: string }) {
  return (
    <>
      <PageHeader
        backHref={pollTabHref}
        eyebrow={copy.head.eyebrow}
        title={title}
      />
      <p className="mt-2 type-body-sm text-muted-foreground">
        {copy.head.fixed}
      </p>
    </>
  );
}

/* ---------- 첫 사용 질문 2개 (B) ---------- */

function Questions({
  step,
  setStep,
  cond,
  setCond,
  onFind,
}: {
  step: 1 | 2;
  setStep: (s: 1 | 2) => void;
  cond: PartyConditions;
  setCond: (c: PartyConditions) => void;
  onFind: () => void;
}) {
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  // 질문이 바뀌면 새 질문 제목으로 초점(처음 열 때는 옮기지 않는다)
  useEffect(() => {
    if (moved.current) titleRef.current?.focus();
    moved.current = true;
  }, [step]);
  const last = step === 2;
  return (
    <PageColumn className="pt-3 desktop:pt-8">
      <div className="flex flex-1 flex-col">
        <div className="-ml-3 flex h-12 items-center gap-3">
          {step === 2 ? (
            <button
              type="button"
              aria-label={copy.questions.prev}
              onClick={() => setStep(1)}
              className={cn(
                "inline-flex size-11 items-center justify-center rounded-full text-foreground hover:bg-muted",
                focusRing,
              )}
            >
              <BackIcon />
            </button>
          ) : (
            <Link
              href={pollTabHref}
              aria-label={copy.head.back}
              className={cn(
                "inline-flex size-11 items-center justify-center rounded-full text-foreground hover:bg-muted",
                focusRing,
              )}
            >
              <BackIcon />
            </Link>
          )}
          <div
            role="progressbar"
            aria-label={copy.questions.progress(step, 2)}
            aria-valuemin={1}
            aria-valuemax={2}
            aria-valuenow={step}
            className="ml-auto flex w-20 gap-1.5"
          >
            {[1, 2].map((i) => (
              <span
                key={i}
                className="h-0.5 flex-1 overflow-hidden rounded-full bg-border"
              >
                <span
                  className={cn(
                    "block h-full origin-left bg-primary transition-transform duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
                    i <= step ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </span>
            ))}
          </div>
        </div>
        <p className="mt-8 min-h-5 type-caption text-muted-foreground">
          {step === 2
            ? copy.summary.headcount(cond.headcount)
            : copy.head.eyebrow}
        </p>

        <section
          key={step}
          aria-labelledby={titleId}
          className="mt-2 flex flex-1 flex-col motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)] motion-safe:[animation-timing-function:var(--lm-ease-enter)] motion-safe:slide-in-from-right-1"
        >
          <h1
            ref={titleRef}
            id={titleId}
            tabIndex={-1}
            className="type-title text-balance text-foreground outline-none"
          >
            {step === 1 ? copy.questions.headcount : copy.questions.budget}
          </h1>
          {step === 1 ? (
            <p className="mt-2 type-body-sm text-muted-foreground">
              {copy.head.fixed}
            </p>
          ) : null}
          <div className="mt-10">
            {step === 1 ? (
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
                      {copy.questions.headcountChip(n)}
                    </Chip>
                  ))}
                </ChipGroup>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                <p
                  aria-hidden
                  className="text-[3.5rem] leading-none font-[450] tracking-[-0.03em] text-foreground tabular-nums"
                >
                  {formatShortWon(cond.budget)}
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
                  value={cond.budget}
                  onChange={(budget) => setCond({ ...cond, budget })}
                />
              </div>
            )}
          </div>
        </section>
        <BottomAction>
          <button
            type="button"
            onClick={() => (last ? onFind() : setStep(2))}
            className={cn(buttonClass("primary"), "w-full")}
          >
            {last ? copy.questions.find : copy.questions.next}
          </button>
        </BottomAction>
      </div>
    </PageColumn>
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

/* ---------- 결과 (C) ---------- */

function useStats(ids: readonly string[]) {
  const key = [...ids].sort().join(",");
  return useQuery({
    queryKey: ["placeStats", "full", key] as const,
    queryFn: () => placeStatsAction(ids),
    enabled: ids.length > 0,
    retry: 1,
    retryDelay: 300,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

function Results({
  data,
  online,
  offices,
  office,
  onOffice,
  onPickMap,
  cond,
  onApply,
  note,
}: {
  data: TodayData;
  online: boolean;
  offices: readonly OfficeOption[];
  office: OfficeOption;
  onOffice: (id: string) => void;
  onPickMap: (pin: UserPinnedLatLng) => void;
  cond: PartyConditions;
  onApply: (c: PartyConditions) => void;
  note: string;
}) {
  const center = office.position;
  const kakao = useQuery({
    ...restaurantsInRadiusQuery(center, PARTY_RADIUS_M),
    enabled: online,
  });
  const places = useMemo(() => kakao.data?.places ?? [], [kakao.data]);
  const ids = useMemo(() => places.map((p) => p.id), [places]);
  const stats = useStats(ids);
  const statsSettled = ids.length === 0 || stats.isSuccess || stats.isError;

  const result = useMemo(() => {
    if (!kakao.isSuccess || !statsSettled) return null;
    const byId = new Map<string, PlaceStats>(
      (stats.data ?? []).map((s) => [s.placeId, s]),
    );
    const categoryOf = new Map(
      places.map((p) => [p.id, kakaoCategorySlug(p.categoryName)] as const),
    );
    return rankParty({
      places,
      statsOf: (id) => byId.get(id) ?? null,
      center,
      conditions: cond,
      avoid: data.avoid,
      blocked: new Set(data.blocked),
      visits: toVisits(data.history, (id) => categoryOf.get(id) ?? null),
      now: new Date(data.nowIso),
    });
  }, [kakao.isSuccess, statsSettled, stats.data, places, center, cond, data]);

  // 지도(모바일 띠, 데스크톱 슬롯)에 기준점과 핀을 넣는다
  const setView = usePartyMap((s) => s.setView);
  const clearMap = usePartyMap((s) => s.clear);
  const active = usePartyMap((s) => s.active);
  const setActive = usePartyMap((s) => s.setActive);
  const pinKey = result?.picks.map((p) => p.id).join("|") ?? "";
  useEffect(() => {
    setView({
      base: { center, radiusM: PARTY_RADIUS_M },
      pins: (result?.picks ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        position: p.position,
      })),
    });
    // 핀 목록과 기준점이 바뀔 때만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinKey, center.lat, center.lng, setView]);
  useEffect(() => clearMap, [clearMap]);

  // party_searched: 같은 조건, 기준, 결과 수는 한 번만
  useEffect(() => {
    if (!result) return;
    const key = `${office.id}|${JSON.stringify(cond)}|${result.picks.length}`;
    if (firstSearch(key)) partyEvent(partySearched(cond, result.picks.length));
  }, [result, cond, office.id]);

  // 투표에 넣을 곳(기본 모두). 결과가 바뀌면 다시 모두
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  const [round, setRound] = useState(0);
  const [lastKey, setLastKey] = useState(pinKey);
  if (lastKey !== pinKey) {
    setLastKey(pinKey);
    setExcluded(new Set());
    setRound((r) => r + 1);
  }

  const [edit, setEdit] = useState<EditField | null>(null);
  const [draft, setDraft] = useState<PartyConditions>(cond);
  const tokenRefs = useRef<Partial<Record<EditField, HTMLButtonElement>>>({});
  const openEdit = (f: EditField) => {
    setDraft(cond);
    setEdit(edit === f ? null : f);
  };
  const closeEdit = (f: EditField | null = edit) => {
    setEdit(null);
    if (f) tokenRefs.current[f]?.focus();
  };

  const picks = result?.picks ?? [];
  const picked = picks.filter((p) => !excluded.has(p.id));
  const loading =
    online && (kakao.isPending || (kakao.isSuccess && !statsSettled));
  const title =
    result && picks.length > 0
      ? copy.head.titleResultsCount(picks.length)
      : copy.head.title;

  const createPoll = () => {
    if (picked.length < POLL_MIN_PLACES) return;
    openPollCreate({
      entry: "party",
      kind: "party",
      places: picked.map((p) => ({
        placeId: p.id,
        placeUrl: p.placeUrl,
        name: p.name,
        category: p.categoryName,
      })),
      anchor: {
        lat: center.lat,
        lng: center.lng,
        radiusM: PARTY_RADIUS_M,
      },
    });
  };

  let body: ReactNode;
  if (!online && !kakao.isSuccess) {
    body = (
      <div className="mt-6">
        <PartyOffline />
      </div>
    );
  } else if (kakao.isError) {
    body = (
      <div className="mt-6">
        <PartyError onRetry={() => void kakao.refetch()} />
      </div>
    );
  } else if (loading || !result) {
    body = (
      <div className="mt-4">
        <p className="sr-only">{copy.states.loading}</p>
        <CandidateSkeletonList />
      </div>
    );
  } else if (picks.length === 0) {
    body = (
      <div className="mt-6">
        <PartyEmpty onAction={() => openEdit("budget")} />
      </div>
    );
  } else {
    body = (
      <>
        {unknownShare(picks) > COLD_SHARE ? (
          <ColdNote className="mt-6" />
        ) : null}
        <ol
          key={round}
          aria-label={copy.candidate.listLabel}
          className="mt-2 flex flex-col"
        >
          {picks.map((c, i) => (
            <CandidateRow
              key={c.id}
              c={c}
              i={i}
              active={i === active}
              included={!excluded.has(c.id)}
              onActive={() => setActive(i)}
              onInclude={(v) =>
                setExcluded((xs) => {
                  const next = new Set(xs);
                  if (v) next.delete(c.id);
                  else next.add(c.id);
                  return next;
                })
              }
            />
          ))}
        </ol>
        {picks.length < 5 ? (
          <FewNote
            count={picks.length}
            body={
              cond.alcohol && result.filtered.alcohol > 0
                ? copy.few.alcoholBody
                : copy.few.body
            }
            onAction={() => openEdit("budget")}
          />
        ) : null}
        <EvidenceLegend className="mt-6" />
        <BottomAction
          note={
            picked.length < POLL_MIN_PLACES ? (
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
            aria-disabled={picked.length < POLL_MIN_PLACES || undefined}
            onClick={createPoll}
            className={cn(buttonClass("primary"), "w-full")}
          >
            {copy.actions.createPollCount(picked.length)}
          </button>
        </BottomAction>
      </>
    );
  }

  return (
    <PartyColumn busy={loading}>
      <Header title={title} />
      <Sentence cond={cond} edit={edit} onOpen={openEdit} refs={tokenRefs} />
      <EditorSlot>
        {edit ? (
          <Editor
            field={edit}
            draft={draft}
            setDraft={setDraft}
            onApply={() => {
              onApply(draft);
              closeEdit();
            }}
            onClose={() => closeEdit()}
          />
        ) : null}
      </EditorSlot>
      <BaseLine
        offices={offices}
        office={office}
        onOffice={onOffice}
        onPickMap={onPickMap}
      />
      <PartyMapStrip className="mt-4" />
      {body}
      <LiveNote message={note} />
    </PartyColumn>
  );
}

function CandidateRow({
  c,
  i,
  active,
  included,
  onActive,
  onInclude,
}: {
  c: PartyPick;
  i: number;
  active: boolean;
  included: boolean;
  onActive: () => void;
  onInclude: (v: boolean) => void;
}) {
  return (
    <li
      style={staggerStyle(i)}
      className={cn(
        "grid grid-cols-[1.75rem_1fr_auto] items-start gap-x-3 border-b border-border py-5 last:border-b-0",
        enterClass,
      )}
    >
      <PinNumber n={i + 1} active={active} className="mt-1" />
      <div className="flex min-w-0 flex-col">
        <button
          type="button"
          aria-pressed={active}
          onClick={onActive}
          className={cn(
            "flex flex-col items-start rounded-sm text-left",
            focusRing,
          )}
        >
          <span className="sr-only">{copy.candidate.number(i + 1)} </span>
          <CategoryLine c={c} />
          <span className="mt-1 type-heading break-keep text-foreground">
            {c.name}
          </span>
          {/* 이름은 보이는 글자에서 읽는다(aria-label을 쓰면 보이는 글과 이름이 어긋난다) */}
          <span className="sr-only"> {copy.candidate.showOnMap}</span>
        </button>
        <CandidateNumbers c={c} className="mt-3" />
        <EvidenceList items={c.evidence} name={c.name} className="mt-3" />
      </div>
      <label className="flex min-h-11 min-w-11 cursor-pointer items-start justify-end pt-1">
        <Checkbox
          checked={included}
          aria-label={copy.candidate.includeLabel(c.name)}
          onCheckedChange={(v) => onInclude(Boolean(v))}
        />
      </label>
    </li>
  );
}

/* ---------- 조건 문장과 고치기 칸 ---------- */

function Sentence({
  cond,
  edit,
  onOpen,
  refs,
}: {
  cond: PartyConditions;
  edit: EditField | null;
  onOpen: (f: EditField) => void;
  refs: RefObject<Partial<Record<EditField, HTMLButtonElement>>>;
}) {
  const tokens: { f: EditField; text: string; off?: boolean }[] = [
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
  // 고칠 수 있는 낱말은 점선 밑줄 글자 버튼. 문장처럼 읽히고, 쉼표는 장식이라 스크린 리더에서 뺀다.
  return (
    <p className="mt-6 type-title leading-[1.6] text-foreground">
      <span className="sr-only">{copy.summary.label}: </span>
      {tokens.map((t, i) => (
        <Fragment key={t.f}>
          {/* 낱말과 쉼표를 붙여 둔다(쉼표가 줄 머리로 넘어가지 않게). 줄바꿈은 쉼표 뒤 빈칸에서만 */}
          <span className="whitespace-nowrap">
            <button
              ref={(el) => {
                if (el) refs.current[t.f] = el;
              }}
              type="button"
              aria-expanded={edit === t.f}
              aria-controls="party-editor"
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
            {i < tokens.length - 1 ? <span aria-hidden>,</span> : null}
          </span>
          {i < tokens.length - 1 ? " " : null}
        </Fragment>
      ))}
    </p>
  );
}

/** 고치기 칸 높이 전환(base 260 standard). 축소 모드면 즉시 */
function EditorSlot({ children }: { children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div
      style={height === null ? undefined : { height }}
      className="overflow-hidden transition-[height] duration-(--lm-duration-base) ease-standard motion-reduce:transition-none"
    >
      <div ref={inner} className="px-1 pb-1">
        {children}
      </div>
    </div>
  );
}

function Editor({
  field,
  draft,
  setDraft,
  onApply,
  onClose,
}: {
  field: EditField;
  draft: PartyConditions;
  setDraft: (c: PartyConditions) => void;
  onApply: () => void;
  onClose: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, [field]);
  let control: ReactNode;
  if (field === "people") {
    control = (
      <HeadcountStepper
        value={draft.headcount}
        onChange={(headcount) => setDraft({ ...draft, headcount })}
        labelledBy="party-editor-title"
      />
    );
  } else if (field === "budget") {
    control = (
      <BudgetSlider
        hideLabel
        value={draft.budget}
        onChange={(budget) => setDraft({ ...draft, budget })}
      />
    );
  } else {
    const key = field;
    control = (
      <ChipGroup
        aria-labelledby="party-editor-title"
        value={[draft[key] ? "on" : "off"]}
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
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    }
  };
  return (
    <section
      id="party-editor"
      aria-labelledby="party-editor-title"
      onKeyDown={onKeyDown}
      className="mt-3 rounded-card border border-border bg-card px-5 pt-4 pb-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2
          ref={titleRef}
          id="party-editor-title"
          tabIndex={-1}
          className="type-label text-foreground outline-none"
        >
          {FIELD_NAME[field]}
        </h2>
        {field === "budget" ? (
          <span className="type-numeric-md text-foreground">
            {copy.fields.budgetValue(draft.budget)}
          </span>
        ) : null}
      </div>
      <div className="mt-3">{control}</div>
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

/* ---------- 기준 위치 ---------- */

function BaseLine({
  offices,
  office,
  onOffice,
  onPickMap,
}: {
  offices: readonly OfficeOption[];
  office: OfficeOption;
  onOffice: (id: string) => void;
  onPickMap: (pin: UserPinnedLatLng) => void;
}) {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const listId = useId();
  const changeRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="mt-3 flex flex-col">
      <div className="flex items-center gap-2 type-caption text-muted-foreground">
        <span>{copy.base.office(office.name)}</span>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={copy.base.changeLabel}
          ref={changeRef}
          onClick={() => {
            setPicking(false);
            setOpen((v) => !v);
          }}
          className={cn(
            "relative rounded-sm text-foreground underline decoration-muted-foreground decoration-1 underline-offset-3 hover:decoration-foreground",
            "before:absolute before:-inset-x-2 before:-inset-y-3",
            focusRing,
          )}
        >
          {copy.base.change}
        </button>
      </div>
      {open ? (
        <div
          id={listId}
          role="group"
          aria-label={copy.base.menuTitle}
          className="mt-2 flex flex-wrap items-center gap-2"
        >
          {offices.map((o) => (
            <Chip
              key={o.id}
              pressed={o.id === office.id}
              onPressedChange={() => {
                onOffice(o.id);
                setOpen(false);
              }}
            >
              {o.name}
            </Chip>
          ))}
          <Link
            href="/me/offices"
            className={cn(
              "inline-flex min-h-11 items-center rounded-sm px-1 type-caption text-foreground underline decoration-muted-foreground decoration-1 underline-offset-3",
              focusRing,
            )}
          >
            {copy.base.manage}
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setPicking(true);
            }}
            className={cn(
              "inline-flex min-h-11 items-center rounded-sm px-1 type-caption text-foreground underline decoration-muted-foreground decoration-1 underline-offset-3",
              focusRing,
            )}
          >
            {anchorPickerCopy.open}
          </button>
        </div>
      ) : null}
      {picking ? (
        <AnchorPickerLazy
          className="mt-3"
          initialCenter={office.position}
          radiusM={PARTY_RADIUS_M}
          headingLevel={2}
          onCancel={() => {
            setPicking(false);
            requestAnimationFrame(() => changeRef.current?.focus());
          }}
          onConfirm={(pin) => {
            setPicking(false);
            onPickMap(pin);
            requestAnimationFrame(() => changeRef.current?.focus());
          }}
        />
      ) : null}
    </div>
  );
}
