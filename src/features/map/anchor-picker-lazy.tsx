"use client";
// 지도에서 기준 찍기 칸을 누른 뒤에만 받는다(지도 SDK와 온보딩 지도 코드가 첫 로드에 들어가지 않게).
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { anchorPickerCopy } from "@/copy/anchor-picker";
import type { AnchorPickerProps } from "./anchor-picker";

export type { AnchorPickerProps } from "./anchor-picker";

export const AnchorPickerLazy = dynamic<AnchorPickerProps>(
  () => import("./anchor-picker").then((m) => m.AnchorPicker),
  {
    ssr: false,
    loading: () => (
      <div
        role="status"
        aria-label={anchorPickerCopy.loading}
        className="flex flex-col gap-3"
      >
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    ),
  },
);
