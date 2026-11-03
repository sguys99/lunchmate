"use client";
// 메뉴 시안 C: 카드는 그대로, 상세 메뉴판 (T10.16b, D-34).
// - 홈 카드: 바꾸지 않는다(10초 원칙, 홈 JS 예산 여유 0.1 KB). 메뉴는 "상세"를 눌러야 보인다.
// - 상세: 숫자 3칸 아래 "메뉴판" 상자(세리프 제목, 이름 ......... 가격 점선 줄, 제보 수, 출처 한 줄).
//   상자 맨 아래 "한 줄 더하기"를 누르면 그 자리에서 이름 칸 + 가격 스테퍼 + 알려주기(보조 버튼)가 펼쳐진다(시트 없음).
// - 피드백 시트: D-11 항목 줄에 "먹은 메뉴" 줄을 더한다. 누르면 작은 시트에서 라디오 목록(제보 메뉴 + 직접 쓰기)으로 고른다.
import { ChevronRight, Plus } from "lucide-react";
import { useId, useState } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing } from "@/components/ui/interaction";
import { CompactNumbers } from "@/features/place/detail/parts";
import { cn } from "@/lib/utils";
import type { MenuParams } from "../params";
import {
  DetailBody,
  DetailFooter,
  DetailHeader,
  ESTIMATE,
  FeedbackSheet,
  HomeBigCard,
  HomeMock,
  MENU_MONTH,
  MENU_TOTAL,
  MenuEmpty,
  MenuNameInput,
  MenuNote,
  MenuSheet,
  MenuSkeleton,
  NaverLink,
  OfflineLine,
  PLACE,
  PRICE,
  PriceStepper,
  SheetFrame,
  ShellFrame,
  THUMBS,
  copy,
  menusFor,
  saveLabel,
  useMenuDraft,
  won,
  type MenuDraft,
} from "../shared";

export function MenuC({ p }: { p: MenuParams }) {
  if (p.view === "detail" || p.view === "report") return <DetailC p={p} />;
  if (p.view === "feedback") return <FeedbackC p={p} />;
  return <HomeC p={p} />;
}

/** 홈: 지금 카드 그대로(비교용) */
function HomeC({ p }: { p: MenuParams }) {
  return (
    <ShellFrame>
      <HomeMock
        card={
          <HomeBigCard
            numbers={
              p.state === "loading" ? (
                <CompactNumbers walkMinutes={PLACE.walkMinutes} price={PRICE} thumbs={THUMBS} pending className="mt-3" />
              ) : undefined
            }
          />
        }
      />
    </ShellFrame>
  );
}

function DetailC({ p }: { p: MenuParams }) {
  const draft = useMenuDraft(p, { estimate: ESTIMATE, typedOnly: true });
  const [adding, setAdding] = useState(p.edit || p.view === "report");
  const menus = menusFor(p.state);
  const titleId = useId();
  const showAdd = () => {
    if (!draft.offline) setAdding(true);
  };
  return (
    <SheetFrame label={PLACE.name} footer={<DetailFooter />}>
      {draft.offline ? <OfflineLine className="mb-4" /> : null}
      <DetailHeader />
      <DetailBody
        slot={
          <section aria-labelledby={titleId} className="mt-6 rounded-card border border-border bg-card px-5 pt-4 pb-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 id={titleId} className="type-heading font-heading">
                {copy.menu.boardTitle}
              </h3>
              {menus.length > 0 && p.state !== "loading" ? (
                <span className="type-caption text-muted-foreground tabular-nums">
                  {copy.menu.boardMeta(MENU_TOTAL, MENU_MONTH)}
                </span>
              ) : null}
            </div>
            {p.state === "loading" ? (
              <MenuSkeleton className="mt-4 mb-2" />
            ) : menus.length === 0 && !adding ? (
              <MenuEmpty onAdd={showAdd} disabled={draft.offline} className="mt-3 mb-1" />
            ) : (
              <ul className="mt-3 flex flex-col">
                {menus.map((m) => (
                  <li key={m.key} className="flex min-h-11 items-baseline gap-2 py-1.5">
                    <span className="shrink-0 type-body break-keep">{m.name}</span>
                    <span className="shrink-0 type-caption text-muted-foreground tabular-nums">
                      <span aria-hidden>{m.count}</span>
                      <span className="sr-only">{copy.menu.reportsLabel(m.count)}</span>
                    </span>
                    <span aria-hidden className="min-w-4 flex-1 translate-y-[-0.2rem] border-b border-dotted border-border" />
                    <span className="shrink-0 type-body tabular-nums">{won(m.medianKrw)}</span>
                  </li>
                ))}
              </ul>
            )}
            {p.state === "loading" ? null : adding ? (
              <InlineAdd draft={draft} onCancel={() => setAdding(false)} />
            ) : menus.length > 0 ? (
              <button
                type="button"
                onClick={draft.offline ? undefined : showAdd}
                aria-label={`${PLACE.name} ${copy.menu.boardTitle} ${copy.menu.addRow}`}
                aria-disabled={draft.offline || undefined}
                className={cn(
                  "mt-1 flex min-h-11 w-full items-center gap-1.5 border-t border-dashed border-border pt-1 text-left type-body-sm text-muted-foreground hover:text-foreground aria-disabled:opacity-60",
                  focusRing,
                )}
              >
                <Plus aria-hidden className="size-4" strokeWidth={1.5} />
                {copy.menu.addRow}
              </button>
            ) : null}
            {menus.length > 0 && p.state !== "loading" ? (
              <div className="mt-2 flex flex-col gap-1 border-t border-border pt-3">
                <p className="type-caption break-keep text-muted-foreground">{copy.menu.boardNote}</p>
                <NaverLink className="w-fit" />
              </div>
            ) : null}
          </section>
        }
        folds={copy.detail.folds}
      />
    </SheetFrame>
  );
}

