"use client";
// 베타 의견 시안 C: 전용 화면 /me/beta-feedback + 내가 보낸 의견 (T9.4).
// - 진입: 나 탭 머리 아래 안내 한 줄 "베타 기간입니다. 써 보며 느낀 점을 들려주세요." + "의견 보내기" 글자 링크.
// - 화면: 뒤로(44) + 제목, 위에 쓰는 칸(종류 칩, 내용, 화면 함께 보내기, 보내기), 아래 "내가 보낸 의견" 목록(날짜, 종류, 두 줄, 상태).
//   상태 "읽음"은 운영자가 관리자 화면에서 읽으면 바뀐다(안건 6). 보낸 의견은 목록 맨 위에 높이가 열리며 들어온다(base).
// - 시트가 아니라 화면이라 길게 쓰기 편하고, 보낸 것을 다시 볼 수 있다. 대신 진입이 한 번 더 이동이다.
import { ChevronLeft } from "lucide-react";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { MapPane, ShellSplit } from "@/components/app-shell/app-shell";
import { TabBarView } from "@/components/app-shell/tab-bar";
import { EmptyState, ListSkeleton } from "@/components/states";
import { focusRing } from "@/components/ui/interaction";
import { cn } from "@/lib/utils";
import type { BetaCategory, BetaFeedbackParams } from "../params";
import {
  AttachRow,
  CategoryChips,
  feedbackCopy as copy,
  FeedbackText,
  MeTabMock,
  SendBar,
  useFeedbackDraft,
  type FeedbackDraft,
} from "../shared";

type Sent = {
  id: string;
  date: string;
  category: BetaCategory | null;
  text: string;
  status: "sent" | "read";
  fresh?: boolean;
};

const MOCK_SENT: Sent[] = [
  {
    id: "f3",
    date: "11월 1일",
    category: "inconvenient",
    text: "지도에서 목록을 내리면 위에 있던 필터가 같이 사라져서 다시 올려야 합니다.",
    status: "read",
  },
  {
    id: "f2",
    date: "10월 31일",
    category: "good",
    text: "셔플할 때 카드가 넘어가는 느낌이 좋아요. 점심 고르는 게 재밌어졌습니다.",
    status: "read",
  },
  {
    id: "f1",
    date: "10월 30일",
    category: null,
    text: "회식 모드에서 인원 수를 바꾸면 후보가 바로 바뀌었으면 좋겠습니다.",
    status: "sent",
  },
];

export function BetaFeedbackC({ p }: { p: BetaFeedbackParams }) {
  const draft = useFeedbackDraft(p);
  const [list, setList] = useState<Sent[]>(() => {
    if (p.state === "empty") return [];
    if (p.flow === "sent")
      return [
        { id: "new", date: "11월 2일", category: p.cat, text: draft.text, status: "sent", fresh: true },
        ...MOCK_SENT,
      ];
    return MOCK_SENT;
  });
  const [justSent, setJustSent] = useState(p.flow === "sent");

  if (p.view === "entry") {
    return (
      <MeTabMock
        entry={
          <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-border py-3">
            <span className="type-body-sm break-keep text-muted-foreground">{copy.entry.banner}</span>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className={cn(
                "inline-flex min-h-11 items-center type-label underline decoration-muted-foreground underline-offset-4",
                focusRing,
              )}
            >
              {copy.entry.bannerLink}
            </a>
          </p>
        }
      />
    );
  }

  return <PageBody p={p} draft={draft} list={list} setList={setList} justSent={justSent} setJustSent={setJustSent} />;
}

function PageBody({
  p,
  draft,
  list,
  setList,
  justSent,
  setJustSent,
}: {
  p: BetaFeedbackParams;
  draft: FeedbackDraft;
  list: Sent[];
  setList: Dispatch<SetStateAction<Sent[]>>;
  justSent: boolean;
  setJustSent: (v: boolean) => void;
}) {
  // 보내기가 성공하면 목록 맨 위에 넣고 칸을 비운다. ?flow=sent로 연 첫 성공은 목록에 이미 들어 있다
  const firstSent = useRef(p.flow === "sent");
  const { status, category, text, reset } = draft;
  useEffect(() => {
    if (status !== "sent") return;
    if (!firstSent.current) {
      setList((l) => [
        { id: `n${l.length}`, date: "11월 2일", category, text, status: "sent", fresh: true },
        ...l,
      ]);
      setJustSent(true);
    }
    firstSent.current = false;
    reset();
  }, [status, category, text, reset, setList, setJustSent]);

  return (
    <ShellSplit
      list={
        <main className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-4 pb-10 desktop:max-w-(--lm-layout-desktop-list-max-width) desktop:px-10 desktop:pt-10">
          <header className="-ml-2 flex items-center gap-1">
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              aria-label={copy.sheet.back}
              className={cn(
                "inline-flex size-11 items-center justify-center rounded-full hover:bg-muted",
                focusRing,
              )}
            >
              <ChevronLeft aria-hidden className="size-5" strokeWidth={1.5} />
            </a>
          </header>
          <h1 className="mt-2 type-title font-heading break-keep">{copy.sheet.pageTitle}</h1>
          <p className="mt-2 type-body-sm text-muted-foreground">{copy.sheet.description}</p>

          <section className="mt-6 flex flex-col gap-6">
            <CategoryChips draft={draft} />
            <FeedbackText draft={draft} rows={4} />
            <AttachRow draft={draft} />
            <SendBar draft={draft} />
            {justSent ? (
              <p role="status" className="-mt-3 type-caption text-muted-foreground">
                {copy.sent.toast}
              </p>
            ) : null}
          </section>

          <section aria-labelledby="sent-title" className="mt-10 flex flex-col gap-3">
            <h2 id="sent-title" className="type-caption text-muted-foreground">
              {copy.history.title}
            </h2>
            {p.state === "loading" ? (
              <ListSkeleton rows={3} label={copy.history.loading} />
            ) : list.length === 0 ? (
              <EmptyState
                title={copy.history.empty.title}
                body={copy.history.empty.body}
                className="pt-2"
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border border-y border-border">
                {list.map((f) => (
                  <li
                    key={f.id}
                    className={cn(
                      "grid",
                      f.fresh &&
                        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:[animation-duration:var(--lm-duration-base)] motion-safe:[animation-timing-function:var(--lm-ease-enter)]",
                    )}
                  >
                    <div className="flex flex-col gap-1.5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 type-caption text-muted-foreground">
                          <span className="tabular-nums">{f.date}</span>
                          {f.category ? (
                            <>
                              <span aria-hidden className="h-3 w-px bg-border" />
                              <span>{copy.categories[f.category]}</span>
                            </>
                          ) : null}
                        </span>
                        <span
                          aria-label={copy.history.statusLabel(copy.history.status[f.status])}
                          className={cn(
                            "inline-flex h-6 items-center rounded-badge border px-2 type-caption",
                            f.status === "read"
                              ? "border-border text-foreground"
                              : "border-border text-muted-foreground",
                          )}
                        >
                          {copy.history.status[f.status]}
                        </span>
                      </div>
                      <p className="line-clamp-2 type-body-sm break-keep">{f.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="type-caption break-keep text-muted-foreground">{copy.history.retention}</p>
          </section>
        </main>
      }
      map={<MapPane />}
      tabBar={<TabBarView activeId="me" preview />}
    />
  );
}
