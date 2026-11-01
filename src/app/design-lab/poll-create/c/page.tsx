// /design-lab/poll-create/c (T7.2 투표 만들기 시안 C). 쿼리 규약은 features/design-lab/poll-create/params.ts 머리 주석.
// 플래그 차단은 design-lab/layout.tsx.
import type { Metadata } from "next";
import { pollCreateLabCopy } from "@/copy/design-lab-poll-create";
import { PollCreateLabRoute } from "@/features/design-lab/poll-create/route";

export const metadata: Metadata = {
  title: pollCreateLabCopy.names.c,
};

export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <PollCreateLabRoute variant="c" searchParams={props.searchParams} />;
}
