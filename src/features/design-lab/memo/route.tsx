// 식당 메모 시안 라우트 (T10.15, D-32). 쿼리 규약은 ./params.ts 머리 주석.
// 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents). 테마는 시스템 설정을 따른다.
// 쿼리가 바뀌면 시안 상태를 처음부터 다시 그리도록 쿼리 전체를 key로 준다.
import { Suspense } from "react";
import { DesignScope } from "@/features/design-lab/system/design-scope";
import { MemoA } from "./a/memo-a";
import { MemoB } from "./b/memo-b";
import { MemoC } from "./c/memo-c";
import { parseMemoParams } from "./params";

type SearchParams = Record<string, string | string[] | undefined>;
export type MemoVariant = "a" | "b" | "c";

const VARIANTS = { a: MemoA, b: MemoB, c: MemoC } as const;

async function Screen({
  variant,
  searchParams,
}: {
  variant: MemoVariant;
  searchParams: Promise<SearchParams>;
}) {
  const p = parseMemoParams(await searchParams);
  const Variant = VARIANTS[variant];
  return (
    <DesignScope className="min-h-dvh flex-1">
      <Variant key={JSON.stringify(p)} p={p} />
    </DesignScope>
  );
}

export function MemoLabRoute(props: {
  variant: MemoVariant;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense>
      <Screen {...props} />
    </Suspense>
  );
}
