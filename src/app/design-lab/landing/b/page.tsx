// /design-lab/landing/b 랜딩 확인 화면 (T3.4 시안, T4.28부터 실제 랜딩 컴포넌트를 그림, G3 선택안 D-06).
// ?state=loading|offline, ?inapp=kakao, ?flags=off. 플래그 차단은 design-lab/layout.tsx.
// 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents).
import type { Metadata } from "next";
import { Suspense } from "react";
import { designLabCopy } from "@/copy/design-lab";
import { parseLandingParams } from "@/features/design-lab/landing/params";
import { Landing } from "@/features/landing/landing";
import { isEnabled } from "@/lib/flags";

export const metadata: Metadata = {
  title: designLabCopy.index.landingName,
};

type SearchParams = Record<string, string | string[] | undefined>;

async function Route({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { preview, flagsOff } = parseLandingParams(await searchParams);
  return (
    <Landing
      appEnabled={!flagsOff && isEnabled("appShell")}
      authEnabled={!flagsOff && isEnabled("auth")}
      preview={preview}
    />
  );
}

export default function Page(props: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense>
      <Route {...props} />
    </Suspense>
  );
}
