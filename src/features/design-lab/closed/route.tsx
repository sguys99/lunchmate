// "지금 안 열었어요" 제보 시안 라우트 (T9.18). 쿼리 규약은 ./params.ts 머리 주석.
// 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents). 쿼리가 바뀌면 처음부터 다시 그린다.
import { Suspense } from "react";
import { DesignScope } from "@/features/design-lab/system/design-scope";
import "@/features/onboarding/onboarding.css";
import { ClosedA } from "./a/closed-a";
import { ClosedB } from "./b/closed-b";
import { ClosedC } from "./c/closed-c";
import { parseClosedParams } from "./params";

type SearchParams = Record<string, string | string[] | undefined>;
export type ClosedVariant = "a" | "b" | "c";

const VARIANTS = { a: ClosedA, b: ClosedB, c: ClosedC } as const;

async function Screen({
  variant,
  searchParams,
}: {
  variant: ClosedVariant;
  searchParams: Promise<SearchParams>;
}) {
  const p = parseClosedParams(await searchParams);
  const Variant = VARIANTS[variant];
  return (
    <DesignScope className="min-h-dvh flex-1">
      <Variant key={JSON.stringify(p)} p={p} />
    </DesignScope>
  );
}

export function ClosedLabRoute(props: {
  variant: ClosedVariant;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense>
      <Screen {...props} />
    </Suspense>
  );
}
