// /design-lab/auth/a (T4.2 시안 A "이어지는 시트"). 쿼리 규약은 features/design-lab/auth/shared/params.ts 머리 주석.
// 플래그 차단은 design-lab/layout.tsx. 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents).
import type { Metadata } from "next";
import { Suspense } from "react";
import { authLabCopy } from "@/copy/design-lab-auth";
import { AuthA } from "@/features/design-lab/auth/a/auth-a";
import { parseAuthParams } from "@/features/design-lab/auth/shared/params";
import "@/features/auth/auth.css";

export const metadata: Metadata = {
  title: authLabCopy.index.names.a,
};

type SearchParams = Record<string, string | string[] | undefined>;

async function Route({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = parseAuthParams(await searchParams);
  return <AuthA params={params} />;
}

export default function Page(props: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense>
      <Route {...props} />
    </Suspense>
  );
}
