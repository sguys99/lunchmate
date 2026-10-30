// /login 전용 화면 (T4.6~T4.9, D-08 B). 쿼리: next(돌아갈 내부 경로), error(cancelled|failed, 콜백이 붙임).
// 로그인 상태로 오면 proxy가 next로 보낸다. flags.auth가 꺼진 환경(프로덕션)에서는 404.
// 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { authCopy } from "@/copy/auth";
import { LoginScreen } from "@/features/auth/login-screen";
import { parseLoginParams } from "@/features/auth/login-params";
import { isEnabled } from "@/lib/flags";
import "@/features/auth/auth.css";

export const metadata: Metadata = {
  title: authCopy.metaTitle,
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

async function Route({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = parseLoginParams(await searchParams);
  return <LoginScreen {...params} />;
}

export default function Page(props: { searchParams: Promise<SearchParams> }) {
  if (!isEnabled("auth")) notFound();
  return (
    <Suspense>
      <Route {...props} />
    </Suspense>
  );
}
