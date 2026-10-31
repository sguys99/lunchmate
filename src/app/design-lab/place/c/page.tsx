// /design-lab/place/c (T5.2 식당 상세 시안 C). 쿼리 규약은 features/design-lab/place/params.ts 머리 주석.
// 플래그 차단은 design-lab/layout.tsx.
import type { Metadata } from "next";
import { placeLabCopy } from "@/copy/design-lab-place";
import { PlaceLabRoute } from "@/features/design-lab/place/route";

export const metadata: Metadata = {
  title: placeLabCopy.names.c,
};

export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <PlaceLabRoute variant="c" searchParams={props.searchParams} />;
}
