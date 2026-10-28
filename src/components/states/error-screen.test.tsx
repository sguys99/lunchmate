// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RootError from "@/app/error";
import AppError from "@/app/(app)/error";
import { commonCopy } from "@/copy/common";
import { ErrorScreen, NotFoundScreen } from "./index";

const reportError = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/lib/errors/report-error", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/errors/report-error")>()),
  reportError,
}));

beforeEach(() => reportError.mockClear());
afterEach(cleanup);

const copy = commonCopy.errorPage;

describe("ErrorScreen (T2.18)", () => {
  it("문구, 다시 시도(primary), 오늘 추천 링크를 보여 주고 다시 시도를 누르면 onRetry", () => {
    const onRetry = vi.fn();
    render(
      <ErrorScreen
        error={new Error("db down")}
        onRetry={onRetry}
        homeHref="/today"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(copy.title);
    const retry = screen.getByRole("button", { name: copy.retry });
    expect(retry).toHaveAttribute("data-variant", "primary");
    expect(screen.getByRole("link", { name: copy.home })).toHaveAttribute(
      "href",
      "/today",
    );
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("오류 메시지는 보여 주지 않고, digest가 있으면 참고 번호만 보여 준다", () => {
    const error = Object.assign(new Error("secret stack detail"), {
      digest: "1234567",
    });
    const { container } = render(
      <ErrorScreen error={error} onRetry={() => {}} homeHref="/" />,
    );
    expect(container).not.toHaveTextContent("secret stack detail");
    expect(screen.getByText(copy.reference("1234567"))).toBeInTheDocument();
  });

  it("digest가 없거나 Error가 아닌 값이어도 그린다", () => {
    const { container } = render(
      <ErrorScreen error="boom" onRetry={() => {}} homeHref="/" />,
    );
    expect(container).not.toHaveTextContent("boom");
    expect(container).not.toHaveTextContent(copy.reference(""));
  });

  it("마운트할 때 오류를 한 번 보고한다", () => {
    const error = new Error("x");
    render(<ErrorScreen error={error} onRetry={() => {}} homeHref="/" />);
    expect(reportError).toHaveBeenCalledTimes(1);
    expect(reportError).toHaveBeenCalledWith(error);
  });
});

describe("error.tsx 경계", () => {
  it("루트 error는 retry를 연결하고 오늘 추천을 랜딩(/)으로 보낸다", () => {
    const retry = vi.fn();
    render(<RootError error={new Error("x")} retry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: copy.retry }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: copy.home })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("(app) error는 셸 안에서 오늘 탭(/today)으로 보낸다", () => {
    const retry = vi.fn();
    render(<AppError error={new Error("x")} retry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: copy.retry }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: copy.home })).toHaveAttribute(
      "href",
      "/today",
    );
  });
});

describe("NotFoundScreen", () => {
  it("찾을 수 없음 문구와 오늘 추천 링크 하나(primary)", () => {
    const { title, action } = commonCopy.states.notFound;
    render(<NotFoundScreen homeHref="/today" />);
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    const link = screen.getByRole("link", { name: action });
    expect(link).toHaveAttribute("href", "/today");
    expect(screen.queryByRole("button")).toBeNull();
  });
});
