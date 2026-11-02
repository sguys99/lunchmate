// 현위치 한 번 찾기 (T9.10): 콜백이 오지 않아도 상한 뒤에 끝난다, 거부와 실패 구분.
import { afterEach, describe, expect, it, vi } from "vitest";
import { LOCATE_HARD_CAP_MS, locateOnce } from "./geolocation";

function fakeGeo(
  impl: (ok: PositionCallback, fail: PositionErrorCallback) => void,
): Geolocation {
  return {
    getCurrentPosition: (
      ok: PositionCallback,
      fail?: PositionErrorCallback | null,
    ) => impl(ok, fail ?? (() => {})),
    watchPosition: () => 0,
    clearWatch: () => {},
  } as unknown as Geolocation;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("locateOnce", () => {
  it("권한 창에 답하지 않아 콜백이 오지 않으면 상한 뒤 unavailable", async () => {
    vi.useFakeTimers();
    const p = locateOnce(fakeGeo(() => {}));
    let settled = false;
    void p.then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(LOCATE_HARD_CAP_MS - 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(p).resolves.toEqual({ ok: false, reason: "unavailable" });
  });

  it("상한은 브라우저 timeout보다 길다(권한 창을 읽을 시간)", () => {
    expect(LOCATE_HARD_CAP_MS).toBeGreaterThan(8_000);
  });

  it("권한 거부는 denied", async () => {
    const r = await locateOnce(
      fakeGeo((_ok, fail) =>
        fail({ code: 1, message: "denied" } as GeolocationPositionError),
      ),
    );
    expect(r).toEqual({ ok: false, reason: "denied" });
  });

  it("시간 초과(code 3)는 unavailable", async () => {
    const r = await locateOnce(
      fakeGeo((_ok, fail) =>
        fail({ code: 3, message: "timeout" } as GeolocationPositionError),
      ),
    );
    expect(r).toEqual({ ok: false, reason: "unavailable" });
  });

  it("성공하면 지도 이동 전용 좌표, 늦게 온 두 번째 콜백은 무시", async () => {
    vi.useFakeTimers();
    let later: (() => void) | null = null;
    const p = locateOnce(
      fakeGeo((ok, fail) => {
        ok({
          coords: { latitude: 37.5, longitude: 127 },
        } as GeolocationPosition);
        later = () =>
          fail({ code: 2, message: "x" } as GeolocationPositionError);
      }),
    );
    const r = await p;
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.target.lat).toBe(37.5);
    (later as (() => void) | null)?.();
    await vi.advanceTimersByTimeAsync(LOCATE_HARD_CAP_MS);
  });

  it("geolocation이 없으면 바로 unavailable", async () => {
    await expect(locateOnce(undefined)).resolves.toEqual({
      ok: false,
      reason: "unavailable",
    });
  });
});
