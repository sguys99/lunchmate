// /design-lab/swipe/a (T9.14 탭 스와이프 시안 A). 쿼리 규약은 features/design-lab/swipe/params.ts 머리 주석.
// 플래그 차단은 design-lab/layout.tsx.
import type { Metadata } from "next";
import { swipeLabCopy } from "@/copy/design-lab-swipe";
import { SwipeLabRoute } from "@/features/design-lab/swipe/route";

export const metadata: Metadata = {
  title: swipeLabCopy.names.a,
};

export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <SwipeLabRoute variant="a" searchParams={props.searchParams} />;
}
