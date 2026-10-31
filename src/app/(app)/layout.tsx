// 로그인 후 앱 화면 묶음의 레이아웃 (T2.6). 하단 탭과 2단 틀(AppShell), 모션, 토스트, 서버 데이터 캐시를 여기서 한 번만 마운트한다.
// 홈 첫 로드를 줄이려고(T2.22) 모션은 앱 설정 컨텍스트만 두고(UiPrefsProvider가 화면 설정 저장소 값으로 MotionPreferenceProvider를 감싼다, T4.25) Motion(LazyMotion)은 쓰는 화면이
// 자기 영역에 MotionProvider로 감싼다. 토스트는 첫 호출 때 로드(LazyToaster)한다.
// QueryProvider(T2.19)는 가장 바깥: 데이터 캐시는 모션 설정과 무관하고, 토스트와 셸 어디서든 쿼리를 쓸 수 있게 한다.
// 루트 layout은 랜딩과 약관도 감싸므로 건드리지 않는다. 랜딩에 모션이 필요해지면 그쪽 레이아웃에서 따로 감싼다.
// 로그인 확인은 proxy(T4.8)가 한다. 로그인이 열려 있는지(flags.auth)는 LoginGateProvider로 클라이언트 화면에 내려 준다.
// 데스크톱 우측 지도 칸은 @map 슬롯(T5.17)이 채운다. 오늘은 추천 핀 지도, 나머지 화면은 빈 지도 자리(@map/default, [...rest]).
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AppShell, BottomTabBar, TabBarView } from "@/components/app-shell";
import { LazyToaster } from "@/components/ui/lazy-toaster";
import { LoginGateProvider } from "@/features/auth/login-prompt/gate";
import { AnalyticsPageviews } from "@/lib/analytics/provider";
import { isEnabled } from "@/lib/flags";
import { QueryProvider } from "@/lib/query";
import { UiPrefsProvider } from "@/lib/ui-prefs/provider";

// safe-area: 노치와 홈 인디케이터 아래까지 그리고 env(safe-area-inset-*)로 비운다(AppShell, 하단 탭).
export const viewport: Viewport = { viewportFit: "cover" };

// 탭 화면이 자리 표시뿐인 동안 검색 엔진에 노출하지 않는다.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AppLayout({
  children,
  map,
}: {
  children: ReactNode;
  /** @map 슬롯: 데스크톱 우측 지도 칸 */
  map?: ReactNode;
}) {
  // 앱 화면 묶음 플래그(flags.appShell). 2026-10-31부터 프로덕션에서도 켜져 있고, 끄면 404다(CLAUDE.md 11장)
  if (!isEnabled("appShell")) notFound();
  return (
    <QueryProvider>
      {/* 로그인이 열려 있는지(flags.auth, 서버 판정). 닫혀 있으면 로그인 유도가 "곧 열립니다" 토스트가 된다(gate.tsx) */}
      <LoginGateProvider open={isEnabled("auth")}>
        <UiPrefsProvider>
          <AppShell
            map={map}
            tabBar={
              // usePathname을 읽는 클라이언트 경계. 경로를 모르는 순간에는 활성 없는 같은 막대를 보여 준다.
              <Suspense fallback={<TabBarView activeId={null} />}>
                <BottomTabBar />
              </Suspense>
            }
          >
            {children}
          </AppShell>
          {/* 첫 toast() 호출 때 sonner를 받는다(T2.22). 화면 코드는 @/components/ui/lazy-toaster의 toast를 쓴다 */}
          <LazyToaster />
          <Suspense fallback={null}>
            <AnalyticsPageviews />
          </Suspense>
        </UiPrefsProvider>
      </LoginGateProvider>
    </QueryProvider>
  );
}
