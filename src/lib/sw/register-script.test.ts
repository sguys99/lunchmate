// 서비스 워커 등록 스크립트 (T8.4): 프로덕션은 load 뒤 유휴 시간에 버전 주소로 등록, 개발은 해제와 캐시 정리.
import { describe, expect, it, vi } from "vitest";
import { offlineReloadScript } from "./offline-script";
import { SW_CACHE_PREFIX, swRegisterScript } from "./register-script";

describe("swRegisterScript", () => {
  it("켜짐: 버전이 붙은 /sw.js를 scope /로 등록하고, load 뒤로 미룬다", () => {
    const s = swRegisterScript(true, "abc 123");
    expect(s).toContain('"/sw.js?v=abc%20123"');
    expect(s).toContain('scope:"/"');
    expect(s).toContain('addEventListener("load"');
    expect(s).toContain("requestIdleCallback");
    expect(s).not.toContain("unregister");
  });

  it("꺼짐: 등록하지 않고 /sw.js 등록 해제와 lm-shell-* 캐시 삭제만 한다", () => {
    const s = swRegisterScript(false, "x");
    expect(s).not.toContain(".register(");
    expect(s).toContain("unregister");
    expect(s).toContain(JSON.stringify(SW_CACHE_PREFIX));
  });

  it("꺼짐 스크립트가 실제로 /sw.js 등록만 해제하고 lm-shell-* 캐시만 지운다", async () => {
    const mine = {
      active: { scriptURL: "https://a.example/sw.js?v=1" },
      unregister: vi.fn(),
    };
    const other = {
      active: { scriptURL: "https://a.example/other-sw.js" },
      unregister: vi.fn(),
    };
    const del = vi.fn();
    const navigator = {
      serviceWorker: { getRegistrations: () => Promise.resolve([mine, other]) },
    };
    const caches = {
      keys: () => Promise.resolve(["lm-shell-1", "other-cache"]),
      delete: del,
    };
    const run = new Function(
      "navigator",
      "window",
      "caches",
      "URL",
      swRegisterScript(false),
    );
    run(navigator, { caches }, caches, URL);
    await new Promise((r) => setTimeout(r, 0));
    expect(mine.unregister).toHaveBeenCalledTimes(1);
    expect(other.unregister).not.toHaveBeenCalled();
    expect(del).toHaveBeenCalledWith("lm-shell-1");
    expect(del).not.toHaveBeenCalledWith("other-cache");
  });

  it("서비스 워커를 지원하지 않는 브라우저에서는 아무것도 하지 않는다", () => {
    const run = new Function(
      "navigator",
      "window",
      "document",
      swRegisterScript(true, "1"),
    );
    expect(() => run({}, {}, { readyState: "complete" })).not.toThrow();
  });
});

describe("offlineReloadScript", () => {
  function setup(pathname: string, href: string) {
    const listeners: Record<string, (e?: unknown) => void> = {};
    const docListeners: Record<string, (e: unknown) => void> = {};
    const replace = vi.fn();
    const window = {
      location: { pathname, href, replace },
      addEventListener: (t: string, f: () => void) => (listeners[t] = f),
    };
    const document = {
      addEventListener: (t: string, f: (e: unknown) => void) =>
        (docListeners[t] = f),
    };
    new Function("window", "document", offlineReloadScript("/today"))(
      window,
      document,
    );
    return { listeners, docListeners, replace };
  }

  it("다시 연결되면 원래 주소를 다시 연다", () => {
    const { listeners, replace } = setup("/map", "https://a.example/map?x=1");
    listeners.online?.();
    expect(replace).toHaveBeenCalledWith("https://a.example/map?x=1");
  });

  it("/offline을 직접 열었으면 fallback으로 간다", () => {
    const { listeners, replace } = setup(
      "/offline",
      "https://a.example/offline",
    );
    listeners.online?.();
    expect(replace).toHaveBeenCalledWith("/today");
  });

  it("다시 시도 버튼을 누르면 같은 동작", () => {
    const { docListeners, replace } = setup("/me", "https://a.example/me");
    const preventDefault = vi.fn();
    docListeners.click?.({ target: { closest: () => ({}) }, preventDefault });
    expect(preventDefault).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("https://a.example/me");
  });

  it("fallback이 외부 주소면 /로 바꾼다", () => {
    expect(offlineReloadScript("//evil.example")).toContain('?"/":');
    expect(offlineReloadScript("https://evil.example")).toContain('?"/":');
  });
});
