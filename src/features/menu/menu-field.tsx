"use client";
// 식후 피드백 시트의 "뭐 드셨어요?" (T10.16d, PRD MENU-01, D-35 A 칩). 후기 시트(review-sheet-drawer) 가격 칸 바로 위.
// - 이 식당에 제보된 메뉴 칩 최대 3개(제보 많은 순) + 직접 쓰기. 고르면 1인 가격 스테퍼가 그 메뉴 가격 중앙값으로 바뀐다.
// - 직접 쓰기는 빈 칸에서 시작한다(카카오 장소명 미리 채우기 없음). 20자.
// - 선택 입력이다. 고르지 않으면 지금처럼 가격만 남긴다. 메뉴를 고르면 가격도 함께 남긴다(가격을 비우면 메뉴는 남기지 않는다).
// - 저장은 후기 저장이 끝난 뒤 그 후기 id로 따로 한다(saveReviewMenu). 후기 저장 흐름(review-draft.ts)은 바꾸지 않는다.
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { hitArea44 } from "@/components/ui/interaction";
import { menuCopy } from "@/copy/menu";
import { shortWon } from "@/features/feedback/review-draft";
import { track } from "@/lib/analytics/track";
import { dbKeys } from "@/lib/query/db-keys";
import { cn } from "@/lib/utils";
import { setReviewMenuAction } from "./actions";
import {
  MENU_NAME_MAX,
  clampMenuPrice,
  menuKey,
  menuNameCheck,
  menuNameLength,
  normalizeMenuName,
  type MenuStat,
} from "./model";
import type { MenuWriteResult } from "./requests";
import { menuReportsOn, usePlaceMenus } from "./use-place-menus";
import { read } from "@/lib/read";

const copy = menuCopy;
const TYPED = "__typed";

export type MenuChoice =
  | { readonly kind: "none" }
  | { readonly kind: "chip"; readonly key: string; readonly name: string }
  | { readonly kind: "typed"; readonly text: string };

/** 저장할 이름(정규화 뒤). 없거나 형식이 틀리면 null */
export function choiceName(c: MenuChoice): string | null {
  if (c.kind === "chip") return c.name;
  if (c.kind === "typed" && menuNameCheck(c.text) === "ok") return normalizeMenuName(c.text);
  return null;
}

/**
 * 시트 하나의 메뉴 선택 상태. 고치기 모드면 내 후기에 붙은 메뉴를 처음 값으로 받는다.
 * enabled가 false(플래그 꺼짐)면 아무것도 읽지 않는다.
 */
export function useMenuChoice(args: { placeId: string; reviewId: string | null; enabled: boolean }) {
  const on = args.enabled && menuReportsOn();
  const menus = usePlaceMenus(args.placeId, on);
  const mine = useQuery({
    queryKey: dbKeys.myReviewMenu(args.reviewId ?? ""),
    queryFn: () => read("myReviewMenuAction", args.reviewId ?? ""),
    enabled: on && args.reviewId !== null,
    staleTime: 60_000,
    retry: false,
  });
  const [choice, setChoice] = useState<MenuChoice | null>(null);
  // 고치기 모드의 처음 값: 받은 메뉴가 칩에 있으면 칩, 없으면 직접 쓰기
  const initialName = mine.data?.name ?? null;
  const list = menus.data ?? [];
  const initial: MenuChoice =
    initialName === null
      ? { kind: "none" }
      : list.some((m) => m.key === menuKey(initialName))
        ? { kind: "chip", key: menuKey(initialName), name: initialName }
        : { kind: "typed", text: initialName };
  const current = choice ?? initial;
  return {
    on,
    menus: list,
    loading: on && (menus.isPending || (args.reviewId !== null && mine.isPending)),
    choice: current,
    setChoice,
    /** 처음 값에서 바뀌었는가(고치기 모드에서 그대로면 저장하지 않는다) */
    changed: choiceName(current) !== initialName,
  };
}
export type MenuChoiceState = ReturnType<typeof useMenuChoice>;

/** 후기를 저장한 뒤 메뉴를 저장한다. 바뀐 것이 없으면 부르지 않는다. 실패는 결과로 돌려준다(시트는 닫고 알린다) */
export async function saveReviewMenu(args: {
  state: MenuChoiceState;
  reviewId: string;
  placeId: string;
  placeUrl: string | null;
  priceKrw: number | null;
}): Promise<MenuWriteResult | null> {
  const { state } = args;
  if (!state.on || !state.changed) return null;
  const name = choiceName(state.choice);
  // 메뉴를 골랐지만 가격을 비웠으면 메뉴도 남기지 않는다(MENU-01 메뉴를 고르면 가격 필수)
  const keep = name !== null && args.priceKrw !== null;
  const r = await setReviewMenuAction({
    reviewId: args.reviewId,
    placeId: args.placeId,
    placeUrl: args.placeUrl,
    name: keep ? name : null,
    priceKrw: keep ? args.priceKrw : null,
  }).catch((): MenuWriteResult => ({ ok: false, error: "save" }));
  if (r.ok && r.name) {
    track({
      name: "menu_reported",
      properties: {
        place_id: args.placeId,
        source: "feedback",
        picked: state.choice.kind === "chip" ? "chip" : "typed",
      },
    });
  }
  return r;
}

