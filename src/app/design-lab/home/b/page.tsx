// /design-lab/home/b: 홈 시안 B 단독 화면 (T3.1). ?state= 로 4상태를 본다.
import type { Metadata } from "next";
import { designLabHomeCopy } from "@/copy/design-lab-home";
import { HomeVariantRoute } from "@/features/design-lab/home/route";

export const metadata: Metadata = {
  title: `${designLabHomeCopy.index.metaTitle} B`,
};

export default function HomeVariantBPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <HomeVariantRoute variant="b" searchParams={props.searchParams} />;
}
