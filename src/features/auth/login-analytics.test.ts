import { describe, expect, it, vi } from "vitest";
import { ANALYTICS_ID_COOKIE } from "@/lib/analytics/server-capture";
import {
  loginAnalyticsId,
  loginCapturePayload,
  loginEvent,
  sendLoginEvent,
} from "./login-analytics";

const KAKAOTALK_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.4.5";
const SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const CONFIG = { key: "phc_test", host: "https://us.i.posthog.com" };
const ID = "0192f1c2-7a3b-7c1d-9e2f-0123456789ab";

function jar(values: Record<string, string>) {
  return {
    get: (name: string) =>
      name in values ? { value: values[name]! } : undefined,
  };
}

describe("loginEvent", () => {
  it("PRD 10.2절 속성(provider, in_app_browser)만 만든다", () => {
    expect(loginEvent("login_started", "kakao", KAKAOTALK_UA)).toEqual({
      name: "login_started",
      properties: { provider: "kakao", in_app_browser: true },
    });
    expect(loginEvent("login_completed", "google", SAFARI_UA)).toEqual({
      name: "login_completed",
      properties: { provider: "google", in_app_browser: false },
    });
    expect(loginEvent("login_started", "naver", null).properties).toEqual({
      provider: "naver",
      in_app_browser: false,
    });
  });

  it("UA 원문은 본문 어디에도 들어가지 않는다", () => {
    const payload = loginCapturePayload(
      CONFIG,
      loginEvent("login_started", "kakao", KAKAOTALK_UA),
      ID,
    );
    expect(JSON.stringify(payload)).not.toContain("KAKAOTALK");
  });
});

describe("loginAnalyticsId", () => {
  const generate = () => "33333333-3333-4333-8333-333333333333";

  it("로그인 왕복 쿠키 → PostHog 쿠키 → 새 id 순서", () => {
    const ph = JSON.stringify({ distinct_id: ID });
    expect(
      loginAnalyticsId(
        jar({
          [ANALYTICS_ID_COOKIE]: "44444444-4444-4444-8444-444444444444",
          ph_phc_test_posthog: ph,
        }),
        CONFIG,
        generate,
      ),
    ).toBe("44444444-4444-4444-8444-444444444444");
    expect(
      loginAnalyticsId(jar({ ph_phc_test_posthog: ph }), CONFIG, generate),
    ).toBe(ID);
    expect(loginAnalyticsId(jar({}), CONFIG, generate)).toBe(generate());
  });
});

describe("sendLoginEvent", () => {
  it("전송 실패를 삼키고 false를 돌려준다(리다이렉트에 영향 없음)", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("down");
    });
    await expect(
      sendLoginEvent(
        CONFIG,
        loginEvent("login_completed", "kakao", null),
        ID,
        fetchImpl,
      ),
    ).resolves.toBe(false);
  });

  it("키가 없으면 아무것도 보내지 않는다", async () => {
    const fetchImpl = vi.fn();
    await expect(
      sendLoginEvent(
        null,
        loginEvent("login_started", "kakao", null),
        ID,
        fetchImpl,
      ),
    ).resolves.toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
