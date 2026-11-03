"use client";
// 상세 메뉴판 (T10.16e, PRD MENU-02, MENU-03, D-35 C + 안건 4). 상세 시트 숫자 3칸과 배지 아래에 둔다.
// - 메뉴판 상자: 세리프 제목, "제보 N건 기준, 최근 M월", 이름 ......... 가격(점선 줄), 제보 수, 출처 한 줄, 네이버 플레이스 링크.
// - 맨 아래 "한 줄 더하기": 그 자리에서 이름 칸 + 가격 스테퍼 + 알려주기(보조 버튼, 상세 길찾기만 올리브)가 펼쳐진다.
//   이름 칸은 빈 칸에서 시작(카카오 장소명 미리 채우기 없음). 쓰는 동안 비교 키가 겹치는 기존 메뉴를 제안하고, 누르면 그 이름과 가격으로 바뀐다.
//   비로그인은 로그인 유도 시트. 오프라인은 버튼 aria-disabled + 위 안내.
// - 집계는 익명(place_menus). 추천 점수에 쓰지 않는다.
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Minus, Plus } from "lucide-react";
import { useId, useState } from "react";
import { LoadingRegion } from "@/components/states";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing, pressMotion } from "@/components/ui/interaction";
import { menuCopy } from "@/copy/menu";
import { useLoginPrompt } from "@/features/auth/login-prompt";
import { usePlaceUserState } from "@/features/place/detail/use-place-actions";
import { track } from "@/lib/analytics/track";
import { dbKeys } from "@/lib/query/db-keys";
import { cn } from "@/lib/utils";
import { reportMenuAction } from "./actions";
import {
  MENU_NAME_MAX,
  MENU_PRICE_MAX,
  MENU_PRICE_MIN,
  MENU_PRICE_STEP,
  clampMenuPrice,
  menuNameCheck,
  menuNameLength,
  monthOf,
  normalizeMenuName,
  suggestMenus,
  type MenuStat,
} from "./model";
import type { MenuReportError } from "./requests";
import { usePlaceMenus } from "./use-place-menus";

const copy = menuCopy;

export type MenuBoardProps = {
  placeId: string;
  placeUrl: string;
  /** 스크린 리더 이름에 쓰는 식당 이름(모르면 null) */
  name: string | null;
  /** 네이버 플레이스 검색 링크(이름을 모르면 null) */
  naverUrl: string | null;
  /** 가격 스테퍼 시작값(제보 중앙값 또는 카테고리 추정) */
  estimateKrw: number;
  online: boolean;
  className?: string;
};

