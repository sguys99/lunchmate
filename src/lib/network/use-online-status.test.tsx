// @vitest-environment jsdom
import { act, cleanup, render, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useOnlineStatus } from "./use-online-status";

function setOnLine(value: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(value);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useOnlineStatus", () => {
  it("처음 값은 navigator.onLine을 따른다", () => {
    setOnLine(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it("offline, online 이벤트에 따라 바뀐다", () => {
    setOnLine(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      setOnLine(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);

    act(() => {
      setOnLine(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
  });

  it("언마운트하면 리스너를 지운다", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<Probe />);
    unmount();
    const types = remove.mock.calls.map(([type]) => type);
    expect(types).toContain("online");
    expect(types).toContain("offline");
  });

  it("서버 렌더는 오프라인이어도 온라인으로 그린다", () => {
    setOnLine(false);
    expect(renderToString(<Probe />)).toContain("online");
  });
});

function Probe() {
  return <span>{useOnlineStatus() ? "online" : "offline"}</span>;
}
