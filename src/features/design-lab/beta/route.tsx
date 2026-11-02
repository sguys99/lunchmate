// 베타 환영 페이지 시안 라우트 (T9.3, 실제 화면은 /beta). 쿼리 규약은 ./params.ts 머리 주석.
// 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents). 테마는 시스템 설정을 따른다.
// 쿼리가 바뀌면 시안 상태를 처음부터 다시 그리도록 쿼리 전체를 key로 준다.
import { Suspense } from "react";
import { DesignScope } from "@/features/design-lab/system/design-scope";
import { BetaA } from "./a/beta-a";
import { parseBetaParams } from "./params";

type SearchParams = Record<string, string | string[] | undefined>;
// T9.3 구현 뒤 선택안 A만 확인 화면으로 남겼다(D-23, 실제 화면은 A + C의 큰 제목). B, C는 캡처와 비교 문서에만 있다.
export type BetaVariant = "a";

const VARIANTS = { a: BetaA } as const;

async function Screen({
  variant,
  searchParams,
}: {
  variant: BetaVariant;
  searchParams: Promise<SearchParams>;
}) {
  const p = parseBetaParams(await searchParams);
  const Variant = VARIANTS[variant];
  return (
    <DesignScope className="min-h-dvh flex-1">
      <Variant key={JSON.stringify(p)} p={p} />
    </DesignScope>
  );
}

export function BetaLabRoute(props: {
  variant: BetaVariant;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense>
      <Screen {...props} />
    </Suspense>
  );
}
