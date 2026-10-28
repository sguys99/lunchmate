// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { commonCopy } from "@/copy/common";
import { Toaster, toast } from "./sonner";

afterEach(cleanup);

describe("Toaster", () => {
  it("한국어 영역 이름을 갖고, 토스트를 토큰 클래스로 그린다", async () => {
    render(<Toaster />);
    expect(
      screen.getByRole("region", {
        name: new RegExp(commonCopy.a11y.notifications),
      }),
    ).toBeInTheDocument();
    act(() => {
      toast.success(commonCopy.toasts.linkCopied);
    });
    const title = await screen.findByText(commonCopy.toasts.linkCopied);
    const item = title.closest("[data-sonner-toast]");
    expect(item?.className).toContain("bg-popover");
    expect(item?.className).toContain("border-border");
  });
});
