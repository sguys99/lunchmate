"use client";
// 메모 시안 B: 이름표 시트 (T10.15, D-32).
// - 쓰는 곳: 상세 이름 바로 아래 "이름표"(테두리 알약, 메모 아이콘 + 글). 비어 있으면 같은 자리 "메모 남기기" 알약.
//   누르면 작은 시트(Base UI Drawer, 데스크톱은 가운데 대화상자)에 한 줄 입력 + 저장(시트 안 주 버튼) + 메모 지우기.
//   즐겨찾기 줄의 이름표도 같은 시트를 연다.
// - 보이는 곳: 상세 이름 아래, 즐겨찾기 줄 둘째 줄, **홈 큰 카드 배지 줄**(메모 배지가 배지 2개 상한 안에서 한 자리를 쓴다.
//   순서 웨이팅 > 메모 > 할인. 밀린 할인은 상세에서 본다).
// - 장애 대체: 상세 제목 자리에 이름표 상자(테두리, "내 메모" + 세리프 글), 즐겨찾기 줄도 이름표가 이름 자리로.
import { Plus, StickyNote } from "lucide-react";
import { useState } from "react";
import { PlaceBadges } from "@/components/badges/place-badges";
import { LoadingRegion, SkeletonLine } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing } from "@/components/ui/interaction";
import { cn } from "@/lib/utils";
import type { MemoParams } from "../params";
import {
  DETAIL_PLACE,
  DetailBody,
  DetailFooter,
  DetailFrame,
  DetailHeader,
  FAVORITES,
  FavRow,
  FavoritesSection,
  HomeBigCard,
  HomeMock,
  KakaoLink,
  MeHeader,
  MemoInput,
  MemoNote,
  MemoSheet,
  OfflineLine,
  SavedLine,
  ShellFrame,
  copy,
  saveLabel,
  useMemoDraft,
  type FavoriteMock,
  type MemoDraft,
} from "../shared";

export function MemoB({ p }: { p: MemoParams }) {
  if (p.view === "home") return <HomeB p={p} />;
  if (p.view === "favorites") return <FavoritesB p={p} />;
  if (p.view === "outage") return <OutageB p={p} />;
  return <DetailB p={p} />;
}

function DetailB({ p }: { p: MemoParams }) {
  const draft = useMemoDraft(p, DETAIL_PLACE.memo);
  const [open, setOpen] = useState(p.edit);
  const openSheet = () => {
    if (draft.offline) return;
    draft.start();
    setOpen(true);
  };
  return (
    <DetailFrame label={DETAIL_PLACE.name} footer={<DetailFooter offline={draft.offline} />}>
      {draft.offline ? <OfflineLine className="mb-4" /> : null}
      <DetailHeader />
      <div className="mt-3 flex flex-col gap-1">
        {draft.loading ? (
          <LoadingRegion label={copy.states.loading}>
            <span aria-hidden className="block h-8 w-44 rounded-chip bg-skeleton" />
          </LoadingRegion>
        ) : (
          <NameTag memo={draft.memo} onOpen={openSheet} disabled={draft.offline} name={DETAIL_PLACE.name} />
        )}
        <SavedLine draft={draft} />
      </div>
      <DetailBody />
      <MemoSheetB draft={draft} open={open} onOpenChange={setOpen} />
    </DetailFrame>
  );
}

/** 이름표 알약. 메모가 있으면 글, 없으면 "메모 남기기" */
function NameTag({
  memo,
  name,
  onOpen,
  disabled,
  size = "md",
}: {
  memo: string | null;
  name: string;
  onOpen: () => void;
  disabled?: boolean;
  size?: "md" | "sm";
}) {
  const Icon = memo ? StickyNote : Plus;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={memo ? `${copy.memo.label} ${memo}, ${copy.memo.editLabel(name)}` : copy.memo.addLabel(name)}
      aria-disabled={disabled || undefined}
      className={cn(
        "relative inline-flex w-fit max-w-full items-center gap-1.5 rounded-chip border text-left transition-colors duration-(--lm-duration-fast) ease-standard hover:bg-muted active:bg-muted aria-disabled:opacity-60 motion-reduce:transition-none",
        "after:absolute after:-inset-y-2 after:inset-x-0 after:content-['']",
        memo ? "border-input text-foreground" : "border-dashed border-border text-muted-foreground",
        size === "md" ? "min-h-8 px-3 type-body-sm" : "min-h-6 px-2 type-caption",
        focusRing,
      )}
    >
      <Icon aria-hidden className={cn("shrink-0 text-muted-foreground", size === "md" ? "size-4" : "size-3")} strokeWidth={1.5} />
      <span className="truncate">{memo ?? copy.memo.add}</span>
    </button>
  );
}

