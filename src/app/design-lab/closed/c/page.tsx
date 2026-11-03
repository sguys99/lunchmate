// /design-lab/closed/c (T9.18 영업 제보 시안). 쿼리 규약은 features/design-lab/closed/params.ts 머리 주석.
// 플래그 차단은 design-lab/layout.tsx.
import type { Metadata } from "next";
import { closedLabCopy } from "@/copy/design-lab-closed";
import { ClosedLabRoute } from "@/features/design-lab/closed/route";

export const metadata: Metadata = {
  title: closedLabCopy.names.c,
};

export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ClosedLabRoute variant="c" searchParams={props.searchParams} />;
}
