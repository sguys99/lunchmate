// @vitest-environment jsdom
// 카카오 공유 SDK 로더 (T9.10). 실제 SDK 2.8.3은 Kakao.init() 전에는 Kakao.Share가 없다(프로덕션에서 확인).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetClientEnvCache } from "@/lib/env/client";
import {
  KakaoShareUnavailableError,
  loadKakaoShare,
  peekKakaoShare,
  resetKakaoShareForTest,
} from "./share-sdk";

/** 실제 SDK처럼 init 뒤에만 Share를 붙이는 가짜 */
function fakeKakao() {
  const share = { sendDefault: vi.fn(), uploadImage: vi.fn() };
  let inited = false;
  const K = {
    VERSION: "2.8.3",
    init: vi.fn(() => {
      inited = true;
      (K as { Share?: typeof share }).Share = share;
    }),
    isInitialized: () => inited,
  };
  return { K, share };
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_KAKAO_JS_KEY", "test-js-key");
  resetClientEnvCache();
  resetKakaoShareForTest();
});
afterEach(() => {
  vi.unstubAllEnvs();
  resetClientEnvCache();
  resetKakaoShareForTest();
});

describe("loadKakaoShare (T9.10)", () => {
  it("init을 먼저 하고 Share를 돌려준다(init 전에는 Share가 없음)", async () => {
    const { K, share } = fakeKakao();
    window.Kakao = K as unknown as NonNullable<typeof window.Kakao>;
    expect(peekKakaoShare()).toBeUndefined();
    await expect(loadKakaoShare()).resolves.toBe(share);
    expect(K.init).toHaveBeenCalledWith("test-js-key");
    expect(peekKakaoShare()).toBe(share);
  });

  it("init 뒤에도 Share가 없으면 KakaoShareUnavailableError, 다음 호출은 다시 시도", async () => {
    window.Kakao = {
      init: vi.fn(),
      isInitialized: () => true,
    } as unknown as NonNullable<typeof window.Kakao>;
    await expect(loadKakaoShare()).rejects.toBeInstanceOf(
      KakaoShareUnavailableError,
    );
    expect(peekKakaoShare()).toBeUndefined();
    const { K, share } = fakeKakao();
    window.Kakao = K as unknown as NonNullable<typeof window.Kakao>;
    await expect(loadKakaoShare()).resolves.toBe(share);
  });

  it("키가 없으면 SDK를 받지 않고 실패한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_KAKAO_JS_KEY", "");
    resetClientEnvCache();
    await expect(loadKakaoShare()).rejects.toBeInstanceOf(
      KakaoShareUnavailableError,
    );
    expect(document.querySelector("script[data-kakao-share]")).toBeNull();
  });
});
