// /design-lab/party/c (T7.3 회식 모드 시안 C). 쿼리 규약은 features/design-lab/party/params.ts 머리 주석.
// 플래그 차단은 design-lab/layout.tsx.
import type { Metadata } from "next";
import { partyLabCopy } from "@/copy/design-lab-party";
import { PartyLabRoute } from "@/features/design-lab/party/route";

export const metadata: Metadata = {
  title: partyLabCopy.names.c,
};

export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <PartyLabRoute variant="c" searchParams={props.searchParams} />;
}
