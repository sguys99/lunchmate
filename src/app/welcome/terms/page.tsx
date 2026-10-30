// 첫 로그인 약관 동의 /welcome/terms (T4.11, PRD AUTH-02, AUTH-06, D-08). 화면은 features/auth/terms-screen.tsx.
// 콜백(terms_agreed_at null)과 proxy(동의 전 사용자가 앱 경로에 오면)가 ?next=<하려던 경로>로 보낸다.
// - 로그인 필요 경로(proxy). 세션이 없으면 로그인으로, 이미 동의했으면 next로 바로 보낸다.
// - 쿼리와 세션은 요청 시점 값이라 Suspense 안에서 읽는다(cacheComponents). 기다리는 동안 스켈레톤.
// - flags.auth가 꺼진 환경(프로덕션)에서는 404.
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { authCopy } from "@/copy/auth";
import { fromSupabaseProvider } from "@/features/auth/providers";
import { sanitizeNext } from "@/features/auth/redirect";
import { loginUrl } from "@/features/auth/routes";
import { termsAction } from "@/features/auth/terms";
import { TermsScreen, TermsSkeleton } from "@/features/auth/terms-screen";
import { isEnabled } from "@/lib/flags";
import { createServerSupabase } from "@/lib/supabase/server";
import "@/features/auth/auth.css";

export const metadata: Metadata = {
  title: authCopy.terms.metaTitle,
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

async function Route({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // supabase-js 클라이언트가 만들어질 때 Date.now()를 읽는다. 요청 시점 렌더임을 먼저 밝힌다(cacheComponents)
  await connection();
  const raw = (await searchParams).next;
  const next = sanitizeNext(Array.isArray(raw) ? raw[0] : raw);

  const supabase = await createServerSupabase();
  if (!supabase) redirect(loginUrl(next, "failed"));
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect(loginUrl(next));

  const { data: profile } = await supabase
    .from("profiles")
    .select("provider, terms_agreed_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (profile?.terms_agreed_at) redirect(next);

  return (
    <TermsScreen
      next={next}
      action={termsAction(next)}
      provider={fromSupabaseProvider(profile?.provider)}
    />
  );
}

export default function Page(props: { searchParams: Promise<SearchParams> }) {
  if (!isEnabled("auth")) notFound();
  return (
    <Suspense fallback={<TermsSkeleton />}>
      <Route {...props} />
    </Suspense>
  );
}
