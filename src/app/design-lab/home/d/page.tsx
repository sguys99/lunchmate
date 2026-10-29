// /design-lab/home/d: 홈 시안 D 단독 화면 (T3.1). ?state= 로 4상태를 본다.
import type { Metadata } from "next";
import { designLabHomeCopy } from "@/copy/design-lab-home";
import { HomeVariantRoute } from "@/features/design-lab/home/route";

export const metadata: Metadata = {
  title: `${designLabHomeCopy.index.metaTitle} D`,
};

export default function HomeVariantDPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <HomeVariantRoute variant="d" searchParams={props.searchParams} />;
}
