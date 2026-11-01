// 나 탭 시안 라우트 (T6.2). 쿼리 규약은 ./params.ts 머리 주석.
// 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents). 테마는 시스템 설정을 따른다.
import { Suspense } from "react";
import { DesignScope } from "@/features/design-lab/system/design-scope";
import { MeA } from "./a/me-a";
import { parseMeParams } from "./params";

type SearchParams = Record<string, string | string[] | undefined>;
export type MeVariant = "a";

const VARIANTS = { a: MeA } as const;

async function Screen({
  variant,
  searchParams,
}: {
  variant: MeVariant;
  searchParams: Promise<SearchParams>;
}) {
  const params = parseMeParams(await searchParams);
  const Variant = VARIANTS[variant];
  return (
    <DesignScope className="min-h-dvh flex-1">
      <Variant params={params} />
    </DesignScope>
  );
}

export function MeLabRoute(props: {
  variant: MeVariant;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense>
      <Screen {...props} />
    </Suspense>
  );
}
