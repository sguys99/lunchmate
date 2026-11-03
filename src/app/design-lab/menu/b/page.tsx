// /design-lab/menu/b (T10.16b 메뉴 제보 시안 B). 쿼리 규약은 features/design-lab/menu/params.ts 머리 주석.
// 플래그 차단은 design-lab/layout.tsx.
import type { Metadata } from "next";
import { menuLabCopy } from "@/copy/design-lab-menu";
import { MenuLabRoute } from "@/features/design-lab/menu/route";

export const metadata: Metadata = {
  title: menuLabCopy.names.b,
};

export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <MenuLabRoute variant="b" searchParams={props.searchParams} />;
}
