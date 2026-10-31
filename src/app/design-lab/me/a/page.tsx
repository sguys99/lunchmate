// /design-lab/me/a (T6.2 나 탭과 기록 시안 A). 쿼리 규약은 features/design-lab/me/params.ts 머리 주석.
// 플래그 차단은 design-lab/layout.tsx.
import type { Metadata } from "next";
import { meLabCopy } from "@/copy/design-lab-me";
import { MeLabRoute } from "@/features/design-lab/me/route";

export const metadata: Metadata = {
  title: meLabCopy.names.a,
};

export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <MeLabRoute variant="a" searchParams={props.searchParams} />;
}
