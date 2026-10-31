// 식후 피드백 시안 라우트 (T6.1). 쿼리 규약은 ./params.ts 머리 주석.
// 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents). 테마는 시스템 설정을 따른다.
import { Suspense } from "react";
import { DesignScope } from "@/features/design-lab/system/design-scope";
import { FeedbackA } from "./a/feedback-a";
import { FeedbackB } from "./b/feedback-b";
import { FeedbackC } from "./c/feedback-c";
import { parseFeedbackParams } from "./params";

type SearchParams = Record<string, string | string[] | undefined>;
export type FeedbackVariant = "a" | "b" | "c";

const VARIANTS = { a: FeedbackA, b: FeedbackB, c: FeedbackC } as const;

async function Screen({
  variant,
  searchParams,
}: {
  variant: FeedbackVariant;
  searchParams: Promise<SearchParams>;
}) {
  const params = parseFeedbackParams(await searchParams);
  const Variant = VARIANTS[variant];
  return (
    <DesignScope className="min-h-dvh flex-1">
      <Variant p={params} />
    </DesignScope>
  );
}

export function FeedbackLabRoute(props: {
  variant: FeedbackVariant;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense>
      <Screen {...props} />
    </Suspense>
  );
}
