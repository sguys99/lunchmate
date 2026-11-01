// /design-lab/app-icon/c (T8.1 앱 아이콘과 스플래시 시안 C). 쿼리 규약은 features/design-lab/app-icon/route.tsx 머리 주석.
// 플래그 차단은 design-lab/layout.tsx.
import type { Metadata } from "next";
import { appIconLabCopy } from "@/copy/design-lab-app-icon";
import { AppIconLabRoute } from "@/features/design-lab/app-icon/route";

export const metadata: Metadata = {
  title: appIconLabCopy.names.c,
};

export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AppIconLabRoute variant="c" searchParams={props.searchParams} />;
}
