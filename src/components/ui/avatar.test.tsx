// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

afterEach(cleanup);

describe("Avatar", () => {
  it("이미지가 없으면 이니셜 대체가 보이고 크기 속성이 붙는다", () => {
    const { container } = render(
      <Avatar size="lg">
        <AvatarImage alt="민지" />
        <AvatarFallback>민</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText("민")).toBeInTheDocument();
    expect(container.querySelector("[data-slot=avatar]")).toHaveAttribute(
      "data-size",
      "lg",
    );
  });
});
