"use client";
// 온보딩 시안 공용 입력 조각 (T4.1): 위치 검색, 현위치 버튼, 예산과 거리 슬라이더, 못 먹는 음식 칩과 직접 입력.
// 세 시안이 같은 조각을 쓰고 배치만 다르게 한다(시안 차이는 흐름과 배치에 둔다).
import { CloudOff, LocateFixed, Plus, Search, SearchX, X } from "lucide-react";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing, hitArea48, pressMotion } from "@/components/ui/interaction";
import { onboardingLabCopy } from "@/copy/design-lab-onboarding";
import { formatShortWon } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Note } from "./notes";
import { DEFAULTS, RANGES, type Onboarding } from "./use-onboarding";

const copy = onboardingLabCopy;

/* ---------- 위치 검색 ---------- */

/** 검색창 + 결과(최대 3개) 팝오버. 결과를 고르면 지도 중심만 옮긴다(핀은 그대로) */
export function LocationSearch({
  ob,
  className,
  popoverClassName,
}: {
  ob: Onboarding;
  className?: string;
  popoverClassName?: string;
}) {
  const inputId = useId();
  const listId = useId();
  const disabled = ob.offline || ob.loading;
  const open = ob.searchStatus !== "idle";
  return (
    <div className={cn("relative", className)}>
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
        value={ob.query}
        disabled={disabled}
        aria-controls={open ? listId : undefined}
        onChange={(e) => ob.setQuery(e.currentTarget.value)}
        placeholder={copy.location.searchPlaceholder}
        className="pr-12 pl-11 [&::-webkit-search-cancel-button]:hidden"
      />
      {ob.query && !disabled ? (
        <button
          type="button"
          aria-label={copy.location.searchClear}
          onClick={() => ob.setQuery("")}
          className={cn(
            "absolute top-1/2 right-0.5 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground",
            focusRing,
          )}
        >
          <X aria-hidden className="size-4" strokeWidth={1.75} />
        </button>
      ) : null}

      {open ? (
        <div
          id={listId}
          className={cn(
            "absolute top-full right-0 left-0 z-20 mt-2 rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-lg",
            popoverClassName,
          )}
        >
          {ob.searchStatus === "results" ? (
            <ul
              aria-label={copy.location.resultsLabel}
              className="flex flex-col"
            >
              {ob.results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => ob.choose(r)}
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
          ) : ob.searchStatus === "empty" ? (
            <Note
              icon={SearchX}
              live="status"
              title={copy.location.searchEmpty.title}
              body={copy.location.searchEmpty.body}
              className="px-2 py-2"
            />
          ) : (
            <Note
              icon={CloudOff}
              live="alert"
              title={copy.location.searchError.title}
              body={copy.location.searchError.body}
              className="px-2 py-2"
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

/** 현위치 버튼: 지도 중심만 옮긴다(저장하지 않음). 권한 거부면 안내를 띄운다 */
export function LocateButton({
  ob,
  className,
}: {
  ob: Onboarding;
  className?: string;
}) {
  const disabled = ob.offline || ob.loading;
  return (
    <button
      type="button"
      onClick={ob.locate}
      aria-disabled={disabled || undefined}
      aria-label={copy.location.locateLabel}
      className={cn(
        "flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-50",
        ob.permNotice && "text-muted-foreground",
        focusRing,
        pressMotion,
        className,
      )}
    >
      <LocateFixed aria-hidden className="size-5" strokeWidth={1.5} />
    </button>
  );
}

/* ---------- 예산과 거리 ---------- */

/** 9,000원 → { num: "9,000", unit: "원" }, 12,000 → { num: "1.2", unit: "만 원" } */
export function wonParts(won: number): { num: string; unit: string } {
  const text = formatShortWon(won);
  const m = /^([\d.,]+)(.*)$/.exec(text);
  return m
    ? { num: m[1] ?? text, unit: (m[2] ?? "").trim() }
    : { num: text, unit: "" };
}

const walkText = (minutes: number) => `${minutes}${copy.budget.walkUnit}`;

function DefaultMark({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "type-caption text-muted-foreground transition-opacity duration-(--lm-duration-fast) motion-reduce:transition-none",
        on ? "opacity-100" : "opacity-0",
      )}
      aria-hidden={!on}
    >
      {copy.budget.defaultMark}
    </span>
  );
}

/** 큰 숫자 한 줄: 숫자 numeric-lg + 단위 caption, 기준선 맞춤 */
function BigValue({
  num,
  unit,
  prefix,
}: {
  num: string;
  unit: string;
  prefix?: string;
}) {
  return (
    <p aria-hidden className="flex items-baseline">
      {prefix ? (
        <span className="mr-1 type-caption text-muted-foreground">
          {prefix}
        </span>
      ) : null}
      <span className="type-numeric-lg tabular-nums">{num}</span>
      <span className="ml-0.5 type-label text-muted-foreground">{unit}</span>
    </p>
  );
}

function sliderValue(v: number | readonly number[]): number {
  return typeof v === "number" ? v : (v[0] ?? 0);
}

/**
 * 예산과 거리.
 * - large: 라벨과 "기본값" 표시 → 큰 숫자 28 → 슬라이더. A와 C가 쓴다.
 * - compact: 공용 Slider 머리(라벨 왼쪽, 값 numeric-md 오른쪽). 시트 안(B)에서 쓴다.
 */
export function BudgetFields({
  ob,
  variant = "large",
  className,
  showNearby = true,
  headingLevel = "h2",
}: {
  ob: Onboarding;
  variant?: "large" | "compact";
  className?: string;
  showNearby?: boolean;
  /** 큰 숫자형 블록 제목 단계. 화면 제목이 h1이면 h2 */
  headingLevel?: "h2" | "h3";
}) {
  if (ob.loading)
    return <BudgetSkeleton variant={variant} className={className} />;

  const lunch = wonParts(ob.lunch);
  const dinner = wonParts(ob.dinner);

  if (variant === "compact") {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        <Slider
          label={copy.budget.lunch}
          value={ob.lunch}
          {...RANGES.lunch}
          formatValue={formatShortWon}
          onValueChange={(v) => ob.setLunch(sliderValue(v))}
        />
        <Slider
          label={copy.budget.dinner}
          value={ob.dinner}
          {...RANGES.dinner}
          formatValue={formatShortWon}
          onValueChange={(v) => ob.setDinner(sliderValue(v))}
        />
        <div className="flex flex-col">
          <Slider
            label={copy.budget.walk}
            value={ob.walk}
            {...RANGES.walk}
            formatValue={(m) => `${copy.budget.walkPrefix} ${walkText(m)}`}
            onValueChange={(v) => ob.setWalk(sliderValue(v))}
          />
          <WalkTicks />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <FieldBlock
        as={headingLevel}
        label={copy.budget.lunch}
        isDefault={ob.lunch === DEFAULTS.lunch}
        value={<BigValue prefix={copy.budget.perPerson} {...lunch} />}
      >
        <Slider
          thumbLabel={copy.budget.lunch}
          value={ob.lunch}
          {...RANGES.lunch}
          formatValue={formatShortWon}
          onValueChange={(v) => ob.setLunch(sliderValue(v))}
        />
      </FieldBlock>
      <FieldBlock
        as={headingLevel}
        label={copy.budget.dinner}
        isDefault={ob.dinner === DEFAULTS.dinner}
        value={<BigValue prefix={copy.budget.perPerson} {...dinner} />}
      >
        <Slider
          thumbLabel={copy.budget.dinner}
          value={ob.dinner}
          {...RANGES.dinner}
          formatValue={formatShortWon}
          onValueChange={(v) => ob.setDinner(sliderValue(v))}
        />
      </FieldBlock>
      <FieldBlock
        as={headingLevel}
        label={copy.budget.walk}
        isDefault={ob.walk === DEFAULTS.walk}
        value={
          <BigValue
            prefix={copy.budget.walkPrefix}
            num={String(ob.walk)}
            unit={copy.budget.walkUnit}
          />
        }
        last
      >
        <Slider
          thumbLabel={copy.budget.walk}
          value={ob.walk}
          {...RANGES.walk}
          formatValue={(m) => `${copy.budget.walkPrefix} ${walkText(m)}`}
          onValueChange={(v) => ob.setWalk(sliderValue(v))}
        />
        <WalkTicks />
        {showNearby ? <NearbyLine ob={ob} className="mt-3" /> : null}
      </FieldBlock>
    </div>
  );
}

function FieldBlock({
  as: Heading,
  label,
  isDefault,
  value,
  children,
  last = false,
}: {
  as: "h2" | "h3";
  label: string;
  isDefault: boolean;
  value: ReactNode;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <section
      aria-label={label}
      className={cn(
        "flex flex-col gap-1 py-5 first:pt-0",
        !last && "border-b border-border",
      )}
    >
      <div className="flex items-baseline justify-between">
        <Heading className="type-label">{label}</Heading>
        <DefaultMark on={isDefault} />
      </div>
      {value}
      <div className="mt-1">{children}</div>
    </section>
  );
}

/** 5, 10, 15, 20분 눈금. 손잡이 정렬이 edge라 양 끝 눈금이 트랙 끝과 맞는다 */
function WalkTicks() {
  return (
    <div
      aria-hidden
      className="-mt-1 flex justify-between px-1 type-caption text-muted-foreground tabular-nums"
    >
      {[5, 10, 15, 20].map((m) => (
        <span key={m} className="w-6 text-center">
          {m}
        </span>
      ))}
    </div>
  );
}

/** 반경과 근처 식당 수(설명 가능한 기본값). 0곳이면 넓히기 제안 */
export function NearbyLine({
  ob,
  className,
}: {
  ob: Onboarding;
  className?: string;
}) {
  if (ob.nearby === 0 && ob.params.state === "empty") {
    return (
      <div className={cn("flex flex-col items-start gap-2", className)}>
        <Note
          icon={SearchX}
          live="status"
          title={copy.budget.nearbyEmpty.title}
          body={copy.budget.nearbyEmpty.body}
        />
        <button
          type="button"
          onClick={() => ob.setWalk(DEFAULTS.walk)}
          className={cn(buttonClass("secondary", "sm"), "ml-6.5")}
        >
          {copy.actions.widen}
        </button>
      </div>
    );
  }
  return (
    <p
      className={cn(
        "flex flex-wrap items-baseline gap-x-3 gap-y-1 type-caption text-muted-foreground",
        className,
      )}
    >
      <span>{copy.budget.radius(ob.radiusM)}</span>
      <span aria-live="polite" className="text-foreground tabular-nums">
        {copy.budget.nearby(ob.nearby)}
      </span>
    </p>
  );
}

function BudgetSkeleton({
  variant,
  className,
}: {
  variant: "large" | "compact";
  className?: string;
}) {
  return (
    <div
      aria-busy="true"
      className={cn(
        "flex flex-col",
        variant === "large" ? "gap-8" : "gap-5",
        className,
      )}
    >
      <span role="status" className="sr-only">
        {copy.budget.loading}
      </span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="h-4 w-20" />
          {variant === "large" ? <Skeleton className="h-7 w-28" /> : null}
          <Skeleton className="h-1 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ---------- 못 먹는 음식 ---------- */

/** 음식 종류와 알레르기 칩 묶음 + 직접 입력. 칩 사이 8px(터치 48 겹치지 않음) */
export function AvoidFields({
  ob,
  className,
  headingLevel = "h3",
}: {
  ob: Onboarding;
  className?: string;
  headingLevel?: "h2" | "h3";
}) {
  const foodsId = useId();
  const allergyId = useId();
  const Heading = headingLevel;
  if (ob.loading) return <AvoidSkeleton className={className} />;
  return (
    <div className={cn("flex flex-col gap-7", className)}>
      <section aria-labelledby={foodsId} className="flex flex-col gap-3">
        <Heading id={foodsId} className="type-caption text-muted-foreground">
          {copy.avoid.foods}
        </Heading>
        <ChipGroup
          multiple
          aria-labelledby={foodsId}
          value={ob.foods}
          onValueChange={(v) => ob.setFoods(v.map(String))}
        >
          {copy.avoid.foodChips.map((c) => (
            <Chip key={c} value={c}>
              {c}
            </Chip>
          ))}
        </ChipGroup>
      </section>
      <section aria-labelledby={allergyId} className="flex flex-col gap-3">
        <Heading id={allergyId} className="type-caption text-muted-foreground">
          {copy.avoid.allergies}
        </Heading>
        <ChipGroup
          multiple
          aria-labelledby={allergyId}
          value={ob.allergies}
          onValueChange={(v) => ob.setAllergies(v.map(String))}
        >
          {copy.avoid.allergyChips.map((c) => (
            <Chip key={c} value={c}>
              {c}
            </Chip>
          ))}
        </ChipGroup>
      </section>
      <CustomAvoid ob={ob} headingLevel={headingLevel} />
    </div>
  );
}

function CustomAvoid({
  ob,
  headingLevel,
}: {
  ob: Onboarding;
  headingLevel: "h2" | "h3";
}) {
  const inputId = useId();
  const hintId = useId();
  const [draft, setDraft] = useState("");
  const [dup, setDup] = useState(false);
  const Heading = headingLevel;

  function submit(e: FormEvent) {
    e.preventDefault();
    const r = ob.addCustom(draft);
    setDup(r === "duplicate");
    if (r === "added") setDraft("");
  }

  return (
    <section className="flex flex-col gap-3">
      <Heading className="type-caption text-muted-foreground">
        <label htmlFor={inputId}>{copy.avoid.custom}</label>
      </Heading>
      <form onSubmit={submit} className="flex gap-2">
        <Input
          id={inputId}
          value={draft}
          maxLength={20}
          enterKeyHint="done"
          aria-describedby={hintId}
          aria-invalid={dup || undefined}
          onChange={(e) => {
            setDraft(e.currentTarget.value);
            setDup(false);
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
        role={dup ? "alert" : undefined}
        className="type-caption break-keep text-muted-foreground"
      >
        {dup ? copy.avoid.customDuplicate : copy.avoid.customHint}
      </p>
      {ob.custom.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {ob.custom.map((item) => (
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

function AvoidSkeleton({ className }: { className?: string }) {
  const widths = [
    "w-12",
    "w-16",
    "w-24",
    "w-20",
    "w-14",
    "w-20",
    "w-16",
    "w-18",
  ];
  return (
    <div aria-busy="true" className={cn("flex flex-col gap-7", className)}>
      <span role="status" className="sr-only">
        {copy.avoid.loading}
      </span>
      {[0, 1].map((g) => (
        <div key={g} className="flex flex-col gap-3">
          <Skeleton className="h-3.5 w-16" />
          <div className="flex flex-wrap gap-2">
            {widths.map((w, i) => (
              <Skeleton key={i} className={cn("h-10 rounded-chip", w)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
