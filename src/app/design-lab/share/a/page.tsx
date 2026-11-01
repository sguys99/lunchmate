// /design-lab/share/a (T7.4 OG 이미지와 결과 공유 이미지 시안 A). 쿼리 규약은 features/design-lab/share/params.ts 머리 주석.
// 플래그 차단은 design-lab/layout.tsx.
import type { Metadata } from "next";
import { shareLabCopy } from "@/copy/design-lab-share";
import { ShareLabRoute } from "@/features/design-lab/share/route";

export const metadata: Metadata = {
  title: shareLabCopy.names.a,
};

export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ShareLabRoute variant="a" searchParams={props.searchParams} />;
}
