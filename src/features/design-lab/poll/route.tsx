// 투표방 시안 라우트 (T7.1). 쿼리 규약은 ./params.ts 머리 주석.
// 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents). 테마는 시스템 설정을 따른다.
import { Suspense } from "react";
import { DesignScope } from "@/features/design-lab/system/design-scope";
import { PollA } from "./a/poll-a";
import { PollB } from "./b/poll-b";
import { PollC } from "./c/poll-c";
import { parsePollParams } from "./params";

type SearchParams = Record<string, string | string[] | undefined>;
export type PollVariant = "a" | "b" | "c";

const VARIANTS = { a: PollA, b: PollB, c: PollC } as const;

async function Screen({
  variant,
  searchParams,
}: {
  variant: PollVariant;
  searchParams: Promise<SearchParams>;
}) {
  const params = parsePollParams(await searchParams);
  const Variant = VARIANTS[variant];
  return (
    <DesignScope className="min-h-dvh flex-1">
      <Variant p={params} />
    </DesignScope>
  );
}

export function PollLabRoute(props: {
  variant: PollVariant;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense>
      <Screen {...props} />
    </Suspense>
  );
}
