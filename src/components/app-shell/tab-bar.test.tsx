// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BottomTabBar, TabBarView } from "./tab-bar";

const pathname = vi.hoisted(() => ({ value: "/today" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

afterEach(cleanup);

describe("BottomTabBar", () => {
  it("주요 메뉴 nav 안에 라벨이 보이는 링크 4개", () => {
    render(<BottomTabBar />);
    const nav = screen.getByRole("navigation", { name: "주요 메뉴" });
    const links = screen.getAllByRole("link");
    for (const link of links) expect(nav).toContainElement(link);
    expect(links.map((a) => a.textContent)).toEqual([
      "오늘",
      "지도",
      "투표",
      "나",
    ]);
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/today",
      "/map",
      "/poll",
      "/me",
    ]);
  });

  it("현재 경로의 탭만 aria-current=page, 활성 막대도 그 탭에만", () => {
    pathname.value = "/poll/AbCdEf1234";
    const { container } = render(<BottomTabBar />);
    const poll = screen.getByRole("link", { name: "투표" });
    expect(poll).toHaveAttribute("aria-current", "page");
    for (const name of ["오늘", "지도", "나"]) {
      expect(screen.getByRole("link", { name })).not.toHaveAttribute(
        "aria-current",
      );
    }
    // 막대는 네 칸에 모두 있고(CSS 페이드, T2.22) 활성 칸만 data-active
    expect(
      container.querySelectorAll("[data-slot=tab-indicator]"),
    ).toHaveLength(4);
    const bars = container.querySelectorAll(
      "[data-slot=tab-indicator][data-active]",
    );
    expect(bars).toHaveLength(1);
    expect(bars[0]).toHaveClass("opacity-100");
    expect(poll.parentElement).toContainElement(bars[0] as HTMLElement);
  });

  it("탭 밖 경로면 활성 탭이 없다", () => {
    pathname.value = "/terms";
    render(<BottomTabBar />);
    expect(
      screen.getAllByRole("link").filter((a) => a.hasAttribute("aria-current")),
    ).toHaveLength(0);
  });
});

describe("TabBarView", () => {
  it("activeId를 직접 받고, preview면 눌러도 이동하지 않는다", () => {
    render(<TabBarView activeId="map" preview />);
    const map = screen.getByRole("link", { name: "지도" });
    expect(map).toHaveAttribute("aria-current", "page");
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    fireEvent(screen.getByRole("link", { name: "나" }), click);
    expect(click.defaultPrevented).toBe(true);
  });

  it("하단 safe-area만큼 아래를 비운다", () => {
    render(<TabBarView activeId={null} />);
    expect(screen.getByRole("navigation").className).toContain(
      "safe-area-inset-bottom",
    );
  });
});

describe("활성 막대 모션 (T2.22, CSS 전환)", () => {
  it("기본은 opacity 전환, 앱 설정이 줄이기면 전환 없음", async () => {
    const { MotionPreferenceContext } = await import("@/lib/motion/preference");
    const { container, rerender } = render(<TabBarView activeId="today" />);
    const bar = () =>
      container.querySelector("[data-slot=tab-indicator][data-active]");
    expect(bar()).toHaveClass("transition-opacity");
    expect(bar()).toHaveClass("motion-reduce:transition-none");
    expect(bar()).not.toHaveClass("transition-none");
    rerender(
      <MotionPreferenceContext value="reduce">
        <TabBarView activeId="today" />
      </MotionPreferenceContext>,
    );
    expect(bar()).toHaveClass("transition-none");
  });
});