/** 메뉴판 안에서 펼치는 한 줄 더하기. 상세 길찾기가 이미 올리브 면이라 알려주기는 보조 버튼 */
function InlineAdd({ draft, onCancel }: { draft: MenuDraft; onCancel: () => void }) {
  if (draft.status === "saved") {
    return (
      <p role="status" className="mt-2 border-t border-dashed border-border pt-3 type-body-sm text-muted-foreground">
        {copy.menu.saved}
      </p>
    );
  }
  return (
    <div className="mt-2 flex flex-col gap-4 border-t border-dashed border-border pt-4 pb-2">
      <MenuNameInput draft={draft} autoFocus={!draft.offline} onEnter={draft.save} />
      <PriceStepper draft={draft} />
      <MenuNote draft={draft} />
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className={cn(buttonClass("ghost"), "flex-1")}>
          {copy.menu.cancel}
        </button>
        <button
          type="button"
          onClick={draft.save}
          aria-disabled={!draft.canSave || undefined}
          className={cn(buttonClass("secondary"), "flex-1")}
        >
          {saveLabel(draft)}
        </button>
      </div>
    </div>
  );
}

/** 피드백: "먹은 메뉴" 항목 줄 → 작은 시트 라디오 목록 */
function FeedbackC({ p }: { p: MenuParams }) {
  const draft = useMenuDraft(p, { estimate: ESTIMATE, menuOptional: true });
  // 오류는 본 시트 저장에서 나므로 작은 시트는 edit=1일 때만 연 채로 시작
  const [open, setOpen] = useState(p.edit && p.state !== "error");
  const value = draft.pickedMenu?.name ?? (draft.typing && draft.nameCheck === "ok" ? draft.name.trim() : null);
  return (
    <FeedbackSheet draft={draft}>
      {p.state === "loading" ? (
        <span aria-hidden className="block h-12 w-full rounded-input bg-skeleton" />
      ) : (
        <button
          type="button"
          onClick={draft.offline ? undefined : () => setOpen(true)}
          aria-disabled={draft.offline || undefined}
          aria-haspopup="dialog"
          className={cn(
            "-mt-5 flex min-h-12 w-full items-center justify-between gap-3 border-b border-border text-left aria-disabled:opacity-60",
            focusRing,
          )}
        >
          <span className="type-label">{copy.feedback.menuRow}</span>
          <span className="flex min-w-0 items-center gap-1 type-body-sm">
            <span className={cn("truncate", value ? "text-foreground" : "text-muted-foreground")}>
              {value ?? copy.feedback.menuEmpty}
            </span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          </span>
        </button>
      )}
      <PriceStepper draft={draft} label={copy.feedback.price} />
      <MenuSheet
        title={copy.menu.ask}
        open={open}
        onOpenChange={setOpen}
        footer={
          <button type="button" onClick={() => setOpen(false)} className={cn(buttonClass("primary"), "w-full")}>
            {copy.menu.done}
          </button>
        }
      >
        <MenuRadios draft={draft} />
      </MenuSheet>
    </FeedbackSheet>
  );
}

function MenuRadios({ draft }: { draft: MenuDraft }) {
  const name = useId();
  const current = draft.typing ? "__typed" : (draft.picked ?? "");
  const row = "flex min-h-12 items-center gap-3 border-b border-border";
  return (
    <fieldset className="flex flex-col">
      <legend className="mb-2 type-body-sm text-muted-foreground">{copy.menu.askHint}</legend>
      {draft.menus.map((m) => (
        <label key={m.key} className={row}>
          <input
            type="radio"
            name={name}
            value={m.key}
            checked={current === m.key}
            onChange={() => draft.pick(m.key)}
            className="size-5 accent-primary"
          />
          <span className="min-w-0 flex-1 truncate type-body">{m.name}</span>
          <span className="type-body-sm tabular-nums">{won(m.medianKrw)}</span>
        </label>
      ))}
      <label className={row}>
        <input
          type="radio"
          name={name}
          value="__typed"
          checked={current === "__typed"}
          onChange={draft.startTyping}
          className="size-5 accent-primary"
        />
        <span className="type-body">{copy.menu.typed}</span>
      </label>
      {draft.typing ? <MenuNameInput draft={draft} autoFocus className="mt-4" /> : null}
    </fieldset>
  );
}
