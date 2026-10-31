// /design-lab/feedback/b (T6.1 식후 피드백 시안 B). 쿼리 규약은 features/design-lab/feedback/params.ts 머리 주석.
// 플래그 차단은 design-lab/layout.tsx.
import type { Metadata } from "next";
import { feedbackLabCopy } from "@/copy/design-lab-feedback";
import { FeedbackLabRoute } from "@/features/design-lab/feedback/route";

export const metadata: Metadata = {
  title: feedbackLabCopy.names.b,
};

export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <FeedbackLabRoute variant="b" searchParams={props.searchParams} />;
}
