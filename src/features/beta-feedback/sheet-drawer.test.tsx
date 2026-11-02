// @vitest-environment jsdom
// 베타 의견 시트 (T9.4, D-23). 서버 액션 대신 send를 주입해 입력, 첨부 기본값, 보낸 값, 상태를 본다.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rememberRoute, resetLastRoute } from "./last-route";
import type { BetaFeedbackRequest, BetaFeedbackResult } from "./requests";

vi.mock("./actions", () => ({ sendBetaFeedbackAction: vi.fn() }));

const { default: Sheet, attachDefault, sentInfoParts } = await import("./sheet-drawer");

afterEach(() => {
  cleanup();
  resetLastRoute();
});
beforeEach(() => {
  Object.defineProperty(window.navigator, "userAgent", {
    value:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0",
    configurable: true,
  });
  window.matchMedia ??= ((q: string) => ({
    matches: false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

describe("첨부 기본값과 보이는 정보", () => {
  it("버그, 불편은 켬, 좋아요, 제안, 미선택은 끔", () => {
    expect(attachDefault("bug")).toBe(true);
    expect(attachDefault("inconvenient")).toBe(true);
    expect(attachDefault("good")).toBe(false);
    expect(attachDefault("idea")).toBe(false);
    expect(attachDefault(null)).toBe(false);
  });
  it("함께 보내는 정보 줄", () => {
    expect(
      sentInfoParts("/today", { device: "android", inApp: true, standalone: false }),
    ).toEqual(["화면 /today", expect.stringMatching(/^앱 /), "안드로이드", "앱 안 브라우저"]);
    expect(sentInfoParts(null, null)).toHaveLength(1);
  });
});

describe("시트", () => {
  it("종류를 고르면 예시 문구와 첨부가 바뀌고, 보낸 값에 경로 틀과 기기 종류만 들어간다", async () => {
    rememberRoute("/poll/abc123xyz0");
    const send = vi
      .fn<(i: BetaFeedbackRequest) => Promise<BetaFeedbackResult>>()
      .mockResolvedValue({ ok: true });
    render(<Sheet open onOpenChange={() => {}} send={send} />);
    const box = await screen.findByRole("textbox", { name: "내용" });
    const attach = screen.getByRole("checkbox", { name: "지금 보던 화면 함께 보내기" });
    expect(attach).not.toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "버그" }));
    expect(box).toHaveAttribute("placeholder", "어떤 화면에서 무엇을 눌렀을 때 생겼는지 적어 주세요.");
    await waitFor(() => expect(attach).toBeChecked());
    expect(screen.getByTestId("beta-sent-info").textContent).toContain("화면 /poll/[code]");

    fireEvent.click(screen.getByRole("button", { name: "좋아요" }));
    await waitFor(() => expect(attach).not.toBeChecked());
    fireEvent.click(screen.getByRole("button", { name: "버그" }));
    await waitFor(() => expect(attach).toBeChecked());

    // 빈 글은 보내지 않는다
    fireEvent.click(screen.getByRole("button", { name: "보내기" }));
    expect(send).not.toHaveBeenCalled();

    fireEvent.change(box, { target: { value: "득표 바가 비어 보였습니다." } });
    fireEvent.click(screen.getByRole("button", { name: "보내기" }));
    await screen.findByText("고마워요, 잘 받았어요");
    expect(send).toHaveBeenCalledWith({
      category: "bug",
      body: "득표 바가 비어 보였습니다.",
      route: "/poll/[code]",
      device: "ios",
      inApp: true,
      standalone: false,
    });
  });

  it("한도는 버튼을 끄고, 실패는 쓴 글을 남긴 채 다시 보내기", async () => {
    const send = vi
      .fn<(i: BetaFeedbackRequest) => Promise<BetaFeedbackResult>>()
      .mockResolvedValueOnce({ ok: false, error: "save" })
      .mockResolvedValueOnce({ ok: false, error: "limit" });
    render(<Sheet open onOpenChange={() => {}} send={send} />);
    const box = await screen.findByRole("textbox", { name: "내용" });
    fireEvent.change(box, { target: { value: "다른 글 하나" } });
    fireEvent.click(screen.getByRole("button", { name: "보내기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("의견을 보내지 못했습니다");
    expect(box).toHaveValue("다른 글 하나");
    fireEvent.click(screen.getByRole("button", { name: "다시 보내기" }));
    expect(await screen.findByText(/오늘은 의견을 10번 보냈습니다/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "보내기" })).toHaveAttribute("aria-disabled", "true");
    expect(box).toHaveValue("다른 글 하나");
  });
});
