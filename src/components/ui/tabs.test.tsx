// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

afterEach(cleanup);

function renderTabs(variant?: "line" | "segment") {
  return render(
    <Tabs defaultValue="visit">
      <TabsList variant={variant}>
        <TabsTrigger value="visit">방문</TabsTrigger>
        <TabsTrigger value="saved">저장</TabsTrigger>
      </TabsList>
      <TabsContent value="visit">방문 목록</TabsContent>
      <TabsContent value="saved">저장 목록</TabsContent>
    </Tabs>,
  );
}

describe("Tabs", () => {
  it("탭 역할과 선택 상태(aria-selected)를 알리고, 누르면 패널이 바뀐다", () => {
    renderTabs();
    const visit = screen.getByRole("tab", { name: "방문" });
    const saved = screen.getByRole("tab", { name: "저장" });
    expect(visit).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("방문 목록");
    fireEvent.click(saved);
    expect(saved).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("저장 목록");
  });

  it("line은 밑줄 표시 막대, segment는 card 면 표시 막대", () => {
    const { container, unmount } = renderTabs();
    const line = container.querySelector("[data-slot=tabs-indicator]");
    expect(line?.className).toContain("bg-primary");
    expect(screen.getByRole("tablist")).toHaveAttribute("data-variant", "line");
    unmount();
    const seg = renderTabs("segment").container.querySelector(
      "[data-slot=tabs-indicator]",
    );
    expect(seg?.className).toContain("bg-card");
    expect(seg?.className).not.toContain("bg-primary");
  });

  it("탭 높이 44px 이상", () => {
    renderTabs();
    expect(screen.getByRole("tab", { name: "방문" }).className).toContain(
      "min-h-11",
    );
  });
});