function MemoSheetB({
  draft,
  open,
  onOpenChange,
}: {
  draft: MemoDraft;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <MemoSheet
      open={open}
      onOpenChange={(o) => {
        if (!o) draft.cancel();
        onOpenChange(o);
      }}
      footer={
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={draft.save}
            aria-disabled={!draft.canSave || undefined}
            className={cn(buttonClass("primary"), "w-full")}
          >
            {saveLabel(draft)}
          </button>
          {draft.memo ? (
            <button type="button" onClick={draft.remove} className={cn(buttonClass("ghost"), "w-full text-muted-foreground")}>
              {copy.memo.remove}
            </button>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="type-body-sm break-keep text-muted-foreground">{copy.memo.sheetBody}</p>
        <MemoInput draft={draft} labelHidden autoFocus onEnter={draft.save} />
        <MemoNote draft={draft} />
      </div>
    </MemoSheet>
  );
}

/** 홈: 배지 줄에 메모 배지(최대 2개 안에서 한 자리) */
function HomeB({ p }: { p: MemoParams }) {
  const memo = p.state === "empty" ? null : DETAIL_PLACE.memo;
  return (
    <ShellFrame tab="today">
      <HomeMock
        card={
          <HomeBigCard
            badges={
              <>
                <PlaceBadges badges={[{ kind: "waiting", level: "short", minutesAgo: 12 }]} />
                {p.state === "loading" ? (
                  <span aria-hidden className="h-6 w-28 rounded-badge bg-skeleton" />
                ) : memo ? (
                  <Badge variant="neutral" className="max-w-40">
                    <StickyNote aria-hidden />
                    <span className="sr-only">{copy.memo.label} </span>
                    <span className="truncate">{memo}</span>
                  </Badge>
                ) : (
                  <PlaceBadges badges={[{ kind: "deal" }]} />
                )}
              </>
            }
          />
        }
      />
    </ShellFrame>
  );
}

function FavoritesB({ p }: { p: MemoParams }) {
  return (
    <ShellFrame tab="me">
      <MeHeader />
      {p.state === "loading" ? (
        <LoadingRegion label={copy.states.loading} className="flex flex-col gap-4 pt-4">
          <SkeletonLine type="label" className="w-32" />
          <SkeletonLine type="label" className="w-40" />
        </LoadingRegion>
      ) : (
        <FavoritesSection>
          {FAVORITES.map((f, i) => (
            <FavRowB key={f.placeId} p={p} item={f} index={i} />
          ))}
        </FavoritesSection>
      )}
    </ShellFrame>
  );
}

function FavRowB({ p, item, index }: { p: MemoParams; item: FavoriteMock; index: number }) {
  const draft = useMemoDraft({ ...p, edit: false, state: p.state === "error" ? "ready" : p.state }, item.memo);
  const [open, setOpen] = useState(false);
  const fallback = copy.fallback.saved(index + 1);
  const name = item.name ?? fallback;
  const openSheet = () => {
    if (draft.offline) return;
    draft.start();
    setOpen(true);
  };
  return (
    <>
      <FavRow
        item={item}
        title={
          item.name ? (
            <span className="truncate type-label">{item.name}</span>
          ) : draft.memo ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <StickyNote aria-hidden className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              <span className="sr-only">{copy.memo.label} </span>
              <span className="truncate type-label">{draft.memo}</span>
            </span>
          ) : (
            <span className="truncate type-label text-muted-foreground">{fallback}</span>
          )
        }
        sub={
          item.name ? (
            <span className="pt-1">
              <NameTag memo={draft.memo} name={name} onOpen={openSheet} disabled={draft.offline} size="sm" />
            </span>
          ) : (
            <KakaoLink placeId={item.placeId} target={draft.memo ?? fallback} />
          )
        }
      />
      <MemoSheetB draft={draft} open={open} onOpenChange={setOpen} />
    </>
  );
}

/** 카카오 장애: 상세 제목 자리에 이름표 상자 */
function OutageB({ p }: { p: MemoParams }) {
  const memo = p.state === "empty" ? null : DETAIL_PLACE.memo;
  return (
    <DetailFrame label={memo ?? copy.fallback.noMemo} footer={<DetailFooter unresolved />}>
      <DetailHeader
        unresolved
        nameSlot={
          memo ? (
            <div className="mt-1 flex flex-col gap-3">
              <div className="flex flex-col gap-1 rounded-card border border-input px-4 py-3">
                <span className="flex items-center gap-1.5 type-caption text-muted-foreground">
                  <StickyNote aria-hidden className="size-3.5" strokeWidth={1.5} />
                  {copy.memo.label}
                </span>
                <h2 className="type-heading font-heading break-keep">{memo}</h2>
              </div>
              <p className="type-body-sm break-keep text-muted-foreground">{copy.fallback.note}</p>
            </div>
          ) : (
            <div className="mt-1 flex flex-col gap-2">
              <h2 className="type-heading break-keep text-muted-foreground">{copy.fallback.noMemo}</h2>
              <p className="type-body-sm break-keep text-muted-foreground">{copy.fallback.body}</p>
            </div>
          )
        }
      />
      <DetailBody unresolved />
    </DetailFrame>
  );
}
