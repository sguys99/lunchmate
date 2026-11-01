// 회식 모드 시안 라우트 (T7.3). 쿼리 규약은 ./params.ts 머리 주석.
// 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents). 테마는 시스템 설정을 따른다.
import { Suspense } from "react";
import { DesignScope } from "@/features/design-lab/system/design-scope";
import { PartyA } from "./a/party-a";
import { PartyB } from "./b/party-b";
import { PartyC } from "./c/party-c";
import { parsePartyParams } from "./params";

type SearchParams = Record<string, string | string[] | undefined>;
export type PartyVariant = "a" | "b" | "c";

const VARIANTS = { a: PartyA, b: PartyB, c: PartyC } as const;

async function Screen({
  variant,
  searchParams,
}: {
  variant: PartyVariant;
  searchParams: Promise<SearchParams>;
}) {
  const params = parsePartyParams(await searchParams);
  const Variant = VARIANTS[variant];
  return (
    <DesignScope className="min-h-dvh flex-1">
      <Variant p={params} />
    </DesignScope>
  );
}

export function PartyLabRoute(props: {
  variant: PartyVariant;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense>
      <Screen {...props} />
    </Suspense>
  );
}
