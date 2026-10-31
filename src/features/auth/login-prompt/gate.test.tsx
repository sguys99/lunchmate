// @vitest-environment jsdom
// 로그인이 닫힌 환경(프로덕션: appShell 켜짐 + auth 꺼짐, 5단계 마무리 2026-10-31)에서
// 로그인 유도가 시트(→ /auth/sign-in 404) 대신 "곧 열립니다" 토스트가 되고, 로그인 전용 행동이 숨는지 본다.
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { homeCopy } from "@/copy/home";
import { mapCopy } from "@/copy/map";
import { soonCopy } from "@/copy/soon";
import { EMPTY_FILTERS } from "@/features/map/filters";
import { FilterChipRow, NeedLocationBlock } from "@/features/map/parts";
import { NeedLocationCard } from "@/features/rec/today-states";
import { LoginGateProvider, useLoginOpen } from "./gate";
import { useLoginPrompt } from "./use-login-prompt";

const toast = vi.hoisted(() => vi.fn());
vi.mock("@/components/ui/lazy-toaster", () => ({ toast }));

afterEach(() => {
  cleanup();
  toast.mockClear();
});

function gate(open: boolean) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <LoginGateProvider open={open}>{children}</LoginGateProvider>;
  };
}

describe("LoginGateProvider, useLoginOpen", () => {
  it("공급자 밖은 열림(디자인 랩 기본), 공급자는 서버 값을 내려 준다", () => {
    expect(renderHook(() => useLoginOpen()).result.current).toBe(true);
    expect(
      renderHook(() => useLoginOpen(), { wrapper: gate(false) }).result.current,
    ).toBe(false);
  });
});

describe("useLoginPrompt", () => {
  it("로그인이 닫혀 있으면 시트 대신 곧 열립니다 토스트", async () => {
    const { result } = renderHook(() => useLoginPrompt(), {
      wrapper: gate(false),
    });
    act(() => result.current.prompt("save"));
    expect(result.current.sheet).toBeNull();
    await vi.waitFor(() =>
      expect(toast).toHaveBeenCalledWith(soonCopy.toast.title, {
        id: "login-soon",
        description: soonCopy.toast.body,
      }),
    );
  });

  it("로그인이 열려 있으면 시트를 연다(토스트 없음)", () => {
    const { result } = renderHook(() => useLoginPrompt(), {
      wrapper: gate(true),
    });
    act(() => result.current.prompt("save"));
    expect(result.current.sheet).not.toBeNull();
    expect(toast).not.toHaveBeenCalled();
  });
});

describe("로그인 전용 행동 숨김", () => {
  it("홈 위치 없음 카드: 저장 함수가 없으면 회사 위치 저장 없이 다시 찾기 하나", () => {
    render(
      <NeedLocationCard reason="denied" signedIn={false} onRetry={vi.fn()} />,
    );
    const t = homeCopy.today.needLocation;
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: t.retry })).toBeVisible();
    expect(screen.queryByText(homeCopy.today.location.saveOffice)).toBeNull();
    expect(screen.getByText(t.deniedBrowse)).toBeVisible();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("홈 위치 없음 카드: 저장 함수가 있으면 지금처럼 저장 + 다시 찾기", () => {
    render(
      <NeedLocationCard
        reason="unavailable"
        signedIn={false}
        onRetry={vi.fn()}
        onSaveOffice={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: homeCopy.today.location.saveOffice }),
    ).toBeVisible();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("지도 위치 없음: 저장 함수가 없으면 다시 찾기 하나, /me 링크 없음", () => {
    render(
      <NeedLocationBlock
        reason="unavailable"
        signedIn={false}
        onRetry={vi.fn()}
      />,
    );
    const t = mapCopy.states.needLocation;
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: t.retry })).toBeVisible();
    expect(screen.getByText(t.unavailableBrowse)).toBeVisible();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("지도 필터: hideFavorites면 즐겨찾기 칩이 없다", () => {
    const props = {
      filters: EMPTY_FILTERS,
      onToggle: vi.fn(),
      categoryOpen: false,
      onCategoryOpen: vi.fn(),
      categories: [],
      onCategory: vi.fn(),
    };
    const { rerender } = render(<FilterChipRow {...props} />);
    const fav = mapCopy.filters.favorites;
    expect(screen.getByRole("button", { name: fav })).toBeVisible();
    rerender(<FilterChipRow {...props} hideFavorites />);
    expect(screen.queryByRole("button", { name: fav })).toBeNull();
  });
});
