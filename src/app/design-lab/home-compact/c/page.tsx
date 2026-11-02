// /design-lab/home-compact/c: 홈 한 화면 맞춤 시안 C (T9.10 G9, docs/design/g9-comparison-home-compact.md)
import type { Metadata } from "next";
import { homeCompactLabCopy } from "@/copy/design-lab-home-compact";
import { HomeCompactRoute } from "@/features/design-lab/home-compact/route";

export const metadata: Metadata = {
  title: homeCompactLabCopy.metaTitle("c"),
};

export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <HomeCompactRoute id="c" searchParams={props.searchParams} />;
}
