// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { commonCopy } from "@/copy/common";
import { LazyToaster, resetLazyToasterForTest, toast } from "./lazy-toaster";

afterEach(() => {
  cleanup();
  resetLazyToasterForTest();
});

describe("LazyToaster (T2.22)", () => {
  it("첫 toast() 전에는 아무것도 그리지 않는다", () => {
    const { container } = render(<LazyToaster />);
    expect(container).toBeEmptyDOMElement();
    expect(
      screen.queryByRole("region", {
        name: new RegExp(commonCopy.a11y.notifications),
      }),
    ).toBeNull();
  });

  it("첫 toast()에 Toaster를 마운트하고, 마운트 전에 만든 토스트도 보여 준다", async () => {
    render(<LazyToaster />);
    await act(async () => {
      await toast.success(commonCopy.toasts.linkCopied);
    });
    expect(
      await screen.findByText(commonCopy.toasts.linkCopied),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", {
        name: new RegExp(commonCopy.a11y.notifications),
      }),
    ).toBeInTheDocument();
  });
});
