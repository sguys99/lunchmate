// 탭 스와이프 시안 라우트 (T9.14). D-36에서 A를 골라 B, C는 지웠다(캡처와 비교 자료는 남김). 쿼리 규약은 ./params.ts 머리 주석.
// 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents). 테마는 시스템 설정을 따른다.
// 쿼리가 바뀌면 시안 상태를 처음부터 다시 그리도록 쿼리 전체를 key로 준다.
import { Suspense } from "react";
import { DesignScope } from "@/features/design-lab/system/design-scope";
import { SwipeA } from "./a/swipe-a";
import { parseSwipeParams } from "./params";

type SearchParams = Record<string, string | string[] | undefined>;
export type SwipeVariant = "a";

const VARIANTS = { a: SwipeA } as const;

async function Screen({
  variant,
  searchParams,
}: {
  variant: SwipeVariant;
  searchParams: Promise<SearchParams>;
}) {
  const p = parseSwipeParams(await searchParams);
  const Variant = VARIANTS[variant];
  return (
    <DesignScope className="min-h-dvh flex-1">
      <Variant key={JSON.stringify(p)} p={p} />
    </DesignScope>
  );
}

export function SwipeLabRoute(props: {
  variant: SwipeVariant;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense>
      <Screen {...props} />
    </Suspense>
  );
}
