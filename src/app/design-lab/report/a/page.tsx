// /design-lab/report/a (T6.3 제보와 신고 입력 시안 A). 쿼리 규약은 features/design-lab/report/params.ts 머리 주석.
// 플래그 차단은 design-lab/layout.tsx.
import type { Metadata } from "next";
import { reportLabCopy } from "@/copy/design-lab-report";
import { ReportLabRoute } from "@/features/design-lab/report/route";

export const metadata: Metadata = {
  title: reportLabCopy.names.a,
};

export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ReportLabRoute variant="a" searchParams={props.searchParams} />;
}
