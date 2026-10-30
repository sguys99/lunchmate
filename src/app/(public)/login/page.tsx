// /login 전용 화면 (T4.6~T4.10, D-08 B). 쿼리: next(돌아갈 내부 경로), error(cancelled|failed, 콜백이 붙임),
// view=inapp(인앱 구글 안내, /auth/sign-in 이중 안전장치가 붙임). 인앱 판정은 요청 UA로 서버에서 한다(첫 렌더부터 같은 화면).
// 개발 환경(NODE_ENV !== production)에서만 ?inapp=kakaotalk&os=ios 같은 쿼리로 인앱을 흉내 낸다(화면 확인용).
// 로그인 상태로 오면 proxy가 next로 보낸다. flags.auth가 꺼진 환경(프로덕션)에서는 404.
// 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents).
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { authCopy } from "@/copy/auth";
import { LoginScreen } from "@/features/auth/login-screen";
import {
  parseLoginParams,
  parseLoginView,
  resolveInAppEnv,
} from "@/features/auth/login-params";
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
  const raw = await searchParams;
  const ua = (await headers()).get("user-agent");
  const params = parseLoginParams(raw);
  const env = resolveInAppEnv(raw, ua, process.env.NODE_ENV !== "production");
  return <LoginScreen {...params} {...env} view={parseLoginView(raw)} />;
}

export default function Page(props: { searchParams: Promise<SearchParams> }) {
  if (!isEnabled("auth")) notFound();
  return (
    <Suspense>
      <Route {...props} />
    </Suspense>
  );
}
