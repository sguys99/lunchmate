import { describe, expect, it, vi } from "vitest";
import {
  APP_DETECT_TIMEOUT_MS,
  isMobileEnv,
  launchDirections,
  type LaunchEnv,
} from "./launch-directions";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Safari/605";

const args = {
  destination: { name: "국밥", position: { lat: 37.5, lng: 127 } },
  origin: null,
  appname: "https://lunchmate.vercel.app",
};

function fakeEnv(ua: string, maxTouchPoints = 0) {
  let t = 0;
  let timer: (() => void) | null = null;
  let hideListener: (() => void) | null = null;
  let hidden = false;
  const env: LaunchEnv = {
    userAgent: ua,
    maxTouchPoints,
    now: () => t,
    setTimer: (fn) => {
      timer = fn;
      return 1;
    },
    clearTimer: () => {
      timer = null;
    },
    navigate: vi.fn(),
    openWindow: vi.fn(),
    isHidden: () => hidden,
    onHide: (fn) => {
      hideListener = fn;
      return () => {
        hideListener = null;
      };
    },
  };
  return {
    env,
    advance(ms: number) {
      t += ms;
      timer?.();
    },
    hide() {
      hidden = true;
      hideListener?.();
    },
    get listening() {
      return hideListener !== null;
    },
  };
}

describe("launchDirections", () => {
  it("데스크톱은 앱을 시도하지 않고 웹 길찾기를 새 탭으로 연다 (NAV-03)", async () => {
    const f = fakeEnv(MAC);
    await expect(launchDirections(args, f.env)).resolves.toBe("web");
    expect(f.env.openWindow).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/map\.naver\.com\/p\/directions\//),
    );
    expect(f.env.navigate).not.toHaveBeenCalled();
  });

  it("모바일은 nmap://을 먼저 열고, 페이지가 가려지면 앱으로 본다 (NAV-01)", async () => {
    const f = fakeEnv(IPHONE);
    const p = launchDirections(args, f.env);
    expect(f.env.navigate).toHaveBeenCalledWith(
      expect.stringMatching(/^nmap:\/\/route\/walk\?/),
    );
    f.hide();
    await expect(p).resolves.toBe("app");
    expect(f.env.navigate).toHaveBeenCalledTimes(1);
    expect(f.listening).toBe(false);
  });

  it("정한 시간 안에 가려지지 않으면 웹 길찾기로 보낸다 (NAV-02)", async () => {
    const f = fakeEnv(IPHONE);
    const p = launchDirections(args, f.env);
    f.advance(APP_DETECT_TIMEOUT_MS);
    await expect(p).resolves.toBe("web");
    expect(f.env.navigate).toHaveBeenLastCalledWith(
      expect.stringMatching(/^https:\/\/map\.naver\.com\/p\/directions\//),
    );
  });

  it("타이머가 늦게 불렸으면(앱에 다녀옴) 웹을 열지 않는다", async () => {
    const f = fakeEnv(IPHONE);
    const p = launchDirections(args, f.env);
    f.advance(5000);
    await expect(p).resolves.toBe("app");
    expect(f.env.navigate).toHaveBeenCalledTimes(1);
  });

  it("iPadOS(데스크톱 UA + 터치)는 모바일로 본다", () => {
    expect(isMobileEnv({ userAgent: MAC, maxTouchPoints: 5 })).toBe(true);
    expect(isMobileEnv({ userAgent: MAC, maxTouchPoints: 0 })).toBe(false);
  });
});
