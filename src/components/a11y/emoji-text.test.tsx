// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EmojiText } from "./emoji-text";

describe("EmojiText (T8.9 F6)", () => {
  afterEach(cleanup);

  it("이모지가 없으면 글자 그대로", () => {
    const { container } = render(<p>{EmojiText({ text: "새로 찾은 곳" })}</p>);
    expect(container.innerHTML).toBe("<p>새로 찾은 곳</p>");
  });

  it("👍는 aria-hidden, 읽기는 좋아요", () => {
    render(
      <button type="button">
        <EmojiText text="👍 상위" />
      </button>,
    );
    const btn = screen.getByRole("button", { name: "좋아요 상위" });
    const hidden = btn.querySelector("[aria-hidden]");
    expect(hidden?.textContent).toBe("👍");
    expect(btn.querySelector(".sr-only")?.textContent).toBe("좋아요");
  });

  it("문장 가운데 여러 번", () => {
    render(
      <p data-testid="p">
        <EmojiText text="지난주 👍한 곳, 👍 80%" />
      </p>,
    );
    expect(screen.getByTestId("p").textContent).toBe(
      "지난주 👍좋아요한 곳, 👍좋아요 80%",
    );
  });

  it("프로토타입 이름 조각을 이모지로 보지 않는다", () => {
    const { container } = render(
      <p>
        <EmojiText text="toString 👍" />
      </p>,
    );
    expect(container.querySelectorAll("[aria-hidden]")).toHaveLength(1);
  });
});
