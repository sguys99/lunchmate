import { afterEach, describe, expect, it, vi } from "vitest";

const preload = vi.fn();
vi.mock("react-dom", () => ({ preload }));

afterEach(() => {
  preload.mockReset();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("KakaoSdkPreload (AC-REC-4)", () => {
  it("로더가 넣는 주소와 같은 SDK 주소를 script로 미리 받게 한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_KAKAO_JS_KEY", " test-key ");
    const { KakaoSdkPreload } = await import("./sdk-preload");
    const { buildKakaoSdkUrl } = await import("./sdk-loader");
    expect(KakaoSdkPreload()).toBeNull();
    expect(preload).toHaveBeenCalledTimes(1);
    expect(preload).toHaveBeenCalledWith(buildKakaoSdkUrl("test-key"), {
      as: "script",
    });
  });

  it("키가 없으면 힌트를 넣지 않는다", async () => {
    vi.stubEnv("NEXT_PUBLIC_KAKAO_JS_KEY", "");
    const { KakaoSdkPreload } = await import("./sdk-preload");
    expect(KakaoSdkPreload()).toBeNull();
    expect(preload).not.toHaveBeenCalled();
  });
});
