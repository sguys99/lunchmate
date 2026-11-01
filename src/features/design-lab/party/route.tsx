// 회식 모드 시안 라우트 (T7.3). 쿼리 규약은 ./params.ts 머리 주석.
// G7(D-16)에서 C를 골라 A, B 화면은 지웠다(B 질문 2개와 A 근거 줄은 실제 화면 src/features/party로 옮김).
// 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents). 테마는 시스템 설정을 따른다.
import { Suspense } from "react";
import { DesignScope } from "@/features/design-lab/system/design-scope";
import { PartyC } from "./c/party-c";
import { parsePartyParams } from "./params";

type SearchParams = Record<string, string | string[] | undefined>;
export type PartyVariant = "c";

const VARIANTS = { c: PartyC } as const;

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
