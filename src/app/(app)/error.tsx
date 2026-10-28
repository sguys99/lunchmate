"use client";
// 앱 화면(오늘, 지도, 투표, 나) 오류 경계 (T2.18, APP-06). (app) 레이아웃 안쪽이라 하단 탭이 그대로 남아
// 다른 탭으로 옮겨 갈 수 있다. 레이아웃 자체의 오류는 루트 error.tsx가 받는다.
// 클라이언트 경계라 묶음(index) 대신 필요한 파일만 가져온다: index는 page-header(lucide, cva)까지 끌고 온다 (T2.22).
import { PageColumn } from "@/components/app-shell/app-shell";
import { APP_TABS } from "@/components/app-shell/tabs";
import { ErrorScreen } from "@/components/states/error-screen";

const todayHref = APP_TABS.find(({ id }) => id === "today")?.href ?? "/";

export default function AppError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <PageColumn>
      <ErrorScreen error={error} onRetry={retry} homeHref={todayHref} />
    </PageColumn>
  );
}
