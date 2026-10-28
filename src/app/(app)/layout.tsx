// 로그인 후 앱 화면 묶음의 레이아웃 (T2.6). 하단 탭과 2단 틀(AppShell), 모션, 토스트, 서버 데이터 캐시를 여기서 한 번만 마운트한다.
// QueryProvider(T2.19)는 가장 바깥: 데이터 캐시는 모션 설정과 무관하고, 토스트와 셸 어디서든 쿼리를 쓸 수 있게 한다.
// 루트 layout은 랜딩과 약관도 감싸므로 건드리지 않는다. 랜딩에 모션이 필요해지면 그쪽 레이아웃에서 따로 감싼다.
// 로그인 확인(AUTH)은 T4에서 이 레이아웃에 더한다.
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppShell, BottomTabBar, TabBarView } from "@/components/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { isEnabled } from "@/lib/flags";
import { MotionProvider } from "@/lib/motion";
import { QueryProvider } from "@/lib/query";

// safe-area: 노치와 홈 인디케이터 아래까지 그리고 env(safe-area-inset-*)로 비운다(AppShell, 하단 탭).
export const viewport: Viewport = { viewportFit: "cover" };

// 탭 화면이 자리 표시뿐인 동안 검색 엔진에 노출하지 않는다.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AppLayout({ children }: LayoutProps<"/">) {
  // 미완성 화면은 프로덕션에서 404 (CLAUDE.md 11장, flags.appShell)
  if (!isEnabled("appShell")) notFound();
  return (
    <QueryProvider>
      <MotionProvider>
        <AppShell
          tabBar={
            // usePathname을 읽는 클라이언트 경계. 경로를 모르는 순간에는 활성 없는 같은 막대를 보여 준다.
            <Suspense fallback={<TabBarView activeId={null} />}>
              <BottomTabBar />
            </Suspense>
          }
        >
          {children}
        </AppShell>
        <Toaster />
      </MotionProvider>
    </QueryProvider>
  );
}
