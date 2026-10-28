// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Skeleton } from "./skeleton";

afterEach(cleanup);

describe("Skeleton", () => {
  it("장식이라 aria-hidden, skeleton 면과 호흡 애니메이션, reduced motion이면 정지", () => {
    const { container } = render(<Skeleton className="h-5 w-24" />);
    const el = container.querySelector("[data-slot=skeleton]");
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el?.className).toContain("bg-skeleton");
    expect(el?.className).toContain("after:animate-skeleton-breathe");
    expect(el?.className).toContain("motion-reduce:after:animate-none");
    expect(el?.className).not.toContain("animate-pulse");
  });
});
