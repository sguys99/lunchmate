// /design-lab/home/c: 홈 시안 C 단독 화면 (T3.1). ?state= 로 4상태를 본다.
import type { Metadata } from "next";
import { designLabHomeCopy } from "@/copy/design-lab-home";
import { HomeVariantRoute } from "@/features/design-lab/home/route";

export const metadata: Metadata = {
  title: `${designLabHomeCopy.index.metaTitle} C`,
};

export default function HomeVariantCPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <HomeVariantRoute variant="c" searchParams={props.searchParams} />;
}
