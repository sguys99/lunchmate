// 서비스 워커 캐시 범위 (T8.4, research-notes T0.16-3, CLAUDE.md 7장).
// public/sw.js를 그대로 읽어 가짜 self 위에서 실행하고, 규칙 함수와 fetch 처리기를 검사한다.
// 핵심: 카카오, 네이버, Supabase 등 다른 출처와 /api/, /auth/, 페이지 HTML은 절대 캐시하지 않는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { APP_FILE_ICONS, PWA_ICONS } from "@/features/pwa/assets";

const ORIGIN = "https://lunchmate.example";
const SOURCE = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");

type Req = {
  url: string;
  method?: string;
  mode?: string;
  headers?: Record<string, string>;
};
type Kind = "passthrough" | "navigate" | "shell";
type Listener = (event: unknown) => void;

function load() {
  const listeners: Record<string, Listener> = {};
  const self = {
    location: { href: `${ORIGIN}/sw.js?v=test1`, origin: ORIGIN },
    addEventListener: (type: string, fn: Listener) => {
      listeners[type] = fn;
    },
  };
  // fetch 처리기 테스트가 만든 응답 promise가 실패하지 않도록 캐시와 네트워크를 흉내 낸다
  const fakeResponse = {
    status: 200,
    type: "basic",
    headers: { get: () => null },
    clone() {
      return this;
    },
  };
  const caches = {
    open: async () => ({
      match: async () => undefined,
      put: async () => undefined,
    }),
    keys: async () => [],
    delete: async () => true,
  };
  const fetch = async () => fakeResponse;
  const ctx = vm.createContext({
    self,
    URL,
    Response,
    Promise,
    console,
    caches,
    fetch,
  });
  vm.runInContext(SOURCE, ctx);
  const g = ctx as unknown as {
    classifyRequest: (r: unknown, origin: string) => Kind;
    shouldCache: (r: unknown, origin: string) => boolean;
    isCacheableResponse: (r: unknown) => boolean;
    extractShellAssets: (html: string) => string[];
  };
  return { g, listeners };
}

const { g, listeners } = load();

function req({ url, method = "GET", mode = "cors", headers = {} }: Req) {
  const lower = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return {
    url,
    method,
    mode,
    headers: { get: (n: string) => lower[n.toLowerCase()] ?? null },
  };
}

const kind = (r: Req) => g.classifyRequest(req(r), ORIGIN);

describe("카카오, 외부 출처는 캐시하지 않는다", () => {
  const external = [
    "https://dapi.kakao.com/v2/local/search/category.json?category_group_code=FD6&x=127&y=37",
    "https://dapi.kakao.com/v2/maps/sdk.js?appkey=x&libraries=services",
    "https://t1.daumcdn.net/mapjsapi/js/main/4.4.19/kakao.js",
    "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js",
    "https://place.map.kakao.com/123456",
    "https://map.kakao.com/link/map/123456",
    "https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=x",
    "https://nrbe.pstatic.net/styles/basic.json",
    "https://map.naver.com/p/search/음식점",
    "https://abcd.supabase.co/rest/v1/place_stats?select=*",
    "https://us.i.posthog.com/e/",
    "https://o1.ingest.sentry.io/api/1/envelope/",
    "https://fonts.googleapis.com/css2?family=Inter",
  ];
  it.each(external)("%s → passthrough", (url) => {
    expect(kind({ url })).toBe("passthrough");
    expect(g.shouldCache(req({ url }), ORIGIN)).toBe(false);
  });

  it("카카오 도메인은 이 사이트 출처로 착각해도 제외한다(명시 차단 목록이 먼저)", () => {
    expect(
      g.classifyRequest(
        req({ url: "https://dapi.kakao.com/_next/static/x.js" }),
        "https://dapi.kakao.com",
      ),
    ).toBe("passthrough");
  });

  it("다른 출처 네비게이션도 손대지 않는다", () => {
    expect(
      kind({ url: "https://place.map.kakao.com/1", mode: "navigate" }),
    ).toBe("passthrough");
  });
});

