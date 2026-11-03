"use client";
// 메모 시안 C: 즐겨찾기 이름표 (T10.15, D-32).
// - 메모를 즐겨찾기에 묶는다(이름표). 즐겨찾기하지 않은 식당에는 쓸 수 없다(비교 문서 안건 4의 "묶음" 쪽).
// - 쓰는 곳: 상세에서 별을 켜면 하단 고정 줄 위에 "이름표를 달아 둘까요?" 띠가 4px 떠오르며 열린다(입력 + 저장 + 나중에).
//   나 탭 즐겨찾기 머리 "이름표 정리"를 누르면 모든 줄이 한 번에 입력 칸이 된다.
// - 보이는 곳: 상세 카테고리 줄 끝, **홈 큰 카드 "오늘의 한 곳" 줄 끝**(새 줄 없이 기존 caption 줄에 붙는다),
//   즐겨찾기 목록에서는 이름표가 제목, 카카오 이름이 둘째 줄.
// - 장애 대체: 홈 오류 카드 아래 "즐겨찾기에서 고르기"(PRD 12장 보조 동작). 이름표를 단 즐겨찾기 3곳 + 카카오맵 링크.
import { ExternalLink, Tag } from "lucide-react";
import { useState } from "react";
import { LoadingRegion, SkeletonLine } from "@/components/states";
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
  OfflineLine,
  SavedLine,
  ShellFrame,
  copy,
  kakaoLink,
  rowPlace,
  saveLabel,
  useMemoDraft,
  type FavoriteMock,
  type MemoDraft,
} from "../shared";
import { PlaceGlyph } from "@/features/me/history/parts";

export function MemoC({ p }: { p: MemoParams }) {
  if (p.view === "home") return <HomeC p={p} />;
  if (p.view === "favorites") return <FavoritesC p={p} />;
  if (p.view === "outage") return <OutageC p={p} />;
  return <DetailC p={p} />;
}

/** 카테고리 줄이나 "오늘의 한 곳" 줄 끝에 붙는 이름표(세로선 + 아이콘 + 글, 한 줄 말줄임) */
function EyebrowTag({ memo }: { memo: string }) {
  return (
    <>
      <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
      <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
        <Tag aria-hidden className="size-3 shrink-0" strokeWidth={1.75} />
        <span className="sr-only">{copy.tag.label} </span>
        <span className="truncate">{memo}</span>
      </span>
    </>
  );
}

function DetailC({ p }: { p: MemoParams }) {
  // edit=1은 "방금 별을 켠" 순간이라 아직 이름표가 없다
  const draft = useMemoDraft(p, p.edit ? null : DETAIL_PLACE.memo);
  const [favorite, setFavorite] = useState(p.state !== "empty");
  const [asking, setAsking] = useState(p.edit);
  const toggle = () => {
    const next = !favorite;
    setFavorite(next);
    if (next) {
      draft.start();
      setAsking(true);
    } else {
      setAsking(false);
    }
  };
  return (
    <DetailFrame
      label={DETAIL_PLACE.name}
      footer={
        <div className="flex flex-col">
          <AskStrip
            draft={draft}
            open={asking && favorite}
            onDone={() => setAsking(false)}
          />
          <DetailFooter favorite={favorite} onFavorite={toggle} offline={draft.offline} />
        </div>
      }
    >
      {draft.offline ? <OfflineLine className="mb-4" /> : null}
      <DetailHeader
        eyebrow={
          draft.loading ? (
            <span aria-hidden className="h-3 w-24 rounded-full bg-skeleton" />
          ) : favorite && draft.memo ? (
            <EyebrowTag memo={draft.memo} />
          ) : null
        }
      />
      <SavedLine draft={draft} className="mt-1 block" />
      <DetailBody />
    </DetailFrame>
  );
}