export function MenuBoard(p: MenuBoardProps) {
  const titleId = useId();
  const menus = usePlaceMenus(p.placeId);
  const [adding, setAdding] = useState(false);
  const user = usePlaceUserState(p.placeId);
  const login = useLoginPrompt();
  const list = menus.data ?? [];
  const total = list.reduce((n, m) => n + m.count, 0);
  const latest = list.reduce<string | null>(
    (a, m) => (a === null || m.lastMonth > a ? m.lastMonth : a),
    null,
  );
  const target = p.name ?? copy.board.thisPlace;

  function openAdd() {
    if (!p.online) return;
    if (user.data && !user.data.signedIn) {
      login.prompt("save");
      return;
    }
    setAdding(true);
  }

  return (
    <section
      aria-labelledby={titleId}
      className={cn("rounded-card border border-border bg-card px-5 pt-4 pb-3", p.className)}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={titleId} className="type-heading font-heading">
          {copy.board.title}
        </h3>
        {list.length > 0 ? (
          <span className="type-caption text-muted-foreground tabular-nums">
            {copy.board.meta(total, latest ? monthOf(latest) : null)}
          </span>
        ) : null}
      </div>

      {menus.isPending ? (
        <LoadingRegion label={copy.board.loading} className="mt-4 mb-2 flex flex-col gap-3">
          {["w-28", "w-24", "w-20"].map((w) => (
            <span key={w} aria-hidden className="flex items-center justify-between gap-4">
              <span className={cn("h-4 rounded-badge bg-skeleton", w)} />
              <span className="h-4 w-16 rounded-badge bg-skeleton" />
            </span>
          ))}
        </LoadingRegion>
      ) : menus.isError ? (
        <p role="status" className="mt-3 mb-1 type-body-sm break-keep text-muted-foreground">
          {copy.board.loadFailed}
        </p>
      ) : list.length === 0 && !adding ? (
        <div className="mt-3 mb-1 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="type-label break-keep">{copy.board.emptyTitle}</p>
            <p className="type-body-sm break-keep text-muted-foreground">{copy.board.emptyBody}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={p.online ? openAdd : undefined}
              aria-disabled={!p.online || undefined}
              className={cn(
                "relative inline-flex min-h-9 w-fit items-center gap-1.5 rounded-chip border border-dashed border-border px-3 type-body-sm text-foreground hover:bg-muted active:bg-muted aria-disabled:opacity-60",
                "after:absolute after:-inset-y-1.5 after:inset-x-0 after:content-['']",
                focusRing,
              )}
            >
              <Plus aria-hidden className="size-4 text-muted-foreground" strokeWidth={1.5} />
              {copy.board.add}
            </button>
            {p.naverUrl ? <NaverLink href={p.naverUrl} /> : null}
          </div>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col">
          {list.map((m) => (
            <li key={m.key} className="flex min-h-11 items-baseline gap-2 py-1.5">
              <span className="min-w-0 shrink type-body break-keep">{m.name}</span>
              <span className="shrink-0 type-caption text-muted-foreground tabular-nums">
                <span aria-hidden>{m.count}</span>
                <span className="sr-only">{copy.board.reportsLabel(m.count)}</span>
              </span>
              <span
                aria-hidden
                className="min-w-4 flex-1 translate-y-[-0.2rem] border-b border-dotted border-border"
              />
              <span className="shrink-0 type-body tabular-nums">
                {m.medianKrw.toLocaleString("ko-KR")}
                {copy.form.priceUnit}
              </span>
            </li>
          ))}
        </ul>
      )}

      {menus.isPending || menus.isError ? null : adding ? (
        <InlineAdd {...p} menus={list} onClose={() => setAdding(false)} />
      ) : list.length > 0 ? (
        <button
          type="button"
          onClick={p.online ? openAdd : undefined}
          aria-label={copy.board.addLabel(target)}
          aria-disabled={!p.online || undefined}
          className={cn(
            "mt-1 flex min-h-11 w-full items-center gap-1.5 border-t border-dashed border-border pt-1 text-left type-body-sm text-muted-foreground hover:text-foreground aria-disabled:opacity-60",
            focusRing,
          )}
        >
          <Plus aria-hidden className="size-4" strokeWidth={1.5} />
          {copy.board.addRow}
        </button>
      ) : null}

      {list.length > 0 ? (
        <div className="mt-2 flex flex-col gap-1 border-t border-border pt-3">
          <p className="type-caption break-keep text-muted-foreground">{copy.board.note}</p>
          {p.naverUrl ? <NaverLink href={p.naverUrl} /> : null}
        </div>
      ) : null}
      {login.sheet}
    </section>
  );
}

function NaverLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "relative inline-flex min-h-9 w-fit items-center gap-1 type-body-sm text-muted-foreground underline decoration-border underline-offset-[3px] hover:text-foreground",
        "after:absolute after:-inset-y-1.5 after:inset-x-0 after:content-['']",
        focusRing,
      )}
    >
      {copy.board.naver}
      <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.5} />
    </a>
  );
}

type Status = "idle" | "saving" | "saved" | MenuReportError;

