"use client";
// 식당 상세의 메모 (T10.15, D-33 시안 B). PlaceDetailBody가 쓴다(상세 청크 안, 홈 첫 로드 밖).
// - 이름을 아는 상세: 이름 바로 아래 이름표 알약(DetailMemoTag). 누르면 작은 시트.
// - 이름을 모르는 상세(카카오 장애, 이름 확인 실패): 메모가 있으면 제목 자리에 이름표 상자(MemoNameHeader)와
//   "카카오에서 이름을 불러오지 못해 내 메모로 보여 드립니다." 메모가 없으면 기존 "이름을 불러오지 못했습니다." 머리 아래 알약.
// - 4상태: 메모 자리만 스켈레톤(상세 상태 쿼리를 받는 동안), 빈 상태(점선 "메모 남기기"), 저장 실패(시트 안 한 줄 + 다시 저장),
//   오프라인(받은 메모를 그대로 보이고 알약 aria-disabled + 한 줄).
// - 읽기는 상세 상태 쿼리(placeUserStateKey, 즐겨찾기와 같은 요청)의 memo. 비로그인이거나 플래그가 꺼지면 아무것도 없다.
import { StickyNote } from "lucide-react";
import { focusRing, hitArea44 } from "@/components/ui/interaction";
import { memoCopy as copy } from "@/copy/memo";
import { usePlaceUserState } from "@/features/place/detail/use-place-actions";
import { cn } from "@/lib/utils";
import { useMemoSheet } from "./memo-sheet";
import { NameTag, NameTagSkeleton, SavedLine } from "./name-tag";

export type DetailMemoState =
  | { show: false }
  | { show: true; loading: true }
  | { show: true; loading: false; memo: string | null };

/** 상세 메모 상태. enabled는 서버가 판정한 userPlaceMemo(props)와 실제 집계 여부 */
export function useDetailMemo(
  placeId: string,
  enabled: boolean,
): DetailMemoState {
  const state = usePlaceUserState(placeId, enabled);
  if (!enabled) return { show: false };
  if (state.isPending) return { show: true, loading: true };
  const data = state.data;
  if (!data?.signedIn || data.memo === undefined) return { show: false };
  return { show: true, loading: false, memo: data.memo };
}

type EditorProps = {
  placeId: string;
  placeUrl: string;
  /** 스크린 리더 이름에 쓰는 식당 이름(모르면 null) */
  name: string | null;
  online: boolean;
};

/** 이름 아래 이름표 줄(알약 + 결과 한 줄 + 오프라인 한 줄) */
export function DetailMemoTag({
  state,
  className,
  ...p
}: EditorProps & { state: DetailMemoState; className?: string }) {
  const editor = useMemoSheet();
  if (!state.show) return null;
  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      {state.loading ? (
        <NameTagSkeleton />
      ) : (
        <NameTag
          memo={state.memo}
          name={p.name ?? copy.thisPlace}
          disabled={!p.online}
          onPreload={editor.preload}
          onOpen={(el) =>
            editor.open(
              { placeId: p.placeId, placeUrl: p.placeUrl, memo: state.memo },
              el,
            )
          }
        />
      )}
      {!p.online && !state.loading ? (
        <p role="status" className="type-caption text-muted-foreground">
          {copy.states.offline}
        </p>
      ) : null}
      <SavedLine text={editor.result} />
      {editor.sheet}
    </div>
  );
}

/** 이름을 모를 때 제목 자리 이름표 상자(메모가 있을 때만 부른다) */
export function MemoNameHeader({
  memo,
  heading: Heading,
  ...p
}: EditorProps & { memo: string; heading: "h1" | "h2" }) {
  const editor = useMemoSheet();
  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 rounded-card border border-input px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 type-caption text-muted-foreground">
            <StickyNote aria-hidden className="size-3.5" strokeWidth={1.5} />
            {copy.label}
          </span>
          <button
            type="button"
            aria-label={copy.editLabel(memo)}
            aria-disabled={!p.online || undefined}
            onPointerEnter={editor.preload}
            onFocus={editor.preload}
            onClick={(e) => {
              if (p.online)
                editor.open(
                  { placeId: p.placeId, placeUrl: p.placeUrl, memo },
                  e.currentTarget,
                );
            }}
            className={cn(
              "relative inline-flex h-6 shrink-0 items-center rounded-sm px-0.5 type-caption text-muted-foreground underline decoration-border underline-offset-3 hover:text-foreground active:text-foreground aria-disabled:opacity-60",
              hitArea44,
              focusRing,
            )}
          >
            {copy.edit}
          </button>
        </div>
        <Heading className="type-heading font-heading break-keep">
          <span className="sr-only">{copy.label} </span>
          {memo}
        </Heading>
      </div>
      <p className="type-body-sm break-keep text-muted-foreground">
        {copy.fallback.note}
      </p>
      {!p.online ? (
        <p role="status" className="type-caption text-muted-foreground">
          {copy.states.offline}
        </p>
      ) : null}
      <SavedLine text={editor.result} />
      {editor.sheet}
    </header>
  );
}
