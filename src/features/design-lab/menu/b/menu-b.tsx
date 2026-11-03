"use client";
// 메뉴 시안 B: 이유 아래 메뉴 줄 + 검색형 입력 (T10.16b, D-34).
// - 홈 카드: 숫자 3칸은 그대로(가격대). 이유 한 줄 바로 아래 작은 줄 "많이 먹는 메뉴 | 돼지국밥 9,000원".
//   카드가 한 줄(약 20px) 길어진다. 제보 2건 미만이면 줄을 그리지 않는다(카드 높이가 식당마다 달라짐).
// - 상세: 숫자 3칸 아래 메뉴 타일 가로 줄(이름, 가격, 제보 수) + 끝 타일 "알려주기". 모바일은 가로 스크롤, 데스크톱은 줄바꿈.
// - 피드백 시트와 알려주기: 이름 칸에 쓰면 아래에 제보된 메뉴가 걸러져 보이고, 누르면 그 메뉴로 고른다(검색형 한 칸).
import { Check, Plus } from "lucide-react";
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
  MenuEmpty,
  MenuNameInput,
  MenuNote,
  MenuSheet,
  NaverLink,
  OfflineLine,
  PLACE,
  PRICE,
  PriceStepper,
  SheetFrame,
  SheetSave,
  ShellFrame,
  THUMBS,
  cardMenu,
  copy,
  menuKey,
  menusFor,
  useMenuDraft,
  useReportSheet,
  won,
  type MenuDraft,
} from "../shared";

export function MenuB({ p }: { p: MenuParams }) {
  if (p.view === "detail" || p.view === "report") return <DetailB p={p} />;
  if (p.view === "feedback") return <FeedbackB p={p} />;
  return <HomeB p={p} />;
}

function HomeB({ p }: { p: MenuParams }) {
  const top = cardMenu(p.state);
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
            afterReason={
              p.state === "loading" ? (
                <span aria-hidden className="mt-1.5 block h-4 w-44 rounded-badge bg-skeleton" />
              ) : top ? (
                <p className="mt-1.5 flex min-w-0 items-center gap-2 type-body-sm">
                  <span className="shrink-0 type-caption text-muted-foreground">{copy.menu.popular}</span>
                  <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
                  <span className="min-w-0 truncate">{top.name}</span>
                  <span className="shrink-0 tabular-nums">{won(top.medianKrw)}</span>
                </p>
              ) : null
            }
          />
        }
      />
    </ShellFrame>
  );
}

function DetailB({ p }: { p: MenuParams }) {
  const draft = useMenuDraft(p, { estimate: ESTIMATE, typedOnly: true });
  const sheet = useReportSheet(p, draft);
  const menus = menusFor(p.state);
  const tile = "flex w-36 shrink-0 flex-col gap-1 rounded-card border border-border bg-card px-4 py-3 desktop:w-auto";
  return (
    <SheetFrame label={PLACE.name} footer={<DetailFooter />}>
      {draft.offline ? <OfflineLine className="mb-4" /> : null}
      <DetailHeader />
      <DetailBody
        slot={
          <section aria-labelledby="menu-b-title" className="mt-6 flex flex-col gap-3">
            <h3 id="menu-b-title" className="type-label">
              {copy.menu.title}
            </h3>
            {p.state === "loading" ? (
              <div aria-busy className="flex gap-2 overflow-hidden">
                {[0, 1, 2].map((i) => (
                  <span key={i} aria-hidden className="h-[5.25rem] w-36 shrink-0 rounded-card bg-skeleton" />
                ))}
                <span className="sr-only">{copy.states.loading}</span>
              </div>
            ) : menus.length === 0 ? (
              <MenuEmpty onAdd={sheet.openSheet} disabled={draft.offline} />
            ) : (
              <>
                <ul className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 desktop:mx-0 desktop:grid desktop:grid-cols-2 desktop:overflow-visible desktop:px-0">
                  {menus.map((m) => (
                    <li key={m.key} className={tile}>
                      <span className="truncate type-body-sm">{m.name}</span>
                      <span className="type-numeric-md tabular-nums">{won(m.medianKrw)}</span>
                      <span className="type-caption text-muted-foreground tabular-nums">
                        <span aria-hidden>{copy.menu.reports(m.count)}</span>
                        <span className="sr-only">{copy.menu.reportsLabel(m.count)}</span>
                      </span>
                    </li>
                  ))}
                  <li className="flex shrink-0">
                    <button
                      type="button"
                      onClick={draft.offline ? undefined : sheet.openSheet}
                      aria-label={copy.menu.addLabel(PLACE.name)}
                      aria-disabled={draft.offline || undefined}
                      className={cn(
                        "flex w-28 flex-col items-start justify-center gap-1 rounded-card border border-dashed border-border px-4 py-3 text-left type-body-sm hover:bg-muted active:bg-muted aria-disabled:opacity-60 desktop:w-full",
                        focusRing,
                      )}
                    >
                      <Plus aria-hidden className="size-4 text-muted-foreground" strokeWidth={1.5} />
                      {copy.menu.addShort}
                    </button>
                  </li>
                </ul>
                <NaverLink className="w-fit" />
              </>
            )}
          </section>
        }
      />
      <MenuSheet open={sheet.open} onOpenChange={sheet.setOpen} footer={<SheetSave draft={draft} />}>
        <div className="flex flex-col gap-5">
          <p className="type-body-sm break-keep text-muted-foreground">{copy.menu.sheetBody}</p>
          <SearchField draft={draft} />
          <PriceStepper draft={draft} />
          <MenuNote draft={draft} />
        </div>
      </MenuSheet>
    </SheetFrame>
  );
}

