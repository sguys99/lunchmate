// 투표 만들기 확인 화면 라우트 (T7.2, D-15에서 C를 골라 A, B는 지웠다. 캡처와 g7-comparison-poll-create.md는 남김). 쿼리 규약은 ./params.ts 머리 주석.
// 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents). 테마는 시스템 설정을 따른다.
import { Suspense } from "react";
import { DesignScope } from "@/features/design-lab/system/design-scope";
import { PollCreateC } from "./c/poll-create-c";
import { parsePollCreateParams } from "./params";

type SearchParams = Record<string, string | string[] | undefined>;
export type PollCreateVariant = "c";

const VARIANTS = { c: PollCreateC } as const;

async function Screen({
  variant,
  searchParams,
}: {
  variant: PollCreateVariant;
  searchParams: Promise<SearchParams>;
}) {
  const params = parsePollCreateParams(await searchParams);
  const Variant = VARIANTS[variant];
  return (
    <DesignScope className="min-h-dvh flex-1">
      <Variant p={params} />
    </DesignScope>
  );
}

export function PollCreateLabRoute(props: {
  variant: PollCreateVariant;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense>
      <Screen {...props} />
    </Suspense>
  );
}
