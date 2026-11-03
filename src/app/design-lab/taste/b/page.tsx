// /design-lab/taste/b (T9.17 취향 설정 시안 B). 쿼리 규약은 features/design-lab/taste/params.ts 머리 주석.
// 플래그 차단은 design-lab/layout.tsx.
import type { Metadata } from "next";
import { tasteLabCopy } from "@/copy/design-lab-taste";
import { TasteLabRoute } from "@/features/design-lab/taste/route";

export const metadata: Metadata = {
  title: tasteLabCopy.names.b,
};

export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <TasteLabRoute variant="b" searchParams={props.searchParams} />;
}
