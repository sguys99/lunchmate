// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Badge } from "./badge";

afterEach(cleanup);

describe("Badge", () => {
  it("면 없이 1px 테두리, 라운드 badge, caption 글자", () => {
    render(<Badge>추정</Badge>);
    const badge = screen.getByText("추정");
    expect(badge.tagName).toBe("SPAN");
    expect(badge).toHaveAttribute("data-slot", "badge");
    expect(badge.className).toContain("rounded-badge");
    expect(badge.className).toContain("bg-transparent");
    expect(badge.className).toContain("type-caption");
  });

  it("의미 variant는 테두리 실색 + 글자 foreground", () => {
    render(<Badge variant="warning">웨이팅</Badge>);
    const badge = screen.getByText("웨이팅");
    expect(badge.className).toContain("border-warning");
    expect(badge.className).toContain("text-warning-foreground");
  });
});
