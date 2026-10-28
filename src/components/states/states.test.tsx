// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Inbox } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { commonCopy } from "@/copy/common";
import {
  CardSkeleton,
  EmptyState,
  ErrorState,
  ListSkeleton,
  LoadingRegion,
  OfflineState,
  SheetSkeleton,
  StateGlyph,
} from "./index";

afterEach(cleanup);

const { states } = commonCopy;

describe("스켈레톤", () => {
  it("CardSkeleton: aria-busy 영역 + 로딩 문구 status 1개, 막대는 숨김", () => {
    const { container } = render(<CardSkeleton count={3} />);
    const region = container.querySelector("[data-slot=loading-region]");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent(
      states.loading.label,
    );
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(container.querySelectorAll("[data-slot=card-skeleton]")).toHaveLength(
      3,
    );
    for (const bar of container.querySelectorAll("[data-slot=skeleton]")) {
      expect(bar.closest("[aria-hidden=true]")).not.toBeNull();
    }
  });

  it("ListSkeleton: rows 수만큼 행, 로딩 문구를 바꿀 수 있다", () => {
    const { container } = render(<ListSkeleton rows={4} label="목록 준비" />);
    expect(container.querySelectorAll("li")).toHaveLength(4);
    expect(screen.getByRole("status")).toHaveTextContent("목록 준비");
  });

  it("SheetSkeleton: 제목 줄은 title 글자 스타일, children은 요약과 정보 행 사이", () => {
    const { container } = render(
      <SheetSkeleton infoRows={2}>
        <div data-testid="extra" />
      </SheetSkeleton>,
    );
    expect(container.querySelector(".type-title")).not.toBeNull();
    const extra = screen.getByTestId("extra");
    const summary = container.querySelector("[data-slot=sheet-skeleton]");
    expect(summary?.nextElementSibling).toBe(extra);
    expect(extra.nextElementSibling?.children).toHaveLength(2);
  });

  it("bare면 로딩 영역 없이 막대만 (바깥 LoadingRegion과 조합)", () => {
    const { container } = render(
      <LoadingRegion>
        <CardSkeleton bare />
        <ListSkeleton bare rows={2} />
      </LoadingRegion>,
    );
    expect(container.querySelectorAll("[aria-busy=true]")).toHaveLength(1);
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });
});

describe("EmptyState", () => {
  it("기본 문구, live region 없음, 액션이 없으면 버튼 없음", () => {
    render(<EmptyState />);
    expect(
      screen.getByRole("heading", { level: 2, name: states.empty.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(states.empty.body)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: states.empty.title })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("props 문구와 액션, 액션은 secondary가 기본", () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="도보 10분 안에 조건에 맞는 식당이 없습니다"
        body="15분까지 넓혀볼까요?"
        action={{ label: "15분까지 넓히기", onClick }}
        headingLevel="h3"
      />,
    );
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
      "도보 10분 안에 조건에 맞는 식당이 없습니다",
    );
    const button = screen.getByRole("button", { name: "15분까지 넓히기" });
    expect(button).toHaveAttribute("data-variant", "secondary");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("visual 슬롯: 기본 아이콘, 바꿔 끼우기, null이면 없음", () => {
    const { container, rerender } = render(<EmptyState />);
    expect(container.querySelector("[data-slot=state-glyph]")).not.toBeNull();
    rerender(<EmptyState visual={<StateGlyph icon={Inbox} />} />);
    expect(container.querySelector(".lucide-inbox")).not.toBeNull();
    rerender(<EmptyState visual={null} />);
    expect(container.querySelector("[data-slot=state-glyph]")).toBeNull();
  });

  it("href 액션은 링크, primary로 올릴 수 있다", () => {
    render(
      <EmptyState
        action={{ label: "오늘 추천 보기", href: "/today", variant: "primary" }}
      />,
    );
    const link = screen.getByRole("link", { name: "오늘 추천 보기" });
    expect(link).toHaveAttribute("href", "/today");
    expect(link.className).toContain("bg-primary");
  });
});

describe("ErrorState", () => {
  it("기본 문구가 role=alert 안에 있고, 버튼은 alert 밖", () => {
    render(<ErrorState action={{ onClick: () => {} }} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(states.error.title);
    expect(alert).toHaveTextContent(states.error.body);
    const button = screen.getByRole("button", { name: states.error.action });
    expect(alert).not.toContainElement(button);
  });

  it("다시 시도를 누르면 onClick, 라벨은 바꿀 수 있다", () => {
    const onClick = vi.fn();
    render(
      <ErrorState
        title="저장하지 못했습니다"
        body="연결을 확인한 뒤 다시 시도해 주세요."
        action={{ label: "다시 저장", onClick }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("저장하지 못했습니다");
    fireEvent.click(screen.getByRole("button", { name: "다시 저장" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("action이 없으면 버튼 없음", () => {
    render(<ErrorState />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("OfflineState", () => {
  it("기본 문구가 role=status로, alert는 아님", () => {
    render(<OfflineState />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(states.offline.title);
    expect(status).toHaveTextContent(states.offline.body);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("다시 시도 기본 라벨과 호출", () => {
    const onClick = vi.fn();
    render(<OfflineState action={{ onClick }} />);
    fireEvent.click(
      screen.getByRole("button", { name: states.offline.action }),
    );
    expect(onClick).toHaveBeenCalledOnce();
  });
});
