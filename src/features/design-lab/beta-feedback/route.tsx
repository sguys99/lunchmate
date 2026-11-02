// 베타 의견 보내기 시안 라우트 (T9.4, 실제 화면은 나 탭 + 시트). 쿼리 규약은 ./params.ts 머리 주석.
// 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents). 테마는 시스템 설정을 따른다.
// 쿼리가 바뀌면 시안 상태를 처음부터 다시 그리도록 쿼리 전체를 key로 준다.
import { Suspense } from "react";
import { DesignScope } from "@/features/design-lab/system/design-scope";
import { BetaFeedbackA } from "./a/beta-feedback-a";
import { BetaFeedbackB } from "./b/beta-feedback-b";
import { BetaFeedbackC } from "./c/beta-feedback-c";
import { parseBetaFeedbackParams } from "./params";

type SearchParams = Record<string, string | string[] | undefined>;
export type BetaFeedbackVariant = "a" | "b" | "c";

const VARIANTS = { a: BetaFeedbackA, b: BetaFeedbackB, c: BetaFeedbackC } as const;

async function Screen({
  variant,
  searchParams,
}: {
  variant: BetaFeedbackVariant;
  searchParams: Promise<SearchParams>;
}) {
  const p = parseBetaFeedbackParams(await searchParams);
  const Variant = VARIANTS[variant];
  return (
    <DesignScope className="min-h-dvh flex-1">
      <Variant key={JSON.stringify(p)} p={p} />
    </DesignScope>
  );
}

export function BetaFeedbackLabRoute(props: {
  variant: BetaFeedbackVariant;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense>
      <Screen {...props} />
    </Suspense>
  );
}