describe("같은 출처: 앱 셸만 캐시한다", () => {
  it("홈 화면 앱 아이콘과 매니페스트는 캐시한다(assets.ts와 sw.js 목록 대조, T8.2)", () => {
    const paths = [
      ...Object.values(PWA_ICONS),
      ...Object.values(APP_FILE_ICONS),
      "/manifest.webmanifest",
    ];
    for (const p of paths) {
      expect(kind({ url: `${ORIGIN}${p}` }), p).toBe("shell");
    }
    expect(kind({ url: `${ORIGIN}/icon.svg?f0a1b2c3` })).toBe("shell");
  });

  it("iOS 시작 이미지는 캐시하지 않는다(홈 화면에 추가할 때 iOS가 받는다)", () => {
    expect(kind({ url: `${ORIGIN}/pwa/startup-1170x2532-light.png` })).toBe(
      "passthrough",
    );
  });

  it.each([
    "/_next/static/chunks/abc123.js",
    "/_next/static/css/app.css",
    "/_next/static/media/bowl.4f2a.svg",
    "/_next/static/chunks/abc.js?dpl=dpl_123",
    "/fonts/v1/faces.css",
    "/fonts/v1/pretendard-1.woff2",
    "/offline",
    "/favicon.ico",
  ])("%s → shell", (path) => {
    expect(kind({ url: `${ORIGIN}${path}` })).toBe("shell");
  });

  it.each([
    "/api/og/poll/abc",
    "/api/poll/close",
    "/auth/callback?code=x",
    "/_next/image?url=%2Fa.png&w=64&q=75",
    "/_next/data/build/today.json",
    "/today",
    "/me",
    "/poll/abcdefghij",
    "/sw.js",
    "/robots.txt",
  ])("%s → passthrough", (path) => {
    expect(kind({ url: `${ORIGIN}${path}` })).toBe("passthrough");
  });

  it("RSC 요청(헤더, ?_rsc=)과 Range 요청은 캐시하지 않는다", () => {
    expect(kind({ url: `${ORIGIN}/today`, headers: { RSC: "1" } })).toBe(
      "passthrough",
    );
    expect(kind({ url: `${ORIGIN}/today?_rsc=1x2y` })).toBe("passthrough");
    expect(
      kind({
        url: `${ORIGIN}/_next/static/chunks/a.js`,
        headers: { Range: "bytes=0-10" },
      }),
    ).toBe("passthrough");
  });

  it("GET이 아니면 손대지 않는다(서버 액션 POST 등)", () => {
    expect(kind({ url: `${ORIGIN}/today`, method: "POST" })).toBe(
      "passthrough",
    );
    expect(
      kind({ url: `${ORIGIN}/_next/static/chunks/a.js`, method: "HEAD" }),
    ).toBe("passthrough");
  });

  it("페이지 이동은 navigate(네트워크 우선, 응답 저장 없음). /auth/, /api/ 이동은 손대지 않는다", () => {
    expect(kind({ url: `${ORIGIN}/today`, mode: "navigate" })).toBe("navigate");
    expect(kind({ url: `${ORIGIN}/`, mode: "navigate" })).toBe("navigate");
    expect(
      kind({ url: `${ORIGIN}/auth/callback?code=x`, mode: "navigate" }),
    ).toBe("passthrough");
    expect(kind({ url: `${ORIGIN}/api/og/poll/a`, mode: "navigate" })).toBe(
      "passthrough",
    );
    expect(
      g.shouldCache(req({ url: `${ORIGIN}/today`, mode: "navigate" }), ORIGIN),
    ).toBe(false);
  });
});

describe("응답 검사", () => {
  const res = (status: number, type: string, cc?: string) => ({
    status,
    type,
    headers: {
      get: (n: string) => (n === "Cache-Control" ? (cc ?? null) : null),
    },
  });
  it("200 basic만, no-store/private이면 넣지 않는다", () => {
    expect(
      g.isCacheableResponse(
        res(200, "basic", "public, max-age=31536000, immutable"),
      ),
    ).toBe(true);
    expect(g.isCacheableResponse(res(200, "cors"))).toBe(false);
    expect(g.isCacheableResponse(res(200, "opaque"))).toBe(false);
    expect(g.isCacheableResponse(res(404, "basic"))).toBe(false);
    expect(g.isCacheableResponse(res(206, "basic"))).toBe(false);
    expect(g.isCacheableResponse(res(200, "basic", "no-store"))).toBe(false);
    expect(g.isCacheableResponse(res(200, "basic", "private, max-age=0"))).toBe(
      false,
    );
  });
});

describe("오프라인 화면의 정적 파일 추출", () => {
  it("/_next/static 주소만, 중복 없이", () => {
    const html = `<link rel="stylesheet" href="/_next/static/css/a.css"/><script src="/_next/static/chunks/b.js" async></script>
      <script src="https://dapi.kakao.com/v2/maps/sdk.js"></script><script>self.__next_f.push([1,"\\"/_next/static/chunks/b.js\\""])</script>`;
    expect(g.extractShellAssets(html)).toEqual([
      "/_next/static/css/a.css",
      "/_next/static/chunks/b.js",
    ]);
  });
});

describe("fetch 처리기", () => {
  function dispatch(r: Req) {
    const respondWith = vi.fn();
    listeners.fetch?.({ request: req(r), respondWith });
    return respondWith;
  }
  it("카카오 응답에는 respondWith를 부르지 않는다(서비스 워커가 손대지 않음)", () => {
    expect(
      dispatch({
        url: "https://dapi.kakao.com/v2/local/search/category.json?x=1",
      }),
    ).not.toHaveBeenCalled();
    expect(
      dispatch({ url: "https://abcd.supabase.co/rest/v1/x" }),
    ).not.toHaveBeenCalled();
    expect(dispatch({ url: `${ORIGIN}/api/og/poll/a` })).not.toHaveBeenCalled();
  });
  it("앱 셸과 페이지 이동만 가로챈다", () => {
    expect(
      dispatch({ url: `${ORIGIN}/_next/static/chunks/a.js` }),
    ).toHaveBeenCalledTimes(1);
    expect(
      dispatch({ url: `${ORIGIN}/today`, mode: "navigate" }),
    ).toHaveBeenCalledTimes(1);
  });
  it("install, activate, fetch만 듣는다", () => {
    expect(Object.keys(listeners).sort()).toEqual([
      "activate",
      "fetch",
      "install",
    ]);
  });
});
