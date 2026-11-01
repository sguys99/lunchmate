"use client";
// /design-lab/share/b 확인 화면: 실제 결과 공유 시트(ResultShareSheet, T7.20)를 목업 값으로 연다.
// 투표방 결과 화면(P1)과 같은 방식으로 시트를 누른 뒤 받는다(next/dynamic). 처음에는 열린 채로 보여 준다.
import dynamic from "next/dynamic";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { shareLabCopy } from "@/copy/design-lab-share";
import type { ResultShareSheetProps } from "@/features/poll/share/types";

const Sheet = dynamic<ResultShareSheetProps>(
  () => import("@/features/poll/share/result-share-sheet"),
  { ssr: false },
);

export function ResultShareDemo(
  props: Omit<ResultShareSheetProps, "open" | "onOpenChange"> & {
    initialOpen: boolean;
  },
) {
  const { initialOpen, ...rest } = props;
  const [open, setOpen] = useState(initialOpen);
  return (
    <>
      <button
        type="button"
        className={buttonClass("secondary")}
        onClick={() => setOpen(true)}
      >
        {shareLabCopy.page.openSheet}
      </button>
      <Sheet {...rest} open={open} onOpenChange={setOpen} />
    </>
  );
}