/**
 * 검색형 한 칸: 이름을 쓰면 제보된 메뉴 가운데 비교 키가 겹치는 것만 아래에 보이고, 누르면 그 메뉴로 고른다.
 * 빈 칸이면 제보된 메뉴 전부(최대 3개)를 보인다. 고른 뒤에는 "고른 메뉴" 줄 + 바꾸기.
 */
function SearchField({ draft, label }: { draft: MenuDraft; label?: string }) {
  if (draft.pickedMenu) {
    return (
      <div className="flex flex-col gap-2">
        <span className="type-label">{label ?? copy.menu.nameLabel}</span>
        <div className="flex min-h-12 items-center gap-2 rounded-input border border-ring bg-card px-4">
          <Check aria-hidden className="size-4 shrink-0 text-success" strokeWidth={1.75} />
          <span className="min-w-0 flex-1 truncate type-body">{draft.pickedMenu.name}</span>
          <button
            type="button"
            onClick={draft.startTyping}
            className={cn("-mr-2 min-h-11 rounded-full px-2 type-body-sm text-muted-foreground underline underline-offset-[3px]", focusRing)}
          >
            {copy.menu.typed}
          </button>
        </div>
      </div>
    );
  }
  const q = menuKey(draft.name);
  const hits = draft.menus.filter((m) => q === "" || m.key.includes(q) || q.includes(m.key));
  return (
    <div className="flex flex-col gap-2">
      <MenuNameInput draft={draft} onEnter={draft.save} />
      {hits.length > 0 ? (
        <ul aria-label={copy.menu.popular} className="flex flex-col divide-y divide-border rounded-input border border-border">
          {hits.map((m) => (
            <li key={m.key}>
              <button
                type="button"
                onClick={() => draft.pick(m.key)}
                aria-disabled={draft.offline || undefined}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 px-4 text-left hover:bg-muted active:bg-muted aria-disabled:opacity-60",
                  focusRing,
                )}
              >
                <span className="min-w-0 flex-1 truncate type-body-sm">{m.name}</span>
                <span className="type-caption text-muted-foreground tabular-nums">{copy.menu.reports(m.count)}</span>
                <span className="w-20 text-right type-body-sm tabular-nums">{won(m.medianKrw)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function FeedbackB({ p }: { p: MenuParams }) {
  const draft = useMenuDraft(p, { estimate: ESTIMATE, typedOnly: true, menuOptional: true });
  return (
    <FeedbackSheet draft={draft}>
      <div className="flex flex-col gap-1">
        <h3 className="type-label">{copy.menu.ask}</h3>
        <p className="type-caption text-muted-foreground">{draft.menus.length > 0 ? copy.menu.askHint : copy.menu.priceOnly}</p>
      </div>
      {p.state === "loading" ? (
        <span aria-hidden className="block h-12 w-full rounded-input bg-skeleton" />
      ) : (
        <SearchField draft={draft} />
      )}
      <PriceStepper draft={draft} label={copy.feedback.price} />
    </FeedbackSheet>
  );
}