/** 가격 칸 위 메뉴 칩 + 직접 쓰기 칸 */
export function MenuField({
  state,
  estimateKrw,
  priceKrw,
  onPrice,
  disabled,
}: {
  state: MenuChoiceState;
  /** 직접 쓰기를 골랐는데 가격이 비어 있으면 이 값으로 채운다 */
  estimateKrw: number;
  priceKrw: number | null;
  onPrice: (v: number) => void;
  disabled?: boolean;
}) {
  const id = useId();
  if (!state.on) return null;
  const { choice, menus } = state;
  const value = choice.kind === "chip" ? [choice.key] : choice.kind === "typed" ? [TYPED] : [];

  function pick(next: unknown) {
    if (next === TYPED) {
      state.setChoice({ kind: "typed", text: choice.kind === "typed" ? choice.text : "" });
      if (priceKrw === null) onPrice(clampMenuPrice(estimateKrw));
      return;
    }
    const m = menus.find((x: MenuStat) => x.key === next);
    if (!m) {
      state.setChoice({ kind: "none" });
      return;
    }
    state.setChoice({ kind: "chip", key: m.key, name: m.name });
    onPrice(clampMenuPrice(m.medianKrw));
  }

  return (
    <div className="flex flex-col gap-2">
      {/* 보조 한 줄은 제목 옆(390 × 844에서 고지 한 줄까지 첫 화면, D-11 6절) */}
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h3 id={id} className="type-label text-foreground">
          {copy.feedback.ask}
        </h3>
        <p className="type-caption break-keep text-muted-foreground">
          {menus.length > 0 ? copy.feedback.askHint : copy.feedback.askHintEmpty}
        </p>
      </div>
      {state.loading ? (
        <span aria-hidden className="flex gap-2">
          <span className="h-9 w-28 rounded-chip bg-skeleton" />
          <span className="h-9 w-24 rounded-chip bg-skeleton" />
          <span className="h-9 w-20 rounded-chip bg-skeleton" />
        </span>
      ) : (
        <ChipGroup
          aria-labelledby={id}
          value={value}
          onValueChange={(v: unknown[]) => pick(v[0])}
          disabled={disabled}
        >
          {menus.slice(0, 3).map((m) => (
            <Chip key={m.key} value={m.key} className={cn("h-9 tabular-nums", hitArea44)}>
              {m.name}
              <span className="text-muted-foreground">{shortWon(m.medianKrw)}</span>
            </Chip>
          ))}
          <Chip value={TYPED} className={cn("h-9", hitArea44)}>
            {copy.feedback.typed}
          </Chip>
        </ChipGroup>
      )}
      {choice.kind === "typed" ? (
        <TypedInput
          text={choice.text}
          onText={(text) => state.setChoice({ kind: "typed", text })}
          disabled={disabled}
        />
      ) : null}
    </div>
  );
}

function TypedInput({
  text,
  onText,
  disabled,
}: {
  text: string;
  onText: (v: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const over = menuNameCheck(text) === "tooLong";
  return (
    <div className="mt-1 flex flex-col gap-1">
      <label htmlFor={id} className="sr-only">
        {copy.form.nameLabel}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          autoComplete="off"
          autoCorrect="off"
          enterKeyHint="done"
          autoFocus
          readOnly={disabled}
          aria-invalid={over || undefined}
          aria-describedby={`${id}-count`}
          placeholder={copy.form.placeholder}
          value={text}
          onChange={(e) => onText(e.target.value)}
          className={cn(
            "block h-12 w-full rounded-input border border-input bg-card pr-16 pl-4 type-body text-foreground outline-none placeholder:text-muted-foreground",
            "focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid",
            over && "border-destructive",
          )}
        />
        <span
          id={`${id}-count`}
          className={cn(
            "pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 type-caption tabular-nums",
            over ? "text-destructive" : "text-muted-foreground",
          )}
        >
          <span aria-hidden>{copy.form.count(menuNameLength(text), MENU_NAME_MAX)}</span>
          <span className="sr-only">{copy.form.countLabel(menuNameLength(text), MENU_NAME_MAX)}</span>
        </span>
      </div>
      {over ? (
        <p role="alert" className="type-caption text-destructive">
          {copy.form.tooLong(MENU_NAME_MAX)}
        </p>
      ) : null}
    </div>
  );
}
