// /design-lab/landing/b?state=loading|offline|error&inapp=kakao (T3.4, G3 선택안 D-06). 플래그 차단은 design-lab/layout.tsx.
// 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents).
import type { Metadata } from "next";
import { Suspense } from "react";
import { landingLabCopy } from "@/copy/design-lab-landing";
import { LandingB } from "@/features/design-lab/landing/b/landing-b";
import { parseLandingParams } from "@/features/design-lab/landing/shared/params";
import "@/features/design-lab/landing/shared/landing.css";

export const metadata: Metadata = {
  title: landingLabCopy.index.name,
};

type SearchParams = Record<string, string | string[] | undefined>;

async function Route({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = parseLandingParams(await searchParams);
  return <LandingB params={params} />;
}

export default function Page(props: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense>
      <Route {...props} />
    </Suspense>
  );
}
