"use client";
// 온보딩 단계 내용 (T4.16~T4.18): 위치 검색, 예산과 거리, 못 먹는 음식. 시안 B(D-07)의 조각을 실제 데이터로 옮겼다.
import {
  CloudOff,
  LocateFixed,
  LocateOff,
  Plus,
  Search,
  SearchX,
  ShieldCheck,
  WifiOff,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useId,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { focusRing, hitArea48, pressMotion } from "@/components/ui/interaction";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { onboardingCopy } from "@/copy/onboarding";
import { formatShortWon } from "@/lib/format";
import type { NearbyRestaurant } from "@/lib/kakao/local";
import { cn } from "@/lib/utils";
import {
  ALLERGY_CHIPS,
  FOOD_CHIPS,
  PREF_RANGES,
  WALK_OPTIONS,
} from "./constants";
import { countNearby } from "./nearby";
import { mapMoveTarget } from "./pin";
import { useLocationSearch } from "./use-kakao-queries";
import type { CustomAddResult, Onboarding } from "./use-onboarding";

// 화면 조각은 필요한 필드만 받는다. 나 탭 설정(T4.23, T4.24)이 같은 조각을 자기 상태로 쓴다.
export type LocationSearchState = Pick<
  Onboarding,
  "online" | "chooseSearchResult"
>;
export type LocateButtonState = Pick<
  Onboarding,
  "online" | "locating" | "locate"
>;
export type LocationNotesState = Pick<
  Onboarding,
  "locateHidden" | "locateFailed"
> & { office: Pick<Onboarding["office"], "pin"> };
export type BudgetState = Pick<
  Onboarding,
  "prefs" | "setWalk" | "setLunch" | "setDinner"
>;
export type AvoidState = Pick<
  Onboarding,
  "avoid" | "setFoods" | "setAllergies" | "addCustom" | "removeCustom"
>;

const copy = onboardingCopy;
const SEARCH_DEBOUNCE_MS = 350;

/* ---------- 안내 한 줄: 아이콘 + 제목 + 설명. 빨간 면 없이 아이콘과 글자만 ---------- */

export function Note({
  icon: Icon,
  title,
  body,
  live,
  className,
  id,
}: {
  icon: LucideIcon;
  title?: string;
  body: string;
  live?: "status" | "alert";
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      role={live}
      className={cn("flex items-start gap-2.5", className)}
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-4 shrink-0",
          live === "alert" ? "text-destructive" : "text-muted-foreground",
        )}
        strokeWidth={1.5}
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        {title ? <p className="type-label break-keep">{title}</p> : null}
        <p className="type-caption break-keep text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

export function OfflineNote() {
  return (
    <Note
      icon={WifiOff}
      live="status"
      title={copy.states.offline.title}
      body={copy.states.offline.body}
    />
  );
}

export function SaveErrorNote() {
  return (
    <Note
      icon={CloudOff}
      live="alert"
      title={copy.states.saveError.title}
      body={copy.states.saveError.body}
    />
  );
}

/* ---------- 1단계: 위치 ---------- */

/** 회사 주소, 건물명 검색. 결과(최대 3개)를 고르면 지도 중심만 옮긴다(핀은 비움) */
export function LocationSearch({ ob }: { ob: LocationSearchState }) {
  const inputId = useId();
  const listId = useId();
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const disabled = !ob.online;

  useEffect(() => {
    const t = setTimeout(() => setTerm(input), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [input]);

  const search = useLocationSearch(open ? term : "");
  const active = open && search.query.length >= 2;
  const state: "idle" | "loading" | "results" | "empty" | "error" = !active
    ? "idle"
    : search.isError
      ? "error"
      : !search.data
        ? "loading"
        : search.data.length === 0
          ? "empty"
          : "results";

  function submit(e: FormEvent) {
    e.preventDefault();
    setTerm(input);
    setOpen(true);
  }

  return (
    <div className="flex flex-col gap-2">
      <form role="search" onSubmit={submit} className="relative">
        <label htmlFor={inputId} className="sr-only">
          {copy.location.searchLabel}
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.75}
        />
        <Input
          id={inputId}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={input}
          disabled={disabled}
          aria-controls={state !== "idle" ? listId : undefined}
          onChange={(e) => {
            setInput(e.currentTarget.value);
            setOpen(true);
          }}
          placeholder={copy.location.searchPlaceholder}
          className="pr-12 pl-11 [&::-webkit-search-cancel-button]:hidden"
        />
        {input && !disabled ? (
          <button
            type="button"
            aria-label={copy.location.searchClear}
            onClick={() => {
              setInput("");
              setTerm("");
              setOpen(false);
            }}
            className={cn(
              "absolute top-1/2 right-0.5 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground",
              focusRing,
            )}
          >
            <X aria-hidden className="size-4" strokeWidth={1.75} />
          </button>
        ) : null}
      </form>

      {state !== "idle" ? (
        <div
          id={listId}
          className="rounded-lg border border-border bg-card p-1.5"
        >
          {state === "loading" ? (
            <div
              role="status"
              aria-label={copy.location.searching}
              className="flex flex-col gap-2 p-2"
            >
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ) : state === "results" ? (
            <ul
              aria-label={copy.location.resultsLabel}
              className="flex flex-col"
            >
              {search.data!.map((r) => (
                <li key={r.key}>
                  <button
                    type="button"
                    onClick={() => {
                      // 검색 좌표는 지도 이동 전용(MapMoveTarget)으로만 넘긴다(AC-ONB-3)
                      ob.chooseSearchResult(
                        r.name,
                        mapMoveTarget(r.position, "search"),
                      );
                      setOpen(false);
                      setInput(r.name);
                    }}
                    className={cn(
                      "flex min-h-12 w-full flex-col items-start justify-center rounded-md px-3 py-2 text-left hover:bg-muted",
                      focusRing,
                    )}
                  >
                    <span className="type-label">{r.name}</span>
                    <span className="type-caption text-muted-foreground">
                      {r.address}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : state === "empty" ? (
            <Note
              icon={SearchX}
              live="status"
              title={copy.location.searchEmpty.title}
              body={copy.location.searchEmpty.body}
              className="p-2"
            />
          ) : (
            <Note
              icon={CloudOff}
              live="alert"
              title={copy.location.searchError.title}
              body={copy.location.searchError.body}
              className="p-2"
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

/** 현위치 버튼: 지도 중심만 옮긴다(저장하지 않음). 권한 거부를 알면 화면이 숨긴다 */
export function LocateButton({ ob }: { ob: LocateButtonState }) {
  const disabled = !ob.online || ob.locating;
  return (
    <button
      type="button"
      onClick={() => void ob.locate()}
      aria-disabled={disabled || undefined}
      aria-busy={ob.locating || undefined}
      aria-label={
        ob.locating ? copy.location.locating : copy.location.locateLabel
      }
      className={cn(
        "flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-60",
        focusRing,
        pressMotion,
      )}
    >
      <LocateFixed
        aria-hidden
        className={cn("size-5", ob.locating && "motion-safe:animate-pulse")}
        strokeWidth={1.5}
      />
    </button>
  );
}

/** 1단계 시트 안내: 권한, 현위치 실패, 핀 상태(지도 위 말풍선 대신 시트에 둔다), 저장 고지 */
export function LocationNotes({ ob }: { ob: LocationNotesState }) {
  return (
    <div className="flex flex-col gap-4">
      {ob.locateHidden ? (
        <Note
          icon={LocateOff}
          live="status"
          title={copy.location.permDenied.title}
          body={copy.location.permDenied.body}
        />
      ) : ob.locateFailed ? (
        <Note
          icon={LocateOff}
          live="status"
          title={copy.location.locateFailed.title}
          body={copy.location.locateFailed.body}
        />
      ) : null}
      <p
        role="status"
        data-testid="pin-status"
        className={cn(
          "type-body-sm break-keep",
          ob.office.pin ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {ob.office.pin ? copy.location.pinPlaced : copy.location.pinHint}
      </p>
      <Note icon={ShieldCheck} body={copy.location.pinNotice} />
    </div>
  );
}

/* ---------- 2단계: 예산과 거리 ---------- */

function sliderValue(v: number | readonly number[]): number {
  return typeof v === "number" ? v : (v[0] ?? 0);
}

const walkText = (m: number) =>
  `${copy.budget.walkPrefix} ${m}${copy.budget.walkUnit}`;

/** 걷는 거리를 맨 위에 두고 바로 아래에 근처 식당 수(nearby)를 둔다(빈 상태 버튼이 하단 줄에 가리지 않게) */
export function BudgetFields({
  ob,
  nearby,
}: {
  ob: BudgetState;
  nearby: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col">
        <Slider
          label={copy.budget.walk}
          value={ob.prefs.walk}
          {...PREF_RANGES.walk}
          formatValue={walkText}
          onValueChange={(v) => ob.setWalk(sliderValue(v))}
        />
        <div
          aria-hidden
          className="-mt-1 flex justify-between px-1 type-caption text-muted-foreground tabular-nums"
        >
          {WALK_OPTIONS.map((m) => (
            <span key={m} className="w-6 text-center">
              {m}
            </span>
          ))}
        </div>
        <div className="mt-3">{nearby}</div>
      </div>
      <Slider
        label={copy.budget.lunch}
        value={ob.prefs.lunch}
        {...PREF_RANGES.lunch}
        formatValue={formatShortWon}
        onValueChange={(v) => ob.setLunch(sliderValue(v))}
      />
      <Slider
        label={copy.budget.dinner}
        value={ob.prefs.dinner}
        {...PREF_RANGES.dinner}
        formatValue={formatShortWon}
        onValueChange={(v) => ob.setDinner(sliderValue(v))}
      />
    </div>
  );
}

/** 반경과 근처 식당 수. 0곳이면 넓히기 제안(시트 스크롤 안, 하단 줄에 가리지 않게 걷는 거리 바로 아래) */
export function NearbyLine({
  ob,
  nearby,
}: {
  ob: Onboarding;
  nearby: {
    data?: { places: NearbyRestaurant[]; capped: boolean };
    isError: boolean;
  };
}) {
  if (nearby.isError) {
    return (
      <p className="type-caption break-keep text-muted-foreground">
        {copy.budget.radius(ob.radiusM)} {copy.budget.nearbyError}
      </p>
    );
  }
  if (!nearby.data) {
    return (
      <div
        role="status"
        aria-label={copy.budget.nearbyLoading}
        className="flex flex-col gap-1.5"
      >
        <Skeleton className="h-3.5 w-40" />
      </div>
    );
  }
  const { count, atLeast } = countNearby(
    nearby.data.places,
    nearby.data.capped,
    ob.radiusM,
  );
  if (count === 0) {
    const wider = WALK_OPTIONS.find((m) => m > ob.prefs.walk);
    return (
      <div className="flex flex-col items-start gap-2">
        <Note
          icon={SearchX}
          live="status"
          title={copy.budget.nearbyEmpty.title}
          body={
            wider
              ? copy.budget.nearbyEmpty.body(wider)
              : copy.budget.radius(ob.radiusM)
          }
        />
        {wider ? (
          <button
            type="button"
            onClick={() => ob.setWalk(wider)}
            className={cn(buttonClass("secondary", "sm"), "ml-6.5")}
          >
            {copy.actions.widen(wider)}
          </button>
        ) : null}
      </div>
    );
  }
  return (
    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 type-caption text-muted-foreground">
      <span>{copy.budget.radius(ob.radiusM)}</span>
      <span
        aria-live="polite"
        data-testid="nearby-count"
        className="text-foreground tabular-nums"
      >
        {atLeast ? copy.budget.nearbyAtLeast(count) : copy.budget.nearby(count)}
      </span>
    </p>
  );
}

/* ---------- 3단계: 못 먹는 음식 ---------- */

export function AvoidFields({ ob }: { ob: AvoidState }) {
  const foodsId = useId();
  const allergyId = useId();
  return (
    <div className="flex flex-col gap-7">
      <section aria-labelledby={foodsId} className="flex flex-col gap-3">
        <h2 id={foodsId} className="type-caption text-muted-foreground">
          {copy.avoid.foods}
        </h2>
        <ChipGroup
          multiple
          aria-labelledby={foodsId}
          value={ob.avoid.foods}
          onValueChange={(v) => ob.setFoods(v.map(String))}
        >
          {FOOD_CHIPS.map((c) => (
            <Chip key={c} value={c}>
              {c}
            </Chip>
          ))}
        </ChipGroup>
      </section>
      <section aria-labelledby={allergyId} className="flex flex-col gap-3">
        <h2 id={allergyId} className="type-caption text-muted-foreground">
          {copy.avoid.allergies}
        </h2>
        <ChipGroup
          multiple
          aria-labelledby={allergyId}
          value={ob.avoid.allergies}
          onValueChange={(v) => ob.setAllergies(v.map(String))}
        >
          {ALLERGY_CHIPS.map((c) => (
            <Chip key={c} value={c}>
              {c}
            </Chip>
          ))}
        </ChipGroup>
      </section>
      <CustomAvoid ob={ob} />
    </div>
  );
}

function CustomAvoid({ ob }: { ob: AvoidState }) {
  const inputId = useId();
  const hintId = useId();
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<CustomAddResult | null>(null);
  const problem = result === "duplicate" || result === "limit";

  function submit(e: FormEvent) {
    e.preventDefault();
    const r = ob.addCustom(draft);
    setResult(r);
    if (r === "added") setDraft("");
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="type-caption text-muted-foreground">
        <label htmlFor={inputId}>{copy.avoid.custom}</label>
      </h2>
      <form onSubmit={submit} className="flex gap-2">
        <Input
          id={inputId}
          value={draft}
          maxLength={20}
          enterKeyHint="done"
          aria-describedby={hintId}
          aria-invalid={problem || undefined}
          onChange={(e) => {
            setDraft(e.currentTarget.value);
            setResult(null);
          }}
          placeholder={copy.avoid.customPlaceholder}
          className="flex-1"
        />
        <button
          type="submit"
          className={cn(buttonClass("secondary"), "shrink-0 px-5")}
        >
          <Plus aria-hidden className="size-4" strokeWidth={1.75} />
          {copy.actions.add}
        </button>
      </form>
      <p
        id={hintId}
        role={problem ? "alert" : undefined}
        className="type-caption break-keep text-muted-foreground"
      >
        {result === "duplicate"
          ? copy.avoid.customDuplicate
          : result === "limit"
            ? copy.avoid.customLimit
            : copy.avoid.customHint}
      </p>
      {ob.avoid.custom.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {ob.avoid.custom.map((item) => (
            <li key={item}>
              <button
                type="button"
                aria-label={copy.avoid.customRemove(item)}
                onClick={() => ob.removeCustom(item)}
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-chip border border-primary pr-3 pl-4 type-label text-primary ring-[0.5px] ring-primary ring-inset hover:bg-muted",
                  focusRing,
                  pressMotion,
                  hitArea48,
                )}
              >
                {item}
                <X aria-hidden className="size-4" strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
