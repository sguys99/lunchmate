// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Button } from "./button";

afterEach(cleanup);

describe("Button", () => {
  it("기본 variant는 secondary(테두리)다. 올리브 면은 primary를 명시할 때만", () => {
    render(<Button>다른 곳</Button>);
    const button = screen.getByRole("button", { name: "다른 곳" });
    expect(button).toHaveAttribute("data-variant", "secondary");
    expect(button.className).toContain("border-border");
    expect(button.className).not.toContain("bg-primary");
  });

  it("primary는 primary 면, 알약 라운드, 높이 48", () => {
    render(<Button variant="primary">길찾기</Button>);
    const button = screen.getByRole("button", { name: "길찾기" });
    expect(button.className).toContain("bg-primary");
    expect(button.className).toContain("rounded-button");
    expect(button.className).toContain("h-12");
  });

  it("작은 버튼도 44px 터치 영역 클래스와 포커스 링을 가진다", () => {
    render(<Button size="icon-sm" aria-label="닫기" />);
    const button = screen.getByRole("button", { name: "닫기" });
    expect(button.className).toContain("before:h-[max(100%,2.75rem)]");
    expect(button.className).toContain("focus-visible:outline-ring");
    expect(button.className).toContain("motion-reduce:transition-none");
  });

  it("disabled면 비활성으로 노출된다", () => {
    render(
      <Button variant="primary" disabled>
        길찾기
      </Button>,
    );
    expect(screen.getByRole("button", { name: "길찾기" })).toBeDisabled();
  });
});
