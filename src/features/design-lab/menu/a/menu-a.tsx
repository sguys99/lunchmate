"use client";
// 메뉴 시안 A: 가격 칸에 대표 메뉴 (T10.16b, D-34).
// - 홈 카드: 숫자 3칸의 가운데(가격) 칸 라벨이 "가격" 대신 대표 메뉴 이름, 숫자는 그 메뉴 가격 중앙값("9,000원").
//   카드 높이와 숫자 3개 규칙 그대로. 제보 2건 미만이면 지금처럼 "가격" + 가격대.
// - 상세: 숫자 3칸 아래 "메뉴" 표(이름 | 제보 수 | 가격, 3줄) + 줄 끝 "메뉴 알려주기".
// - 피드백 시트: 1인 가격 칸 위에 "뭐 드셨어요?" 칩(제보 메뉴 3개 + 직접 쓰기). 고르면 가격이 그 메뉴 중앙값에서 시작.
// - 알려주기: 작은 시트 한 장(이름 칸 + 가격 스테퍼).
import { Chip, ChipGroup } from "@/components/ui/chip";
import { CompactNumbers } from "@/features/place/detail/parts";
import { shortWon } from "@/features/feedback/review-draft";
import type { MenuParams } from "../params";
import {
  AddButton,
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
  SheetSave,
  ShellFrame,
  THUMBS,
  cardMenu,
  copy,
  menusFor,
  useMenuDraft,
  useReportSheet,
  won,
  type MenuDraft,
} from "../shared";

export function MenuA({ p }: { p: MenuParams }) {
  if (p.view === "detail" || p.view === "report") return <DetailA p={p} />;
  if (p.view === "feedback") return <FeedbackA p={p} />;
  return <HomeA p={p} />;
}

/** 홈: 가격 칸이 대표 메뉴 칸이 된다 */
function HomeA({ p }: { p: MenuParams }) {
  const top = cardMenu(p.state);
  return (
    <ShellFrame>
      <HomeMock
        card={
          <HomeBigCard
            numbers={
              p.state === "loading" ? (
                <CompactNumbers walkMinutes={PLACE.walkMinutes} price={PRICE} thumbs={THUMBS} pending className="mt-3" />
              ) : top ? (
                <MenuNumbers name={top.name} price={top.medianKrw} count={top.count} />
              ) : undefined
            }
          />
        }
      />
    </ShellFrame>
  );
}

/** CompactNumbers와 같은 3칸 격자, 가운데 칸만 메뉴 */
function MenuNumbers({ name, price, count }: { name: string; price: number; count: number }) {
  return (
    <dl className="mt-3 grid grid-cols-[0.8fr_1.3fr_0.9fr] divide-x divide-border">
      <div className="flex min-w-0 flex-col gap-1.5 pr-4">
        <dt className="type-caption text-muted-foreground">{copy.detail.walk}</dt>
        <dd className="flex min-h-[1.35rem] items-end gap-0.5 whitespace-nowrap">
          <span className="type-numeric-md">{PLACE.walkMinutes}</span>
          <span className="type-caption text-muted-foreground">분</span>
        </dd>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5 px-4 max-[23.75rem]:px-3">
        <dt className="truncate type-caption text-foreground">
          <span className="sr-only">{copy.menu.popular} </span>
          {name}
          <span className="sr-only">, {copy.menu.reportsLabel(count)}</span>
        </dt>
        <dd className="flex min-h-[1.35rem] items-end gap-0.5 whitespace-nowrap">
          <span className="type-numeric-md">{price.toLocaleString("ko-KR")}</span>
          <span className="type-caption text-muted-foreground">{copy.menu.priceUnit}</span>
        </dd>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5 pl-4">
        <dt className="type-caption text-muted-foreground">{copy.detail.thumbs}</dt>
        <dd className="flex min-h-[1.35rem] items-end gap-0.5 whitespace-nowrap">
          <span className="type-numeric-md">{THUMBS.percent}</span>
          <span className="type-caption text-muted-foreground">%</span>
        </dd>
      </div>
    </dl>
  );
}

