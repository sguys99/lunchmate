"use client";
// 메모 시안 A: 상세 안 한 줄 (T10.15, D-32).
// - 쓰는 곳: 상세 시트의 "내 방문" 줄 바로 아래 헤어라인 한 줄. 비어 있으면 "메모 남기기" 글자 버튼(연필 아이콘, 터치 44).
//   누르면 그 자리에서 한 줄 입력으로 바뀐다(높이 base 260 grid-rows). 저장은 테두리 작은 버튼(올리브 면은 길찾기 하나뿐).
// - 보이는 곳: 상세의 메모 줄, 나 탭 즐겨찾기 줄의 둘째 줄(저장한 날 대신). 홈 카드에는 보이지 않는다(카드 정보량 그대로).
// - 장애 대체: 상세 제목 자리에 메모를 세리프 제목으로 + "내 메모" 표시 + 한 줄 설명. 즐겨찾기 줄도 메모가 이름 자리로.
import { Pencil } from "lucide-react";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing } from "@/components/ui/interaction";
import { LoadingRegion, SkeletonLine } from "@/components/states";
import { cn } from "@/lib/utils";
import type { MemoParams } from "../params";
import {
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
  OfflineLine,
  SavedLine,
  ShellFrame,
  copy,
  saveLabel,
  useMemoDraft,
  DETAIL_PLACE,
  type MemoDraft,
} from "../shared";

export function MemoA({ p }: { p: MemoParams }) {
  if (p.view === "home") {
    return (
      <ShellFrame tab="today">
        <HomeMock card={<HomeBigCard />} />
      </ShellFrame>
    );
  }
  if (p.view === "favorites") return <FavoritesA p={p} />;
  if (p.view === "outage") return <OutageA p={p} />;
  return <DetailA p={p} />;
}

function DetailA({ p }: { p: MemoParams }) {
  const draft = useMemoDraft(p, DETAIL_PLACE.memo);
  return (
    <DetailFrame label={DETAIL_PLACE.name} footer={<DetailFooter offline={draft.offline} />}>
      {draft.offline ? <OfflineLine className="mb-4" /> : null}
      <DetailHeader />
      <DetailBody slotAfterVisit={<MemoRowA draft={draft} />} />
    </DetailFrame>
  );
}

/** 상세 안 메모 한 줄. 보기 → 그 자리 입력 */
function MemoRowA({ draft }: { draft: MemoDraft }) {
  if (draft.loading) {
    return (
      <LoadingRegion label={copy.states.loading} className="mt-4 flex min-h-12 items-center border-y border-border">
        <SkeletonLine type="body-sm" className="w-[60%]" />
      </LoadingRegion>
    );
  }
  return (
    <div className="mt-4 border-y border-border">
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
          draft.editing ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden" inert={!draft.editing}>
          <div className="flex flex-col gap-3 py-4">
            <MemoInput draft={draft} autoFocus={draft.editing} onEnter={draft.save} />
            <MemoNote draft={draft} />
            <span className="-mt-1 type-caption text-muted-foreground">{copy.memo.privacy}</span>
            <div className="flex items-center justify-end gap-1">
              <div className="flex items-center gap-1">
                {draft.memo ? (
                  <button type="button" onClick={draft.remove} className={cn(buttonClass("ghost", "sm"), "text-muted-foreground")}>
                    {copy.memo.remove}
                  </button>
                ) : null}
                <button type="button" onClick={draft.cancel} className={buttonClass("ghost", "sm")}>
                  {copy.memo.cancel}
                </button>
                <button
                  type="button"
                  onClick={draft.save}
                  aria-disabled={!draft.canSave || undefined}
                  className={buttonClass("secondary", "sm")}
                >
                  {saveLabel(draft)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {draft.editing ? null : draft.memo ? (
        <div className="flex min-h-12 items-start gap-3 py-3">
          <Pencil aria-hidden className="mt-1 size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          <p className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="type-caption text-muted-foreground">{copy.memo.label}</span>
            <span className="type-body-sm break-keep">{draft.memo}</span>
          </p>
          <button
            type="button"
            onClick={draft.start}
            aria-label={copy.memo.editLabel(DETAIL_PLACE.name)}
            aria-disabled={draft.offline || undefined}
            className={cn("relative -mr-2 inline-flex min-h-11 shrink-0 items-center px-2 type-caption underline decoration-border underline-offset-[3px] aria-disabled:opacity-60", focusRing)}
          >
            {copy.memo.edit}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={draft.start}
          aria-label={copy.memo.addLabel(DETAIL_PLACE.name)}
          aria-disabled={draft.offline || undefined}
          className={cn("flex min-h-12 w-full items-center gap-3 py-3 text-left text-muted-foreground aria-disabled:opacity-60", focusRing)}
        >
          <Pencil aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
          <span className="type-body-sm">{copy.memo.add}</span>
          <span className="ml-auto type-caption">{copy.memo.privacy}</span>
        </button>
      )}
      <SavedLine draft={draft} className="block pb-2 empty:pb-0" />
    </div>
  );
}

function FavoritesA({ p }: { p: MemoParams }) {
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
          {FAVORITES.map((f, i) => {
            const memo = p.state === "empty" ? null : f.memo;
            const title = f.name ?? memo ?? copy.fallback.saved(i + 1);
            return (
              <FavRow
                key={f.placeId}
                item={f}
                title={
                  <span className={cn("truncate type-label", !f.name && !memo && "text-muted-foreground")}>{title}</span>
                }
                sub={
                  f.name ? (
                    memo ? (
                      <span className="flex min-w-0 items-center gap-1.5 type-caption text-muted-foreground">
                        <Pencil aria-hidden className="size-3 shrink-0" strokeWidth={1.75} />
                        <span className="sr-only">{copy.memo.label}</span>
                        <span className="truncate">{memo}</span>
                      </span>
                    ) : (
                      <span className="type-caption text-muted-foreground">{copy.me.savedOn(f.savedOn)}</span>
                    )
                  ) : (
                    <span className="flex items-center gap-2">
                      {memo ? <span className="type-caption text-muted-foreground">{copy.memo.label}</span> : null}
                      {memo ? <span aria-hidden className="h-3 w-px bg-border" /> : null}
                      <KakaoLink placeId={f.placeId} target={title} />
                    </span>
                  )
                }
              />
            );
          })}
        </FavoritesSection>
      )}
    </ShellFrame>
  );
}

/** 카카오 장애: 상세 제목 자리에 내 메모 */
function OutageA({ p }: { p: MemoParams }) {
  const memo = p.state === "empty" ? null : DETAIL_PLACE.memo;
  return (
    <DetailFrame label={memo ?? copy.fallback.noMemo} footer={<DetailFooter unresolved />}>
      <DetailHeader
        unresolved
        nameSlot={
          memo ? (
            <div className="mt-1 flex flex-col gap-2">
              <h2 className="type-heading font-heading break-keep">
                <span className="sr-only">{copy.memo.label} </span>
                {memo}
              </h2>
              <span className="flex items-center gap-1.5 type-caption text-muted-foreground">
                <Pencil aria-hidden className="size-3" strokeWidth={1.75} />
                {copy.memo.label}
              </span>
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
