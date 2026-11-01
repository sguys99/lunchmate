// 관리자 화면 묶음 (T8.5, MOD-06). 가드 세 겹 중 둘째: 레이아웃 서버 컴포넌트가 role을 읽어 관리자가 아니면 404(존재를 숨긴다).
// 첫째는 proxy의 /admin 로그인 확인(T4.8), 셋째는 모든 데이터와 처리를 맡는 admin_* 보안 함수의 관리자 확인이다.
// - 플래그: adminConsole(로그인 묶음과 함께 프로덕션에 연다). 꺼져 있거나 로그인 묶음이 꺼져 있으면 404.
// - 세션 읽기는 요청 시점 값이라 Suspense 안에서 한다(cacheComponents). 기다리는 동안은 스켈레톤.
// - 하단 탭이 없는 화면이라 토스트를 화면 아래 24px에 띄운다. 서버 데이터는 TanStack Query 세션 메모리에만 둔다.
// - 화면 설정(다크, 모션 줄이기)은 루트 첫 페인트 스크립트가 <html>에 단 값을 그대로 따른다.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { LoadingRegion, SkeletonLine } from "@/components/states";
import { LazyToaster } from "@/components/ui/lazy-toaster";
import { adminCopy } from "@/copy/admin";
import { getAdminSession } from "@/features/admin/server";
import { isEnabled } from "@/lib/flags";
import { QueryProvider } from "@/lib/query";

export const metadata: Metadata = {
  title: adminCopy.metaTitle,
  robots: { index: false, follow: false },
};

async function AdminGate({ children }: { children: ReactNode }) {
  const admin = await getAdminSession();
  if (!admin) notFound();
  return children;
}

function GateFallback() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-8 desktop:px-10 desktop:pt-12">
      <LoadingRegion label={adminCopy.frame.loading} className="flex flex-col gap-6">
        <SkeletonLine type="heading" className="w-48" />
        <SkeletonLine type="caption" className="w-40" />
        <SkeletonLine type="heading" className="w-full max-w-lg" />
      </LoadingRegion>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  if (!isEnabled("adminConsole") || !isEnabled("auth")) notFound();
  return (
    <QueryProvider>
      {/* desktop: 변형은 @container/screen 기준이다(globals.css). 앱 셸 밖이라 여기서 컨테이너를 둔다 */}
      <div className="@container/screen flex min-h-dvh flex-1 flex-col bg-background text-foreground">
        <Suspense fallback={<GateFallback />}>
          <AdminGate>{children}</AdminGate>
        </Suspense>
      </div>
      <LazyToaster
        offset={{ bottom: "1.5rem" }}
        mobileOffset={{ bottom: "1rem", left: "1rem", right: "1rem" }}
      />
    </QueryProvider>
  );
}
