// 투표방 시안 라우트 (T7.1). 쿼리 규약은 ./params.ts 머리 주석.
// 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents). 테마는 시스템 설정을 따른다.
import { Suspense } from "react";
import { DesignScope } from "@/features/design-lab/system/design-scope";
import { PollA } from "./a/poll-a";
import { parsePollParams } from "./params";

type SearchParams = Record<string, string | string[] | undefined>;
export type PollVariant = "a";

// G7(D-14)에서 A를 골라 B, C는 지웠다. C 참여 줄과 B 결과 카드는 실제 화면(src/features/poll/room)으로 옮겼다
const VARIANTS = { a: PollA } as const;

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
