// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Checkbox } from "./checkbox";

afterEach(cleanup);

describe("Checkbox", () => {
  it("감싼 label 이름으로 찾을 수 있고 누르면 켜진다", () => {
    const onChange = vi.fn();
    render(
      <label>
        <Checkbox onCheckedChange={onChange} />
        이용약관 동의
      </label>,
    );
    const box = screen.getByRole("checkbox", { name: "이용약관 동의" });
    expect(box).toHaveAttribute("aria-checked", "false");
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(true, expect.anything());
    expect(box).toHaveAttribute("aria-checked", "true");
  });

  it("켜진 상태는 면이 아니라 primary 테두리로 표시한다", () => {
    render(<Checkbox defaultChecked aria-label="모두 동의" />);
    const box = screen.getByRole("checkbox", { name: "모두 동의" });
    expect(box.className).toContain("data-checked:border-primary");
    expect(box.className).not.toMatch(/data-checked:bg-primary/);
  });

  it("indeterminate면 aria-checked가 mixed", () => {
    render(<Checkbox indeterminate aria-label="모두 동의" />);
    expect(screen.getByRole("checkbox", { name: "모두 동의" })).toHaveAttribute(
      "aria-checked",
      "mixed",
    );
  });
});
