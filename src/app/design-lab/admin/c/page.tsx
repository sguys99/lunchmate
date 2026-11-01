// /design-lab/admin/c (T8.5a 관리자 화면 시안 C). 쿼리 규약은 features/design-lab/admin/params.ts 머리 주석.
// 플래그 차단은 design-lab/layout.tsx.
import type { Metadata } from "next";
import { adminLabCopy } from "@/copy/design-lab-admin";
import { AdminLabRoute } from "@/features/design-lab/admin/route";

export const metadata: Metadata = {
  title: adminLabCopy.names.c,
};

export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AdminLabRoute variant="c" searchParams={props.searchParams} />;
}
