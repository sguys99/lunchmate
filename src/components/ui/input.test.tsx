// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Input } from "./input";

afterEach(cleanup);

describe("Input", () => {
  it("높이 48, 16px 본문 글자(iOS 확대 방지), 포커스 링", () => {
    render(<Input aria-label="닉네임" />);
    const input = screen.getByRole("textbox", { name: "닉네임" });
    expect(input.className).toContain("h-12");
    expect(input.className).toContain("type-body");
    expect(input.className).toContain("rounded-input");
    expect(input.className).toContain("focus-visible:outline-ring");
    expect(input.className).toContain("focus-visible:outline-solid");
  });

  it("aria-invalid면 destructive 테두리 클래스가 걸린다", () => {
    render(<Input aria-label="닉네임" aria-invalid />);
    const input = screen.getByRole("textbox", { name: "닉네임" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.className).toContain("aria-invalid:border-destructive");
  });
});
