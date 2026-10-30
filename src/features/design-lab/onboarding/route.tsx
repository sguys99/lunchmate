// 온보딩 시안 단독 화면 공용 라우트 (T4.1). /design-lab/onboarding/<a|b|c>
// 쿼리: ?step=1|2|3|done, ?state=loading|empty|error|offline, ?perm=denied, ?pin=placed (shared/params.ts)
// 테마는 시스템 설정(prefers-color-scheme)을 따른다. 상위 design-lab/layout.tsx가 플래그로 막는다.
// 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents).
import { Suspense, type ComponentType } from "react";
import { DesignScope } from "@/features/design-lab/system/design-scope";
import { parseOnboardingParams, type OnboardingParams } from "./shared/params";
import "./shared/onboarding.css";

type SearchParams = Record<string, string | string[] | undefined>;

async function Screen({
  searchParams,
  Candidate,
}: {
  searchParams: Promise<SearchParams>;
  Candidate: ComponentType<{ params: OnboardingParams }>;
}) {
  const params = parseOnboardingParams(await searchParams);
  return (
    <DesignScope className="min-h-dvh flex-1">
      <Candidate params={params} />
    </DesignScope>
  );
}

export function OnboardingRoute(props: {
  searchParams: Promise<SearchParams>;
  Candidate: ComponentType<{ params: OnboardingParams }>;
}) {
  return (
    <Suspense>
      <Screen {...props} />
    </Suspense>
  );
}
