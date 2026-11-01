// @vitest-environment jsdom
// 첫 로그인 흐름 레이아웃 (T8.16): 약관, 온보딩 화면에서도 분석을 시작하고 경로만 담은 페이지뷰를 보낸다.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { capturePageview, scheduleAnalytics } = vi.hoisted(() => ({
  capturePageview: vi.fn(),
  scheduleAnalytics: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/welcome/onboarding",
}));
vi.mock("@/lib/analytics/track", () => ({ capturePageview }));
vi.mock("@/lib/analytics/index", () => ({ scheduleAnalytics }));

import WelcomeLayout from "./layout";

afterEach(cleanup);

describe("WelcomeLayout", () => {
  it("자식을 그리고, 분석 시작과 온보딩 경로 페이지뷰를 보낸다", () => {
    render(
      <WelcomeLayout>
        <p>본문</p>
      </WelcomeLayout>,
    );
    expect(screen.getByText("본문")).toBeVisible();
    expect(scheduleAnalytics).toHaveBeenCalledTimes(1);
    expect(capturePageview).toHaveBeenCalledWith(
      `${window.location.origin}/welcome/onboarding`,
    );
  });
});