/** 별을 켠 뒤 하단 줄 위에 여는 이름표 띠 */
function AskStrip({ draft, open, onDone }: { draft: MemoDraft; open: boolean; onDone: () => void }) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-(--lm-duration-slow) ease-enter motion-reduce:transition-none",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="min-h-0 overflow-hidden" inert={!open}>
        <div className="flex flex-col gap-3 pb-4">
          <p className="type-body-sm break-keep">{copy.tag.ask}</p>
          <MemoInput
            draft={draft}
            label={copy.tag.inputLabel(DETAIL_PLACE.name)}
            labelHidden
            onEnter={() => {
              draft.save();
              if (draft.canSave) onDone();
            }}
          />
          <MemoNote draft={draft} />
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => {
                draft.cancel();
                onDone();
              }}
              className={buttonClass("ghost", "sm")}
            >
              {copy.tag.later}
            </button>
            <button
              type="button"
              onClick={() => {
                draft.save();
                if (draft.canSave && draft.check !== "empty") onDone();
              }}
              aria-disabled={!draft.canSave || undefined}
              className={buttonClass("secondary", "sm")}
            >
              {saveLabel(draft)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 홈: "오늘의 한 곳" 줄 끝에 이름표(새 줄 없음) */
function HomeC({ p }: { p: MemoParams }) {
  const memo = p.state === "empty" ? null : DETAIL_PLACE.memo;
  return (
    <ShellFrame tab="today">
      <HomeMock
        card={
          <HomeBigCard
            eyebrowEnd={
              p.state === "loading" ? (
                <span aria-hidden className="h-3 w-20 rounded-full bg-skeleton" />
              ) : memo ? (
                <EyebrowTag memo={memo} />
              ) : null
            }
          />
        }
      />
    </ShellFrame>
  );
}

/** 즐겨찾기: 이름표가 제목, 카카오 이름은 둘째 줄. "이름표 정리"로 모든 줄을 입력 칸으로 */
function FavoritesC({ p }: { p: MemoParams }) {
  const [manage, setManage] = useState(p.edit);
  const offline = p.state === "offline";
  return (
    <ShellFrame tab="me">
      <MeHeader />
      {offline ? <OfflineLine className="mb-4" /> : null}
      {p.state === "loading" ? (
        <LoadingRegion label={copy.states.loading} className="flex flex-col gap-4 pt-4">
          <SkeletonLine type="label" className="w-32" />
          <SkeletonLine type="label" className="w-40" />
        </LoadingRegion>
      ) : (
        <FavoritesSection
          headEnd={
            <button
              type="button"
              aria-pressed={manage}
              aria-disabled={offline || undefined}
              onClick={offline ? undefined : () => setManage((m) => !m)}
              className={cn("relative -mr-2 inline-flex min-h-11 items-center px-2 type-caption underline decoration-border underline-offset-[3px] aria-disabled:opacity-60", focusRing)}
            >
              {manage ? copy.tag.done : copy.tag.manage}
            </button>
          }
        >
          {FAVORITES.map((f, i) => (
            <FavRowC key={f.placeId} p={p} item={f} index={i} manage={manage} />
          ))}
        </FavoritesSection>
      )}
    </ShellFrame>
  );
}

function FavRowC({ p, item, index, manage }: { p: MemoParams; item: FavoriteMock; index: number; manage: boolean }) {
  const draft = useMemoDraft({ ...p, edit: manage, state: p.state === "error" && index > 0 ? "ready" : p.state }, item.memo);
  const fallback = copy.fallback.saved(index + 1);
  const kakaoName = item.name ?? fallback;
  if (manage) {
    return (
      <li className="flex flex-col gap-2 border-b border-border py-3">
        <span className="flex items-center gap-3">
          <PlaceGlyph place={rowPlace(item)} size={28} />
          <span className={cn("truncate type-label", !item.name && "text-muted-foreground")}>{kakaoName}</span>
        </span>
        <MemoInput
          draft={{ ...draft, editing: true }}
          label={copy.tag.inputLabel(kakaoName)}
          labelHidden
          onEnter={draft.save}
        />
        <MemoNote draft={draft} />
        <SavedLine draft={draft} />
      </li>
    );
  }
  const memo = draft.memo;
  return (
    <FavRow
      item={item}
      title={
        memo ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <Tag aria-hidden className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <span className="sr-only">{copy.tag.label} </span>
            <span className="truncate type-label">{memo}</span>
          </span>
        ) : (
          <span className={cn("truncate type-label", !item.name && "text-muted-foreground")}>{kakaoName}</span>
        )
      }
      sub={
        item.name ? (
          <span className="truncate type-caption text-muted-foreground">
            {memo ? item.name : copy.me.savedOn(item.savedOn)}
          </span>
        ) : (
          <KakaoLink placeId={item.placeId} target={memo ?? fallback} />
        )
      }
    />
  );
}

/** 카카오 장애: 홈 오류 카드 + 즐겨찾기에서 고르기(이름표 단 곳만, 최대 3) */
function OutageC({ p }: { p: MemoParams }) {
  const tagged = p.state === "empty" ? [] : FAVORITES.filter((f) => f.memo).slice(0, 3);
  return (
    <ShellFrame tab="today">
      <HomeMock
        card={
          <div role="alert" className="flex flex-col gap-3 rounded-card border border-border bg-card p-5">
            <h2 className="type-heading font-heading break-keep">{copy.home.outageTitle}</h2>
            <p className="type-body-sm break-keep text-muted-foreground">{copy.home.outageBody}</p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className={buttonClass("secondary", "sm")}>{copy.home.outageRetry}</span>
              <span className="inline-flex min-h-10 items-center gap-1 px-2 type-caption underline decoration-border underline-offset-[3px]">
                {copy.home.outageNaver}
                <ExternalLink aria-hidden className="size-3" strokeWidth={1.75} />
              </span>
            </div>
          </div>
        }
        below={
          tagged.length > 0 ? (
            <section aria-labelledby="memo-pick" className="mt-6 flex flex-col">
              <h2 id="memo-pick" className="type-caption text-muted-foreground">
                {copy.home.pickFromFavorites}
              </h2>
              <p className="mt-1 type-caption break-keep text-muted-foreground">{copy.home.pickFromFavoritesNote}</p>
              <ul className="mt-3 flex flex-col border-t border-border motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-slow)]">
                {tagged.map((f) => (
                  <li key={f.placeId}>
                    <a
                      href={kakaoLink(f.placeId)}
                      target="_blank"
                      rel="noreferrer"
                      className={cn("flex min-h-14 items-center gap-3 border-b border-border py-2", focusRing)}
                    >
                      <Tag aria-hidden className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                      <span className="min-w-0 flex-1 truncate type-label">{f.memo}</span>
                      <span className="flex shrink-0 items-center gap-1 type-caption text-muted-foreground">
                        {copy.fallback.kakaoMap}
                        <ExternalLink aria-hidden className="size-3" strokeWidth={1.75} />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="mt-6 type-caption break-keep text-muted-foreground">{copy.fallback.listNote}</p>
          )
        }
      />
    </ShellFrame>
  );
}
