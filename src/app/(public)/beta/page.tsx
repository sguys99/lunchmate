// /beta 베타 환영 페이지 (T9.3, D-22, D-23: A 기기별 단계 목록 + C의 마루 부리 큰 제목). 화면은 features/beta/welcome.tsx.
// - 공개 경로, 로그인 불필요. 검색 엔진 제외(noindex), 사이트맵에 넣지 않는다(features/landing/seo.ts는 / 하나뿐).
// - 플래그는 새로 두지 않고 auth와 함께 연다(로그인 버튼이 /login으로 가므로, D-23 안건 3). auth가 꺼지면 404(프로덕션은 2026-11-02 T9.2 공개).
// - 기기는 요청 UA로 서버가 판정해 첫 HTML부터 맞는 안내를 그린다. 개발 환경에서만 ?device= 로 흉내 낸다(features/beta/env.ts).
// - 로그인 여부: 세션 쿠키가 있을 때만 Supabase에 묻는다(비로그인 첫 방문에 왕복을 더하지 않는다). 로그인했으면 주 버튼이 "오늘 추천 보기".
// - 요청 값(헤더, 쿠키, 쿼리)은 Suspense 안에서 읽는다(cacheComponents). 기다리는 동안은 스켈레톤(로딩 상태).
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { betaCopy } from "@/copy/beta";
import { hasSessionCookie } from "@/features/auth/routes";
import { resolveBetaEnv } from "@/features/beta/env";
import { BetaFrame, BetaSkeleton } from "@/features/beta/parts";
import { BetaWelcome } from "@/features/beta/welcome";
import { isEnabled } from "@/lib/flags";
import { createServerSupabase } from "@/lib/supabase/server";
import "@/features/auth/auth.css";

export const metadata: Metadata = {
  title: betaCopy.metaTitle,
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

async function signedIn(): Promise<boolean> {
  const names = (await cookies()).getAll().map((c) => c.name);
  if (!hasSessionCookie(names)) return false;
  const supabase = await createServerSupabase();
  if (!supabase) return false;
  try {
    const { data } = await supabase.auth.getClaims();
    return Boolean(data?.claims?.sub);
  } catch {
    return false;
  }
}

async function Route({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [raw, h, isSignedIn] = await Promise.all([
    searchParams,
    headers(),
    signedIn(),
  ]);
  const env = resolveBetaEnv(
    raw,
    h.get("user-agent"),
    process.env.NODE_ENV !== "production",
  );
  return <BetaWelcome env={env} signedIn={isSignedIn} />;
}

export default function Page(props: { searchParams: Promise<SearchParams> }) {
  if (!isEnabled("auth")) notFound();
  return (
    <Suspense
      fallback={
        <BetaFrame>
          <BetaSkeleton />
        </BetaFrame>
      }
    >
      <Route {...props} />
    </Suspense>
  );
}
