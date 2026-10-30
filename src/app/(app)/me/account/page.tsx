// /me/account 계정 뼈대 (T4.12, AUTH-05). 로그아웃과 회원 탈퇴. 나 탭 실제 화면(T4.27)에서 이 내용을 옮겨 붙인다.
// 로그인 필요 경로(proxy). flags.auth가 꺼진 환경(프로덕션)에서는 404. 세션은 요청 시점 값이라 Suspense 안에서 읽는다.
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageColumn, PageHeader } from "@/components/app-shell";
import { authCopy } from "@/copy/auth";
import { AccountScreen } from "@/features/auth/account-screen";
import { fromSupabaseProvider } from "@/features/auth/providers";
import { loginUrl } from "@/features/auth/routes";
import { isEnabled } from "@/lib/flags";
import { createServerSupabase } from "@/lib/supabase/server";
import "@/features/auth/auth.css";

export const metadata: Metadata = { title: authCopy.account.metaTitle };

type SearchParams = Record<string, string | string[] | undefined>;

async function Route({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // supabase-js 클라이언트가 만들어질 때 Date.now()를 읽는다. 요청 시점 렌더임을 먼저 밝힌다(cacheComponents)
  await connection();
  const failed = (await searchParams).error === "delete";
  const supabase = await createServerSupabase();
  const { data: claims } = supabase
    ? await supabase.auth.getClaims()
    : { data: null };
  const userId = claims?.claims?.sub;
  if (!supabase || !userId) redirect(loginUrl("/me/account"));
  const { data: profile } = await supabase
    .from("profiles")
    .select("provider")
    .eq("user_id", userId)
    .maybeSingle();
  return (
    <AccountScreen
      provider={fromSupabaseProvider(profile?.provider)}
      failed={failed}
    />
  );
}

function AccountSkeleton() {
  return (
    <div
      role="status"
      aria-busy
      aria-label={authCopy.account.loading}
      className="flex flex-col gap-10 pt-6"
    >
      <span className="h-3 w-44 rounded-full bg-skeleton" />
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex flex-col gap-3 border-t border-border pt-5"
        >
          <span className="h-3 w-20 rounded-full bg-skeleton" />
          <span className="h-3 w-56 rounded-full bg-skeleton" />
          <span className="h-12 w-full rounded-button bg-skeleton" />
        </div>
      ))}
    </div>
  );
}

export default function Page(props: { searchParams: Promise<SearchParams> }) {
  if (!isEnabled("auth")) notFound();
  return (
    <PageColumn>
      <PageHeader title={authCopy.account.title} backHref="/me" />
      <Suspense fallback={<AccountSkeleton />}>
        <Route {...props} />
      </Suspense>
    </PageColumn>
  );
}
