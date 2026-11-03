// /design-lab/memo/c (T10.15 식당 메모 시안 C). 쿼리 규약은 features/design-lab/memo/params.ts 머리 주석.
// 플래그 차단은 design-lab/layout.tsx.
import type { Metadata } from "next";
import { memoLabCopy } from "@/copy/design-lab-memo";
import { MemoLabRoute } from "@/features/design-lab/memo/route";

export const metadata: Metadata = {
  title: memoLabCopy.names.c,
};

export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <MemoLabRoute variant="c" searchParams={props.searchParams} />;
}
