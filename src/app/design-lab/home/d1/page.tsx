// /design-lab/home/d1: 홈 G3 선택안 D1 단독 화면 (design-decisions D-05). 쿼리는 features/design-lab/home/route.tsx 참고.
import type { Metadata } from "next";
import { designLabHomeCopy } from "@/copy/design-lab-home";
import { HomeD1Route } from "@/features/design-lab/home/route";

export const metadata: Metadata = {
  title: designLabHomeCopy.metaTitle,
};

export default function HomeD1Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <HomeD1Route searchParams={props.searchParams} />;
}
