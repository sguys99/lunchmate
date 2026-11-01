// @vitest-environment jsdom
// 상세 "내 후기"의 "오늘 후기 쓰기" (2026-11-01 사용자 결정). 판정 규칙은 feedback-target.test.ts todayWriteOffer.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { kstDateKey } from "@/lib/time";
import type { MyVisit } from "./feedback-target";
import type { MyReview } from "./my-records";

const myVisitsAction = vi.fn();
vi.mock("./actions", () => ({
  myVisitsAction: (input: unknown) => myVisitsAction(input),
  myReviewsAction: vi.fn(),
  myPlacesAction: vi.fn(),
  myDailyLimitsAction: vi.fn(),
}));

const { MyReviewBlock } = await import("./detail-reviews");

afterEach(() => {
  cleanup();
  myVisitsAction.mockReset();
});

const now = new Date();
const today = kstDateKey(now);
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

function review(over: Partial<MyReview> = {}): MyReview {
  const at = daysAgo(3);
  return {
    id: "11111111-1111-4111-8111-111111111111",
    visitId: "22222222-2222-4222-8222-222222222222",
    placeId: "123",
    placeUrl: null,
    visitedOn: kstDateKey(at),
    meal: "lunch",
    rating: "up",
    priceKrw: 9000,
    tags: [],
    body: null,
    isPublic: true,
    hidden: false,
    createdAt: at.toISOString(),
    updatedAt: at.toISOString(),
    ...over,
  };
}

function candidate(at: Date): MyVisit {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    placeId: "123",
    placeUrl: null,
    meal: "lunch",
    source: "detail",
    visitedOn: kstDateKey(at),
    createdAt: at.toISOString(),
    status: "candidate",
    feedbackRequestedAt: null,
    review: null,
  };
}

function wrap(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("상세 내 후기의 오늘 후기 쓰기", () => {
  it("마지막 후기가 오늘 이전 방문이면 보이고, 누르면 쓰기 시트를 연다", async () => {
    myVisitsAction.mockResolvedValue({ signedIn: true, visits: [] });
    const onWrite = vi.fn();
    wrap(
      <MyReviewBlock
        review={review()}
        offline={false}
        onEdit={vi.fn()}
        onWriteToday={onWrite}
      />,
    );
    const button = await screen.findByRole("button", { name: "오늘 후기 쓰기" });
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
    fireEvent.click(button);
    expect(onWrite).toHaveBeenCalledTimes(1);
    expect(myVisitsAction).toHaveBeenCalledWith(
      expect.objectContaining({ placeId: "123", to: today }),
    );
  });

  it("마지막 후기가 오늘 방문이어도 그 뒤 길찾기 후보가 있으면 보인다", async () => {
    const at = new Date(now.getTime() - 60_000);
    myVisitsAction.mockResolvedValue({
      signedIn: true,
      visits: [candidate(now)],
    });
    wrap(
      <MyReviewBlock
        review={review({
          visitedOn: today,
          createdAt: at.toISOString(),
          updatedAt: at.toISOString(),
        })}
        offline={false}
        onEdit={vi.fn()}
        onWriteToday={vi.fn()}
      />,
    );
    expect(
      await screen.findByRole("button", { name: "오늘 후기 쓰기" }),
    ).toBeInTheDocument();
  });

  it("마지막 후기가 오늘 방문이고 새 방문이 없으면 두지 않는다", async () => {
    myVisitsAction.mockResolvedValue({ signedIn: true, visits: [] });
    wrap(
      <MyReviewBlock
        review={review({ visitedOn: today, createdAt: now.toISOString() })}
        offline={false}
        onEdit={vi.fn()}
        onWriteToday={vi.fn()}
      />,
    );
    await vi.waitFor(() => expect(myVisitsAction).toHaveBeenCalled());
    expect(
      screen.queryByRole("button", { name: "오늘 후기 쓰기" }),
    ).not.toBeInTheDocument();
  });

  it("오프라인이면 끄고 이유 한 줄, 쓰기 함수가 없으면 내 방문을 부르지 않는다", async () => {
    myVisitsAction.mockResolvedValue({ signedIn: true, visits: [] });
    const onWrite = vi.fn();
    const { unmount } = wrap(
      <MyReviewBlock
        review={review()}
        offline
        onEdit={vi.fn()}
        onWriteToday={onWrite}
      />,
    );
    const button = await screen.findByRole("button", { name: "오늘 후기 쓰기" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button);
    expect(onWrite).not.toHaveBeenCalled();
    expect(
      screen.getByText("연결되면 후기를 쓸 수 있습니다."),
    ).toBeInTheDocument();
    unmount();
    myVisitsAction.mockClear();

    wrap(<MyReviewBlock review={review()} offline={false} onEdit={vi.fn()} />);
    expect(myVisitsAction).not.toHaveBeenCalled();
  });
});
