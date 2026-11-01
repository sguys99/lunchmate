// 첫 로그인 흐름(/welcome/terms, /welcome/onboarding)의 공통 레이아웃 (T8.16).
// 이 경로는 (app) 레이아웃 밖이라 분석 시작과 페이지뷰가 없었다. 그러면 온보딩 도중 떠난 사람의
// onboarding_step_completed가 큐에만 남아 사라지고, "첫 로그인 → 온보딩 완료"(PRD 2.3절) 퍼널의 시작점도 없다.
// (app) 레이아웃과 같은 AnalyticsPageviews를 둔다. 페이지뷰는 경로만 보낸다(쿼리 next는 버림, pageview.ts).
// PostHog는 첫 상호작용이나 유휴 시점에 동적 import되므로 이 화면의 첫 렌더 비용은 늘지 않는다.
import { Suspense } from "react";
import { AnalyticsPageviews } from "@/lib/analytics/provider";

export default function WelcomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <AnalyticsPageviews />
      </Suspense>
    </>
  );
}
