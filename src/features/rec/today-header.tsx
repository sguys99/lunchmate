"use client";
// 오늘(홈) 머리 (T5.15 끼니, T5.16 기준 위치, G3 D1, DESIGN.md 5장 "오늘(홈) 화면" 머리).
// 1행 기준 위치 칩(왼쪽, 높이 40, 터치 44) + 끼니 토글(오른쪽, 글자 두 개, 선택 쪽만 foreground + 1px 밑줄).
// 2행 날짜와 끼니 caption, 3행 제목 "오늘의 추천" title 세리프. 행 사이 24(데스크톱 16), 날짜와 제목 사이 6.
// 기준 위치 칩을 누르면 바로 아래에 고르기 목록(사무실들 + 현위치)이 열린다. Base UI를 쓰지 않는 가벼운 목록이다
// (홈 첫 로드 예산). Esc, 바깥 누르기로 닫고, 열리면 고른 항목에 포커스, 닫히면 칩으로 포커스를 돌려준다.
// 올리브 면 버튼은 쓰지 않는다. 화면의 주 버튼은 하단 행동 줄의 "길찾기" 하나다(CLAUDE.md 6.3).
import { Check, ChevronDown, Info, LocateFixed, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { focusRing, hitArea44 } from "@/components/ui/interaction";
import { homeCopy } from "@/copy/home";
import { getKstParts, type Meal } from "@/lib/time";
import { cn } from "@/lib/utils";
import type {
  BaseChoice,
  BaseNotice,
  OfficeOption,
  ResolvedBase,
} from "./base-location";

const copy = homeCopy.today;

export function dateLine(now: Date): string {
  const { month, day, weekday } = getKstParts(now);
  return copy.dateLine(month, day, copy.weekdays[weekday] ?? "");
}

export function baseName(base: ResolvedBase): string {
  return base.kind === "office" ? base.office.name : copy.location.options.here;
}

/** 끼니 토글: 글자 두 개, 선택된 쪽만 진한 글자와 1px 밑줄(틴트 없음). 터치 영역 44 */
export function MealToggle({
  meal,
  onChange,
  className,
}: {
  meal: Meal;
  onChange: (meal: Meal) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={copy.meal.label}
      className={cn("flex items-center", className)}
    >
      {(["lunch", "dinner"] as const).map((m) => {
        const on = m === meal;
        return (
          <button
            key={m}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(m)}
            className={cn(
              "inline-flex h-11 min-w-11 items-center justify-center rounded-sm px-2 type-label underline-offset-[0.4rem] transition-colors duration-(--lm-duration-fast) ease-standard",
              on
                ? "text-foreground underline decoration-foreground decoration-1"
                : "text-muted-foreground hover:text-foreground",
              focusRing,
            )}
          >
            {copy.meal[m]}
          </button>
        );
      })}
    </div>
  );
}

export type LocationMenuProps = {
  base: ResolvedBase;
  offices: readonly OfficeOption[];
  signedIn: boolean;
  onChoose: (choice: BaseChoice) => void;
  /** 둘러보기: 로그인 유도 시트(저장). 로그인이 닫힌 환경(flags.auth 꺼짐)이면 없고, 저장 항목을 숨긴다 */
  onSaveOffice?: () => void;
};

