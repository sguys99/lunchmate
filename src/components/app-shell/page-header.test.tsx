// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PageHeader } from "./page-header";

afterEach(cleanup);

describe("PageHeader", () => {
  it("제목은 세리프 h1 하나", () => {
    render(<PageHeader title="오늘" eyebrow="10월 29일 점심" />);
    const h1 = screen.getByRole("heading", { level: 1, name: "오늘" });
    expect(h1.className).toContain("type-title");
    expect(screen.getByText("10월 29일 점심")).toBeInTheDocument();
  });

  it("backHref가 있을 때만 이름 있는 뒤로 링크", () => {
    const { rerender } = render(<PageHeader title="설정" />);
    expect(screen.queryByRole("link", { name: "뒤로" })).toBeNull();
    rerender(<PageHeader title="설정" backHref="/me" />);
    expect(screen.getByRole("link", { name: "뒤로" })).toHaveAttribute(
      "href",
      "/me",
    );
  });

  it("action 자리에 넣은 요소를 그대로 보여 준다", () => {
    render(<PageHeader title="오늘" action={<button>다시 뽑기</button>} />);
    expect(
      screen.getByRole("button", { name: "다시 뽑기" }),
    ).toBeInTheDocument();
  });
});
