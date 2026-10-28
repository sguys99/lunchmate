"use client";

// 앱 셸에서 분석을 시작하고 라우터 전환마다 페이지뷰를 보낸다 (T2.20 후속).
// PostHog는 scheduleAnalytics()가 첫 상호작용이나 유휴 시점에 지연 로딩하고, 그 전 페이지뷰는 큐에 쌓인다.
// usePathname을 읽으므로 (app)/layout에서 Suspense로 감싼다.
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { scheduleAnalytics } from "./index";
import { pageviewPath } from "./pageview";
import { capturePageview } from "./track";

let scheduled = false;

export function AnalyticsPageviews() {
  const pathname = usePathname();

  useEffect(() => {
    if (scheduled) return;
    scheduled = true;
    scheduleAnalytics();
  }, []);

  useEffect(() => {
    if (!pathname) return;
    capturePageview(window.location.origin + pageviewPath(pathname));
  }, [pathname]);

  return null;
}
