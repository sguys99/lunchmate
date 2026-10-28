// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Chip, ChipGroup } from "./chip";
import { Toggle } from "./toggle";

afterEach(cleanup);

describe("Toggle / Chip", () => {
  it("칩은 누르면 aria-pressed가 true가 되고 다시 누르면 false", () => {
    render(<Chip>국밥</Chip>);
    const chip = screen.getByRole("button", { name: "국밥" });
    expect(chip).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(chip).toHaveAttribute("data-pressed");
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "false");
  });

  it("칩 선택 스타일은 면이 아니라 primary 테두리와 글자", () => {
    render(<Chip defaultPressed>한식</Chip>);
    const chip = screen.getByRole("button", { name: "한식" });
    expect(chip).toHaveAttribute("data-variant", "chip");
    expect(chip.className).toContain("data-pressed:border-primary");
    expect(chip.className).toContain("data-pressed:text-primary");
    expect(chip.className).not.toMatch(/data-pressed:bg-primary/);
    expect(chip.className).toContain("rounded-chip");
  });

  it("ChipGroup multiple은 여러 칩을 함께 고르고 값 배열을 알린다", () => {
    const onValueChange = vi.fn();
    render(
      <ChipGroup multiple aria-label="카테고리" onValueChange={onValueChange}>
        <Chip value="hansik">한식</Chip>
        <Chip value="ilsik">일식</Chip>
      </ChipGroup>,
    );
    expect(screen.getByRole("group", { name: "카테고리" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "한식" }));
    fireEvent.click(screen.getByRole("button", { name: "일식" }));
    expect(onValueChange).toHaveBeenLastCalledWith(
      ["hansik", "ilsik"],
      expect.anything(),
    );
  });

  it("quiet 토글은 아이콘 버튼 크기(44px)", () => {
    render(<Toggle variant="quiet" aria-label="저장" />);
    expect(screen.getByRole("button", { name: "저장" }).className).toContain(
      "size-11",
    );
  });
});
