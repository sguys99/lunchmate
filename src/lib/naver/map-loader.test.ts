// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MapAuthError,
  MapKeyMissingError,
  MapLoadError,
  buildNaverMapsScriptUrl,
  loadNaverMaps,
  onNaverAuthFailure,
  resetNaverMapLoaderForTest,
} from "./map-loader";

// jsdom 은 외부 스크립트를 실제로 받지 않으므로, 주입된 script 를 붙잡아 load/error 이벤트를 직접 낸다.
let injected: HTMLScriptElement[];

beforeEach(() => {
  resetNaverMapLoaderForTest();
  injected = [];
  vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
    injected.push(node as HTMLScriptElement);
    return node;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  resetNaverMapLoaderForTest();
});

function script(i: number): HTMLScriptElement {
  const el = injected[i];
  if (!el) throw new Error(`script ${i} 없음`);
  return el;
}
const succeed = (script: HTMLScriptElement) => {
  window.naver = { maps: {} as never };
  script.dispatchEvent(new Event("load"));
};
const fail = (script: HTMLScriptElement) =>
  script.dispatchEvent(new Event("error"));
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("buildNaverMapsScriptUrl", () => {
  it("ncpKeyId 파라미터를 쓴다", () => {
    expect(buildNaverMapsScriptUrl("abc 1")).toBe(
      "https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=abc%201",
    );
  });
});

describe("loadNaverMaps", () => {
  it("키가 없으면 MapKeyMissingError 이고 스크립트를 넣지 않으며 캐시하지 않는다", async () => {
    await expect(loadNaverMaps({ keyId: "" })).rejects.toBeInstanceOf(
      MapKeyMissingError,
    );
    expect(injected).toHaveLength(0);
    // 키가 생긴 뒤에는 바로 시도된다
    const p = loadNaverMaps({ keyId: "k" });
    expect(injected).toHaveLength(1);
    succeed(script(0));
    await p;
  });

  it("동시에 여러 번 불러도 스크립트는 한 번만 넣는다(싱글턴)", async () => {
    const a = loadNaverMaps({ keyId: "k" });
    const b = loadNaverMaps({ keyId: "k" });
    expect(a).toBe(b);
    expect(injected).toHaveLength(1);
    expect(script(0).src).toContain("ncpKeyId=k");
    succeed(script(0));
    await a;
    // 로드 완료 뒤에도 추가 주입 없음
    await loadNaverMaps({ keyId: "k" });
    expect(injected).toHaveLength(1);
  });

  it("실패하면 1회 재시도하고 두 번째에 성공하면 해결된다", async () => {
    const p = loadNaverMaps({ keyId: "k" });
    fail(script(0));
    await tick();
    expect(injected).toHaveLength(2);
    succeed(script(1));
    await expect(p).resolves.toBeUndefined();
  });

  it("재시도까지 실패하면 MapLoadError 이고, 이후 다시 시도할 수 있다", async () => {
    const p = loadNaverMaps({ keyId: "k" });
    const assertion = expect(p).rejects.toBeInstanceOf(MapLoadError);
    fail(script(0));
    await tick();
    fail(script(1));
    await assertion;
    expect(injected).toHaveLength(2);

    const again = loadNaverMaps({ keyId: "k" });
    expect(injected).toHaveLength(3);
    succeed(script(2));
    await again;
  });

  it("타임아웃이면 MapLoadError 로 실패한다", async () => {
    vi.useFakeTimers();
    const p = loadNaverMaps({ keyId: "k", timeoutMs: 100, retries: 0 });
    const assertion = expect(p).rejects.toBeInstanceOf(MapLoadError);
    await vi.advanceTimersByTimeAsync(101);
    await assertion;
  });

  it("로딩 중 navermap_authFailure 가 불리면 재시도 없이 MapAuthError 이다", async () => {
    const p = loadNaverMaps({ keyId: "k" });
    const assertion = expect(p).rejects.toBeInstanceOf(MapAuthError);
    window.navermap_authFailure?.();
    await assertion;
    expect(injected).toHaveLength(1);
    // 인증 실패 상태에서는 이후 호출도 즉시 거절
    await expect(loadNaverMaps({ keyId: "k" })).rejects.toBeInstanceOf(
      MapAuthError,
    );
  });
});

describe("onNaverAuthFailure", () => {
  it("로드 뒤에 인증이 실패해도 구독자가 호출되고, 해제하면 호출되지 않는다", async () => {
    const p = loadNaverMaps({ keyId: "k" });
    succeed(script(0));
    await p;
    const kept = vi.fn();
    const removed = vi.fn();
    onNaverAuthFailure(kept);
    onNaverAuthFailure(removed)();
    window.navermap_authFailure?.();
    expect(kept).toHaveBeenCalledTimes(1);
    expect(removed).not.toHaveBeenCalled();
    // 이미 실패한 뒤의 구독은 즉시 호출
    const late = vi.fn();
    onNaverAuthFailure(late);
    expect(late).toHaveBeenCalledTimes(1);
  });
});
