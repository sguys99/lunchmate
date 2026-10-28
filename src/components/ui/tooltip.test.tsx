// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

afterEach(cleanup);

describe("Tooltip", () => {
  it("열리면 popover 면과 caption 글자로 보인다", () => {
    render(
      <TooltipProvider>
        <Tooltip defaultOpen>
          <TooltipTrigger>정보</TooltipTrigger>
          <TooltipContent>후기 3건 이상부터 반영합니다</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    const content = screen.getByText("후기 3건 이상부터 반영합니다");
    expect(content).toHaveAttribute("data-slot", "tooltip-content");
    expect(content.className).toContain("bg-popover");
    expect(content.className).toContain("type-caption");
  });
});
