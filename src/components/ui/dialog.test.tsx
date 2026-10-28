// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { commonCopy } from "@/copy/common";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./sheet";

afterEach(cleanup);

describe("Dialog", () => {
  it("열리면 제목으로 이름 붙은 dialog와 한국어 닫기 버튼이 있다", () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{commonCopy.dialogs.discard.title}</DialogTitle>
            <DialogDescription>
              {commonCopy.dialogs.discard.body}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog", {
      name: commonCopy.dialogs.discard.title,
    });
    expect(dialog.className).toContain("rounded-card");
    expect(dialog.className).not.toMatch(/\bshadow-/);
    expect(
      screen.getByRole("button", { name: commonCopy.actions.close }),
    ).toBeInTheDocument();
  });
});

describe("Sheet", () => {
  it("아래 시트는 위쪽 라운드 sheet와 헤어라인을 쓴다", () => {
    render(
      <Sheet defaultOpen>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>필터</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>,
    );
    const sheet = screen.getByRole("dialog", { name: "필터" });
    expect(sheet).toHaveAttribute("data-side", "bottom");
    expect(sheet.className).toContain("data-[side=bottom]:rounded-t-sheet");
    expect(sheet.className).toContain("data-[side=bottom]:shadow-sheet");
    expect(
      screen.getByRole("button", { name: commonCopy.actions.close }),
    ).toBeInTheDocument();
  });
});
