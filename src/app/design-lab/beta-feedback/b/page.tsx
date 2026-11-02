// /design-lab/beta-feedback/b (T9.4 베타 의견 보내기 시안 B). 쿼리 규약은 features/design-lab/beta-feedback/params.ts 머리 주석.
// 플래그 차단은 design-lab/layout.tsx.
import type { Metadata } from "next";
import { betaFeedbackLabCopy } from "@/copy/design-lab-beta-feedback";
import { BetaFeedbackLabRoute } from "@/features/design-lab/beta-feedback/route";

export const metadata: Metadata = {
  title: betaFeedbackLabCopy.names.b,
};

export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <BetaFeedbackLabRoute variant="b" searchParams={props.searchParams} />;
}
