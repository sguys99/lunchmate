// /design-lab/home/d2: 홈 수정 시안 D2 단독 화면 (G3 D 선택 뒤, 2026-10-30). ?state= 4상태, ?feedback=none 어제 피드백 없는 날.
import type { Metadata } from "next";
import { designLabHomeCopy } from "@/copy/design-lab-home";
import { HomeVariantRoute } from "@/features/design-lab/home/route";

export const metadata: Metadata = {
  title: `${designLabHomeCopy.index.metaTitle} D2`,
};

export default function HomeVariantD2Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <HomeVariantRoute variant="d2" searchParams={props.searchParams} />;
}