/** 메뉴판 안 한 줄 더하기 */
function InlineAdd({
  placeId,
  placeUrl,
  estimateKrw,
  online,
  menus,
  onClose,
}: MenuBoardProps & { menus: readonly MenuStat[]; onClose: () => void }) {
  const client = useQueryClient();
  const id = useId();
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | null>(null);
  const [picked, setPicked] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const check = menuNameCheck(name);
  const shown = price ?? clampMenuPrice(estimateKrw);
  const hits = suggestMenus(name, menus).slice(0, 3);
  const failed = status !== "idle" && status !== "saving" && status !== "saved";
  const canSave = online && status !== "saving" && status !== "daily" && check === "ok";

  async function save() {
    if (!canSave) return;
    setStatus("saving");
    const r = await reportMenuAction({ placeId, placeUrl, name, priceKrw: shown }).catch(
      () => ({ ok: false as const, error: "save" as const }),
    );
    if (!r.ok) {
      setStatus(r.error);
      return;
    }
    track({
      name: "menu_reported",
      properties: { place_id: placeId, source: "detail", picked: picked ? "chip" : "typed" },
    });
    setStatus("saved");
    void client.invalidateQueries({ queryKey: dbKeys.placeMenus(placeId) });
  }

  if (status === "saved") {
    return (
      <p role="status" className="mt-2 border-t border-dashed border-border pt-3 pb-1 type-body-sm text-muted-foreground">
        {copy.form.saved}
      </p>
    );
  }

  const note = !online
    ? copy.errors.offline
    : check === "tooLong"
      ? copy.form.tooLong(MENU_NAME_MAX)
      : failed
        ? copy.errors[status]
        : null;
  const round = cn(
    "inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-border text-foreground hover:bg-muted active:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-40",
    pressMotion,
    focusRing,
  );
  const bad = check === "tooLong" || status === "banned" || status === "invalid";

  return (
    <div className="mt-2 flex flex-col gap-4 border-t border-dashed border-border pt-4 pb-2">
      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="type-label">
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
            aria-describedby={`${id}-count`}
            aria-invalid={bad || undefined}
            readOnly={!online}
            placeholder={copy.form.placeholder}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setPicked(false);
              if (status === "banned" || status === "invalid" || status === "save" || status === "duplicate")
                setStatus("idle");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void save();
              }
            }}
            className={cn(
              "block h-12 w-full rounded-input border border-input bg-card pr-16 pl-4 type-body text-foreground outline-none placeholder:text-muted-foreground",
              "transition-[border-color] duration-(--lm-duration-fast) ease-standard focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid motion-reduce:transition-none",
              bad && "border-destructive",
            )}
          />
          <span
            id={`${id}-count`}
            className={cn(
              "pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 type-caption tabular-nums",
              check === "tooLong" ? "text-destructive" : "text-muted-foreground",
            )}
          >
            <span aria-hidden>{copy.form.count(menuNameLength(name), MENU_NAME_MAX)}</span>
            <span className="sr-only">{copy.form.countLabel(menuNameLength(name), MENU_NAME_MAX)}</span>
          </span>
        </div>
        {hits.length > 0 ? (
          <ul
            aria-label={copy.form.suggest}
            className="flex flex-col divide-y divide-border rounded-input border border-border"
          >
            {hits.map((m) => (
              <li key={m.key}>
                <button
                  type="button"
                  onClick={() => {
                    setName(normalizeMenuName(m.name));
                    setPrice(clampMenuPrice(m.medianKrw));
                    setPicked(true);
                  }}
                  aria-label={copy.form.suggestPick(m.name)}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 px-4 text-left hover:bg-muted active:bg-muted",
                    focusRing,
                  )}
                >
                  <span className="min-w-0 flex-1 truncate type-body-sm">{m.name}</span>
                  <span className="type-body-sm tabular-nums">
                    {m.medianKrw.toLocaleString("ko-KR")}
                    {copy.form.priceUnit}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div role="group" aria-labelledby={`${id}-price`} className="flex flex-col gap-2">
        <span id={`${id}-price`} className="type-label">
          {copy.form.priceLabel}
        </span>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label={copy.form.priceDecrease}
            aria-disabled={!online || shown <= MENU_PRICE_MIN || undefined}
            onClick={() => setPrice(clampMenuPrice(shown - MENU_PRICE_STEP))}
            className={round}
          >
            <Minus aria-hidden className="size-5" strokeWidth={1.5} />
          </button>
          <p
            aria-live="polite"
            className={cn(
              "flex items-baseline gap-1 tabular-nums",
              price === null ? "text-muted-foreground" : "text-foreground",
            )}
          >
            <span className="type-numeric-lg">{shown.toLocaleString("ko-KR")}</span>
            <span className="type-body-sm">{copy.form.priceUnit}</span>
          </p>
          <button
            type="button"
            aria-label={copy.form.priceIncrease}
            aria-disabled={!online || shown >= MENU_PRICE_MAX || undefined}
            onClick={() => setPrice(clampMenuPrice(shown + MENU_PRICE_STEP))}
            className={round}
          >
            <Plus aria-hidden className="size-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {note ? (
        <p
          role={failed || check === "tooLong" ? "alert" : "status"}
          className={cn(
            "type-body-sm break-keep",
            (failed && status !== "daily" && status !== "duplicate") || check === "tooLong"
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          {note}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button type="button" onClick={onClose} className={cn(buttonClass("ghost"), "flex-1")}>
          {copy.form.cancel}
        </button>
        <button
          type="button"
          onClick={() => void save()}
          aria-disabled={!canSave || undefined}
          aria-busy={status === "saving" || undefined}
          className={cn(buttonClass("secondary"), "flex-1")}
        >
          {status === "saving"
            ? copy.form.saving
            : failed && status !== "daily" && status !== "duplicate"
              ? copy.form.retry
              : copy.form.save}
        </button>
      </div>
    </div>
  );
}
