// /design-lab/tab-bar/b (T9.15 하단 탭 활성 표시 시안 B). 쿼리 규약은 features/design-lab/tab-bar/route.tsx 머리 주석.
// 플래그 차단은 design-lab/layout.tsx.
import type { Metadata } from "next";
import { tabBarLabCopy } from "@/copy/design-lab-tab-bar";
import { TabBarLabRoute } from "@/features/design-lab/tab-bar/route";

export const metadata: Metadata = {
  title: tabBarLabCopy.names.b,
};

export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <TabBarLabRoute variant="b" searchParams={props.searchParams} />;
}
