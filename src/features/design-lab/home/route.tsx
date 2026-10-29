// 홈 시안 단독 화면 (T3.1): /design-lab/home/<a|b|c|d>?state=<ready|loading|empty|error|offline>
// 캡처 전용(pnpm shots). 테마는 시스템 설정(prefers-color-scheme)을 따른다. 상위 design-lab/layout.tsx가 플래그로 막는다.
// ?state= 는 요청 시점 값이라 Suspense 안에서 읽는다(시스템 단독 화면과 같은 이유, cacheComponents).
import { Suspense } from "react";
import { parseDesignState } from "@/features/design-lab/mock";
import { DesignScope } from "@/features/design-lab/system/design-scope";
import { HOME_VARIANTS } from "./registry";
import type { HomeVariantId } from "./types";

type SearchParams = Record<string, string | string[] | undefined>;

async function Screen({
  variant,
  searchParams,
}: {
  variant: HomeVariantId;
  searchParams: Promise<SearchParams>;
}) {
  const state = parseDesignState(await searchParams);
  const Home = HOME_VARIANTS[variant];
  return (
    <DesignScope className="min-h-dvh flex-1">
      <Home state={state} />
    </DesignScope>
  );
}

export function HomeVariantRoute({
  variant,
  searchParams,
}: {
  variant: HomeVariantId;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense>
      <Screen variant={variant} searchParams={searchParams} />
    </Suspense>
  );
}
