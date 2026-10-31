// 식당 상세 시안 라우트 (T5.2). D-10에서 C안을 골라 A, B는 지웠다. 쿼리 규약은 ./params.ts 머리 주석.
// 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents). 테마는 시스템 설정을 따른다.
import { Suspense } from "react";
import { DesignScope } from "@/features/design-lab/system/design-scope";
import { PlaceC } from "./c/place-c";
import { parsePlaceParams } from "./params";

type SearchParams = Record<string, string | string[] | undefined>;
export type PlaceVariant = "c";

const VARIANTS = { c: PlaceC } as const;

async function Screen({
  variant,
  searchParams,
}: {
  variant: PlaceVariant;
  searchParams: Promise<SearchParams>;
}) {
  const params = parsePlaceParams(await searchParams);
  const Variant = VARIANTS[variant];
  return (
    <DesignScope className="min-h-dvh flex-1">
      <Variant params={params} />
    </DesignScope>
  );
}

export function PlaceLabRoute(props: {
  variant: PlaceVariant;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense>
      <Screen {...props} />
    </Suspense>
  );
}
