// /design-lab/poll/c (T7.1 투표방 시안 C). 쿼리 규약은 features/design-lab/poll/params.ts 머리 주석.
// 플래그 차단은 design-lab/layout.tsx.
import type { Metadata } from "next";
import { pollLabCopy } from "@/copy/design-lab-poll";
import { PollLabRoute } from "@/features/design-lab/poll/route";

export const metadata: Metadata = {
  title: pollLabCopy.names.c,
};

export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <PollLabRoute variant="c" searchParams={props.searchParams} />;
}
