"use client";
// 베타 의견 시안 A: 한 장 시트 (T9.4).
// - 진입: 나 탭 머리 바로 아래 헤어라인 줄 하나 "베타 의견 보내기" + 베타 배지 + 화살표(줄 높이 56).
// - 시트 한 장에 종류 칩 4개(선택), 내용(필수, 500자, 글자 수), 지금 보던 화면 함께 보내기(기본 켬, 보내는 값을 그대로 보임).
//   주 버튼 "보내기"는 시트 바닥에 고정. 보낸 뒤 같은 시트가 고마움 화면으로 바뀐다(4px 위로 페이드, slow).
// - 오류는 버튼 위 한 줄 + "다시 보내기", 한도는 버튼 꺼짐, 오프라인은 위 안내 + aria-disabled. 쓴 글은 그대로.
import { ChevronRight, MessageSquareText } from "lucide-react";
import { useState } from "react";
import { focusRing } from "@/components/ui/interaction";
import { rowPress } from "@/components/ui/row-press";
import { cn } from "@/lib/utils";
import type { BetaFeedbackParams } from "../params";
import {
  AttachRow,
  CategoryChips,
  feedbackCopy as copy,
  FeedbackSheet,
  FeedbackText,
  FormSkeleton,
  MeTabMock,
  SendBar,
  SentView,
  useFeedbackDraft,
} from "../shared";

export function BetaFeedbackA({ p }: { p: BetaFeedbackParams }) {
  const [open, setOpen] = useState(p.view !== "entry");
  const draft = useFeedbackDraft(p);
  const loading = p.state === "loading";
  const sent = draft.status === "sent";

  return (
    <>
      <MeTabMock
        entry={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "mt-6 flex min-h-14 w-full items-center gap-3 border-y border-border py-3 text-left",
              focusRing,
              rowPress,
            )}
          >
            <MessageSquareText aria-hidden className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-2 type-body">
                {copy.entry.row}
                <span className="inline-flex h-5 items-center rounded-badge border border-border px-1.5 type-caption text-muted-foreground">
                  {copy.entry.badge}
                </span>
              </span>
              <span className="truncate type-caption text-muted-foreground">{copy.entry.rowHint}</span>
            </span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          </button>
        }
      />
      <FeedbackSheet
        open={open}
        onOpenChange={setOpen}
        title={copy.sheet.title}
        footer={loading || sent ? undefined : <SendBar draft={draft} />}
      >
        {loading ? (
          <FormSkeleton />
        ) : sent ? (
          <SentView onClose={() => setOpen(false)} onAgain={draft.reset} className="pb-2" />
        ) : (
          <div className="flex flex-col gap-6">
            <p className="-mt-2 type-caption text-muted-foreground">{copy.sheet.description}</p>
            <CategoryChips draft={draft} />
            <FeedbackText draft={draft} />
            <AttachRow draft={draft} />
          </div>
        )}
      </FeedbackSheet>
    </>
  );
}