/** 기준 위치 칩 + 고르기 목록 (REC-02) */
export function LocationChip({
  base,
  offices,
  signedIn,
  onChoose,
  onSaveOffice,
}: LocationMenuProps) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const chipRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const name = baseName(base);
  const locating = base.kind === "here" && base.state.status === "locating";

  // 열리면 고른 항목으로 포커스
  useEffect(() => {
    if (!open) return;
    const el =
      listRef.current?.querySelector<HTMLElement>("[aria-current='true']") ??
      listRef.current?.querySelector<HTMLElement>("button, a");
    el?.focus();
  }, [open]);

  // 바깥을 누르면 닫는다
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (listRef.current?.contains(t) || chipRef.current?.contains(t)) return;
      setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function close(refocus = true) {
    setOpen(false);
    if (refocus) chipRef.current?.focus();
  }

  function choose(choice: BaseChoice) {
    close();
    onChoose(choice);
  }

  function onKeyDown(e: KeyboardEvent<HTMLUListElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>("button, a") ?? [],
    );
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === "ArrowDown"
        ? items[(i + 1) % items.length]
        : items[(i - 1 + items.length) % items.length];
    next?.focus();
  }

  const isHere = base.kind === "here";
  const itemClass = cn(
    "flex min-h-11 w-full items-center gap-2.5 rounded-md px-3 text-left type-label transition-colors duration-(--lm-duration-fast) ease-standard hover:bg-muted",
    focusRing,
  );

  return (
    <div className="relative min-w-0">
      <button
        ref={chipRef}
        type="button"
        aria-label={copy.location.chipLabel(name)}
        aria-expanded={open}
        aria-controls={listId}
        aria-busy={locating || undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-10 max-w-full items-center gap-1.5 rounded-chip border border-border px-3 type-label whitespace-nowrap text-foreground transition-colors duration-(--lm-duration-fast) ease-standard hover:bg-muted",
          hitArea44,
          focusRing,
        )}
      >
        {isHere ? (
          <LocateFixed
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground"
            strokeWidth={1.5}
          />
        ) : (
          <MapPin
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground"
            strokeWidth={1.5}
          />
        )}
        <span className="truncate">{name}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
            open && "rotate-180",
          )}
          strokeWidth={1.5}
        />
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listId}
          aria-label={copy.location.menuLabel}
          onKeyDown={onKeyDown}
          className="absolute top-full left-0 z-20 mt-2 flex w-64 max-w-[calc(100vw-3rem)] flex-col gap-0.5 rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-lg motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-fast)] dark:border-input"
        >
          {offices.map((o) => {
            const current = base.kind === "office" && base.office.id === o.id;
            return (
              <li key={o.id}>
                <button
                  type="button"
                  aria-current={current || undefined}
                  onClick={() => choose({ kind: "office", id: o.id })}
                  className={itemClass}
                >
                  <MapPin
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                  <span className="min-w-0 flex-1 truncate">{o.name}</span>
                  {o.isDefault ? (
                    <span className="type-caption text-muted-foreground">
                      {copy.location.defaultMark}
                    </span>
                  ) : null}
                  {current ? (
                    <Check
                      aria-hidden
                      className="size-4 shrink-0 text-foreground"
                      strokeWidth={1.75}
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              aria-current={isHere || undefined}
              onClick={() => choose({ kind: "here" })}
              className={itemClass}
            >
              <LocateFixed
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
                strokeWidth={1.5}
              />
              <span className="min-w-0 flex-1 truncate">
                {copy.location.options.here}
              </span>
              {isHere ? (
                <Check
                  aria-hidden
                  className="size-4 shrink-0 text-foreground"
                  strokeWidth={1.75}
                />
              ) : null}
            </button>
          </li>
          {offices.length === 0 && (signedIn || onSaveOffice) ? (
            <li className="mt-1 border-t border-border pt-1">
              {signedIn ? (
                <Link
                  href="/me/offices/new"
                  onClick={() => close(false)}
                  className={cn(itemClass, "text-muted-foreground")}
                >
                  {copy.location.addOffice}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    close(false);
                    onSaveOffice?.();
                  }}
                  className={cn(itemClass, "text-muted-foreground")}
                >
                  {copy.location.saveOffice}
                </button>
              )}
              {!signedIn ? (
                <p className="px-3 pt-1 pb-2 type-caption break-keep text-muted-foreground">
                  {copy.location.guestNote}
                </p>
              ) : null}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

/** 현위치를 못 써서 기본 사무실로 돌아왔다는 안내(PRD 12장), 둘러보기 안내 */
export function HeaderNotice({ text }: { text: string }) {
  return (
    <p
      role="status"
      className="flex items-start gap-2 type-caption break-keep text-muted-foreground"
    >
      <Info
        aria-hidden
        className="mt-0.5 size-3.5 shrink-0"
        strokeWidth={1.5}
      />
      <span>{text}</span>
    </p>
  );
}

export function noticeText(notice: BaseNotice): string | null {
  if (notice === "denied") return copy.location.deniedNotice;
  if (notice === "unavailable") return copy.location.unavailableNotice;
  return null;
}

/** 머리: 위치 칩과 끼니 토글, 날짜, 제목 */
export function TodayHeader({
  meal,
  now,
  onMeal,
  notice,
  ...menu
}: LocationMenuProps & {
  meal: Meal;
  now: Date;
  onMeal: (meal: Meal) => void;
  notice?: string | null;
}) {
  return (
    <header className="flex flex-col gap-6 desktop:gap-4">
      <div className="flex items-center justify-between gap-3">
        <LocationChip {...menu} />
        <MealToggle meal={meal} onChange={onMeal} className="-mr-2 shrink-0" />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="type-caption text-muted-foreground">
          {dateLine(now)} {copy.meal[meal]}
        </p>
        <h1 className="type-title">{copy.title}</h1>
        {notice ? (
          <div className="mt-2.5">
            <HeaderNotice text={notice} />
          </div>
        ) : null}
      </div>
    </header>
  );
}
