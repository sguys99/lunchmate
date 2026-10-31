import { describe, expect, it, vi } from "vitest";
import {
  buildCapturePayload,
  posthogCookieName,
  readPosthogDistinctId,
  resolveAnalyticsId,
  runAfterResponse,
  sendServerEvent,
  serverCaptureConfig,
} from "./server-capture";

const ID = "0192f1c2-7a3b-7c1d-9e2f-0123456789ab";
const NOW = new Date("2026-10-30T03:00:00.000Z");
const CONFIG = { key: "phc_test", host: "https://us.i.posthog.com" };

describe("posthogCookieName", () => {
  it("posthog-js 규칙대로 토큰의 +, /, = 를 치환한다", () => {
    expect(posthogCookieName("phc_a+b/c=")).toBe("ph_phc_aPLbSLcEQ_posthog");
  });
});

describe("readPosthogDistinctId", () => {
  it("JSON 쿠키와 URL 인코딩된 쿠키 모두에서 distinct_id를 꺼낸다", () => {
    const json = JSON.stringify({ distinct_id: ID, $device_id: ID });
    expect(readPosthogDistinctId(json)).toBe(ID);
    expect(readPosthogDistinctId(encodeURIComponent(json))).toBe(ID);
  });

  it("깨진 값, 없는 값, 이메일 같은 id는 버린다", () => {
    expect(readPosthogDistinctId(undefined)).toBeNull();
    expect(readPosthogDistinctId("not-json")).toBeNull();
    expect(readPosthogDistinctId("%E0%A4%A")).toBeNull();
    expect(readPosthogDistinctId(JSON.stringify({}))).toBeNull();
    expect(
      readPosthogDistinctId(JSON.stringify({ distinct_id: "me@example.com" })),
    ).toBeNull();
  });
});

describe("resolveAnalyticsId", () => {
  const generate = () => "11111111-1111-4111-8111-111111111111";
  const ph = JSON.stringify({ distinct_id: ID });

  it("로그인 왕복 쿠키가 있으면 그것을 먼저 쓴다(시작과 완료를 같은 id로)", () => {
    expect(
      resolveAnalyticsId({
        carried: "22222222-2222-4222-8222-222222222222",
        posthogCookie: ph,
        generate,
      }),
    ).toBe("22222222-2222-4222-8222-222222222222");
  });

  it("없으면 PostHog 쿠키, 그것도 없으면 새로 만든다", () => {
    expect(
      resolveAnalyticsId({ carried: undefined, posthogCookie: ph, generate }),
    ).toBe(ID);
    expect(
      resolveAnalyticsId({ carried: "x", posthogCookie: undefined, generate }),
    ).toBe(generate());
  });
});

describe("serverCaptureConfig", () => {
  it("키가 없으면 보내지 않는다", () => {
    expect(serverCaptureConfig({})).toBeNull();
  });
  it("호스트 기본값과 끝 슬래시 정리", () => {
    expect(serverCaptureConfig({ NEXT_PUBLIC_POSTHOG_KEY: "k" })).toEqual({
      key: "k",
      host: "https://us.i.posthog.com",
    });
    expect(
      serverCaptureConfig({
        NEXT_PUBLIC_POSTHOG_KEY: "k",
        NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com/",
      })?.host,
    ).toBe("https://eu.i.posthog.com");
  });
});

describe("buildCapturePayload", () => {
  it("PRD 속성만 담고 익명 처리 표시를 붙인다", () => {
    const payload = buildCapturePayload(
      {
        name: "login_started",
        properties: { provider: "kakao", in_app_browser: true },
      },
      ID,
      NOW,
    );
    expect(payload).toEqual({
      event: "login_started",
      distinct_id: ID,
      timestamp: "2026-10-30T03:00:00.000Z",
      properties: {
        provider: "kakao",
        in_app_browser: true,
        $process_person_profile: false,
        $geoip_disable: true,
        $lib: "lunchmate-server",
      },
    });
  });

  it("타입을 우회해 들어온 좌표, 닉네임, 토큰 성격의 키는 지운다", () => {
    const payload = buildCapturePayload(
      {
        name: "login_completed",
        properties: {
          provider: "naver",
          in_app_browser: false,
          ...({
            nickname: "test_kim",
            lat: 37.5665,
            office_lng: 126.978,
          } as object),
        },
      },
      ID,
      NOW,
    );
    expect(Object.keys(payload.properties).sort()).toEqual(
      [
        "$geoip_disable",
        "$lib",
        "$process_person_profile",
        "in_app_browser",
        "provider",
      ].sort(),
    );
  });
});

describe("sendServerEvent", () => {
  const payload = buildCapturePayload(
    {
      name: "login_started",
      properties: { provider: "google", in_app_browser: false },
    },
    ID,
    NOW,
  );

  it("캡처 API로 api_key를 붙여 POST한다", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    await expect(sendServerEvent(CONFIG, payload, fetchImpl)).resolves.toBe(
      true,
    );
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://us.i.posthog.com/i/v0/e/");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toMatchObject({
      api_key: "phc_test",
      event: "login_started",
      distinct_id: ID,
    });
  });

  it("네트워크 오류, 타임아웃, 5xx에도 throw하지 않고 false", async () => {
    const reject = vi.fn(async () => {
      throw new TypeError("network");
    });
    await expect(sendServerEvent(CONFIG, payload, reject)).resolves.toBe(false);
    const fail = vi.fn(async () => new Response("", { status: 503 }));
    await expect(sendServerEvent(CONFIG, payload, fail)).resolves.toBe(false);
    const hang = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_, rej) => {
          init?.signal?.addEventListener("abort", () =>
            rej(new DOMException("timeout", "TimeoutError")),
          );
        }),
    );
    await expect(
      sendServerEvent(CONFIG, payload, hang as typeof fetch, 10),
    ).resolves.toBe(false);
  });

  it("설정이나 본문이 없으면 보내지 않는다", async () => {
    const fetchImpl = vi.fn();
    await expect(sendServerEvent(null, payload, fetchImpl)).resolves.toBe(
      false,
    );
    await expect(sendServerEvent(CONFIG, null, fetchImpl)).resolves.toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("runAfterResponse", () => {
  it("작업을 응답 뒤로 넘기고 작업의 실패를 호출한 쪽으로 내보내지 않는다", async () => {
    let scheduled: (() => Promise<void>) | undefined;
    expect(() =>
      runAfterResponse(
        async () => {
          throw new Error("posthog down");
        },
        (fn) => {
          scheduled = fn;
        },
      ),
    ).not.toThrow();
    await expect(scheduled?.()).resolves.toBeUndefined();
  });

  it("after가 요청 범위 밖이라 throw하면 바로 돌리고 역시 throw하지 않는다", async () => {
    const task = vi.fn(async () => {
      throw new Error("x");
    });
    expect(() =>
      runAfterResponse(task, () => {
        throw new Error("after() outside request scope");
      }),
    ).not.toThrow();
    await Promise.resolve();
    expect(task).toHaveBeenCalledOnce();
  });
});
