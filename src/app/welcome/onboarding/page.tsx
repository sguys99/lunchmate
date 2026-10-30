// 온보딩 /welcome/onboarding (T4.16~T4.22, PRD ONB-01~05, D-07). 화면은 features/onboarding/onboarding-screen.tsx.
// 약관 동의 뒤(features/auth/terms.ts)와 로그인 콜백(사무실이 없을 때)이 ?next=<하려던 경로>로 보낸다.
// - 로그인 필요 경로(proxy, /welcome). 세션이 없으면 로그인으로, 약관 전이면 약관으로, 이미 사무실이 있으면 next로.
// - 둘러보기에서 고른 값(T4.20)은 next 쿼리에서 읽는다(features/onboarding/guest-handoff.ts).
// - 지도 SDK는 이 화면에서만 동적으로 불러온다. 카카오 SDK는 검색과 근처 식당 수를 셀 때만 받는다.
// - flags.auth가 꺼진 환경(프로덕션)에서는 404.
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { onboardingCopy } from "@/copy/onboarding";
import { sanitizeNext } from "@/features/auth/redirect";
import { loginUrl, termsUrl } from "@/features/auth/routes";
import { readGuestHandoff } from "@/features/onboarding/guest-handoff";
import {
  OnboardingScreen,
  OnboardingSkeleton,
} from "@/features/onboarding/onboarding-screen";
import { isEnabled } from "@/lib/flags";
import { QueryProvider } from "@/lib/query";
import { createServerSupabase } from "@/lib/supabase/server";
import { finishOnboardingAction } from "./actions";
import "@/features/onboarding/onboarding.css";

export const metadata: Metadata = {
  title: onboardingCopy.metaTitle,
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

async function Route({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await connection();
  const raw = (await searchParams).next;
  const next = sanitizeNext(Array.isArray(raw) ? raw[0] : raw);

  const supabase = await createServerSupabase();
  if (!supabase) redirect(loginUrl(next, "failed"));
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect(loginUrl(next));

  const [{ data: profile }, offices] = await Promise.all([
    supabase
      .from("profiles")
      .select("terms_agreed_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("offices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);
  // 약관 전이면 약관부터(약관 뒤 다시 여기로 온다)
  if (profile && !profile.terms_agreed_at) redirect(termsUrl(next));
  if (!offices.error && (offices.count ?? 0) > 0) redirect(next);

  const handoff = readGuestHandoff(next);
  return (
    <OnboardingScreen
      next={next}
      initialPrefs={handoff.prefs}
      initialAvoid={handoff.avoid}
      submit={finishOnboardingAction}
    />
  );
}

export default function Page(props: { searchParams: Promise<SearchParams> }) {
  if (!isEnabled("auth")) notFound();
  return (
    <QueryProvider>
      <Suspense fallback={<OnboardingSkeleton />}>
        <Route {...props} />
      </Suspense>
    </QueryProvider>
  );
}
