// /design-lab/place/live (T5.33~T5.38 식당 상세 실제 구현 확인). 쿼리는 features/design-lab/place/live/place-live.tsx 머리 주석.
// 플래그 차단은 design-lab/layout.tsx.
import type { Metadata } from "next";
import { Suspense } from "react";
import { placeCopy } from "@/copy/place";
import {
  PlaceLive,
  type LiveParams,
} from "@/features/design-lab/place/live/place-live";

export const metadata: Metadata = { title: placeCopy.detail.label };

type SearchParams = Record<string, string | string[] | undefined>;

function pick(raw: SearchParams, key: string): string | undefined {
  const v = raw[key];
  return (typeof v === "string" ? v : v?.[0])?.trim().toLowerCase();
}

async function Screen({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const raw = await searchParams;
  const state = pick(raw, "state");
  const data = pick(raw, "data");
  const params: LiveParams = {
    view: pick(raw, "view") === "inline" ? "inline" : "sheet",
    state: state === "loading" || state === "error" ? state : "ready",
    data: data === "sparse" || data === "empty" ? data : "full",
    nameFail: pick(raw, "name") === "fail",
  };
  return <PlaceLive params={params} />;
}

export default function Page(props: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense>
      <Screen searchParams={props.searchParams} />
    </Suspense>
  );
}
