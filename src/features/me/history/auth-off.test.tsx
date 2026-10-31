// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MeAuthOff } from "./auth-off";

afterEach(cleanup);

describe("나 탭 로그인 꺼짐 (D-12 안건 12)", () => {
  it("안내, 오늘 추천 보기(보조), 흐린 예시는 보조 기술에서 숨기고, 화면 설정을 펼친다", () => {
    const { container } = render(<MeAuthOff />);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "로그인하면 기록이 쌓입니다",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "오늘 추천 보기" }),
    ).toHaveAttribute("href", "/today");
    const preview = container.querySelector("[inert]");
    expect(preview).toHaveAttribute("aria-hidden", "true");
    expect(
      screen.getByRole("heading", { level: 2, name: "화면 설정" }),
    ).toBeInTheDocument();
  });
});
