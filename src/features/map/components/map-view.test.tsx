// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mapCopy } from "@/copy/map";
import {
  MapAuthError,
  MapKeyMissingError,
  MapLoadError,
} from "@/lib/map/errors";
import type { MapInstance, MapProvider } from "@/lib/map/types";
import { MapView } from "./map-view";

afterEach(cleanup);

function fakeProvider(load: () => Promise<void>) {
  const destroy = vi.fn();
  let authCb: (() => void) | undefined;
  const provider: MapProvider = {
    name: "fake",
    load,
    createMap: () => ({ destroy }) as unknown as MapInstance,
    onAuthFailure: (cb) => {
      authCb = cb;
      return () => {};
    },
  };
  return { provider, destroy, fireAuth: () => authCb?.() };
}

describe("MapView", () => {
  it("로딩 중에는 스켈레톤을, 완료되면 지도 영역만 보인다", async () => {
    const { provider } = fakeProvider(() => Promise.resolve());
    render(<MapView provider={provider} />);
    expect(
      screen.getByRole("region", { name: mapCopy.mapLabel }),
    ).toHaveAttribute("tabindex", "0");
    await waitFor(() =>
      expect(screen.queryByRole("status")).not.toBeInTheDocument(),
    );
  });

  it.each([
    [new MapKeyMissingError(), mapCopy.error.keyMissing.title, false],
    [new MapLoadError(), mapCopy.error.load.title, true],
    [new MapAuthError(), mapCopy.error.auth.title, false],
  ])("%s 오류 문구를 보여 준다", async (error, title, hasRetry) => {
    const { provider } = fakeProvider(() => Promise.reject(error));
    render(<MapView provider={provider} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(title);
    expect(!!screen.queryByRole("button", { name: mapCopy.retry })).toBe(
      hasRetry,
    );
  });

  it("로드 실패 뒤 다시 시도를 누르면 다시 로드한다", async () => {
    const load = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new MapLoadError())
      .mockResolvedValueOnce(undefined);
    const { provider } = fakeProvider(load);
    render(<MapView provider={provider} />);
    fireEvent.click(await screen.findByRole("button", { name: mapCopy.retry }));
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("로드 뒤 인증 실패 알림이 오면 지도를 정리하고 인증 오류를 보인다", async () => {
    const { provider, destroy, fireAuth } = fakeProvider(() =>
      Promise.resolve(),
    );
    render(<MapView provider={provider} />);
    await waitFor(() =>
      expect(screen.queryByRole("status")).not.toBeInTheDocument(),
    );
    fireAuth();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      mapCopy.error.auth.title,
    );
    expect(destroy).toHaveBeenCalled();
  });

  it("언마운트 시 destroy 한다", async () => {
    const { provider, destroy } = fakeProvider(() => Promise.resolve());
    const { unmount } = render(<MapView provider={provider} />);
    await waitFor(() =>
      expect(screen.queryByRole("status")).not.toBeInTheDocument(),
    );
    unmount();
    expect(destroy).toHaveBeenCalled();
  });
});