/** 상세: 메뉴 표 3줄 + 알려주기. report 보기는 시트를 연 채로 */
function DetailA({ p }: { p: MenuParams }) {
  // 알려주기는 늘 직접 쓰기로 시작(이름 칸 빈 칸)
  const draft = useMenuDraft(p, { estimate: ESTIMATE, typedOnly: true });
  const sheet = useReportSheet(p, draft);
  const menus = menusFor(p.state);
  return (
    <SheetFrame label={PLACE.name} footer={<DetailFooter />}>
      {draft.offline ? <OfflineLine className="mb-4" /> : null}
      <DetailHeader />
      <DetailBody
        slot={
          <section aria-labelledby="menu-a-title" className="mt-6 flex flex-col gap-3">
            <h3 id="menu-a-title" className="type-label">
              {copy.menu.title}
            </h3>
            {p.state === "loading" ? (
              <MenuSkeleton />
            ) : menus.length === 0 ? (
              <MenuEmpty onAdd={sheet.openSheet} disabled={draft.offline} />
            ) : (
              <>
                <table className="w-full border-collapse">
                  <caption className="sr-only">{copy.menu.boardMeta(MENU_TOTAL, MENU_MONTH)}</caption>
                  <tbody>
                    {menus.map((m) => (
                      <tr key={m.key} className="border-b border-border last:border-b-0">
                        <th scope="row" className="py-2.5 pr-3 text-left type-body font-normal break-keep">
                          {m.name}
                        </th>
                        <td className="py-2.5 pr-3 text-right type-caption whitespace-nowrap text-muted-foreground tabular-nums">
                          <span aria-hidden>{copy.menu.reports(m.count)}</span>
                          <span className="sr-only">{copy.menu.reportsLabel(m.count)}</span>
                        </td>
                        <td className="w-24 py-2.5 text-right type-body whitespace-nowrap tabular-nums">{won(m.medianKrw)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <AddButton onAdd={sheet.openSheet} disabled={draft.offline} />
                  <NaverLink />
                </div>
              </>
            )}
          </section>
        }
      />
      <MenuSheet open={sheet.open} onOpenChange={sheet.setOpen} footer={<SheetSave draft={draft} />}>
        <ReportBodyA draft={draft} />
      </MenuSheet>
    </SheetFrame>
  );
}

function ReportBodyA({ draft }: { draft: MenuDraft }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="type-body-sm break-keep text-muted-foreground">{copy.menu.sheetBody}</p>
      <MenuNameInput draft={draft} autoFocus onEnter={draft.save} />
      <PriceStepper draft={draft} />
      <MenuNote draft={draft} />
    </div>
  );
}

/** 피드백: 가격 칸 위 메뉴 칩 */
function FeedbackA({ p }: { p: MenuParams }) {
  const draft = useMenuDraft(p, { estimate: ESTIMATE, menuOptional: true });
  const menus = draft.menus;
  return (
    <FeedbackSheet draft={draft}>
      <div role="group" aria-labelledby="menu-a-ask" className="flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <span id="menu-a-ask" className="type-label">
            {copy.menu.ask}
          </span>
          <span className="type-caption text-muted-foreground">
            {menus.length > 0 ? copy.menu.askHint : copy.menu.priceOnly}
          </span>
        </div>
        {p.state === "loading" ? (
          <span aria-hidden className="flex gap-2">
            <span className="h-10 w-28 rounded-chip bg-skeleton" />
            <span className="h-10 w-28 rounded-chip bg-skeleton" />
            <span className="h-10 w-20 rounded-chip bg-skeleton" />
          </span>
        ) : (
          <ChipGroup
            aria-labelledby="menu-a-ask"
            value={draft.typing ? ["__typed"] : draft.picked ? [draft.picked] : []}
            onValueChange={(v: unknown[]) => {
              const next = v[0];
              if (next === "__typed") draft.startTyping();
              else draft.pick(typeof next === "string" ? next : null);
            }}
            disabled={draft.offline}
          >
            {menus.map((m) => (
              <Chip key={m.key} value={m.key} className="tabular-nums">
                {m.name}
                <span className="text-muted-foreground">{shortWon(m.medianKrw)}</span>
              </Chip>
            ))}
            <Chip value="__typed">{copy.menu.typed}</Chip>
          </ChipGroup>
        )}
        {draft.typing ? <MenuNameInput draft={draft} className="mt-2" /> : null}
      </div>
      <PriceStepper draft={draft} label={copy.feedback.price} />
    </FeedbackSheet>
  );
}
