import { describe, expect, it } from "vitest";
import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";
import { sentryBaseOptions } from "./sentry-options";
import { FILTERED } from "./scrub";

const COORD_RE = /37\.\d{3}|126\.\d{3}|127\.\d{3}/;
const options = sentryBaseOptions("https://k@o.ingest.sentry.io/1");

describe("sentryBaseOptions", () => {
  it("개인 식별 정보 자동 수집을 끄고 세 훅을 모두 건다", () => {
    expect(options.sendDefaultPii).toBe(false);
    expect(options.beforeSend).toBeTypeOf("function");
    expect(options.beforeBreadcrumb).toBeTypeOf("function");
    expect(options.beforeSendSpan).toBeTypeOf("function");
    expect("beforeSendTransaction" in options).toBe(false);
  });
});

describe("beforeSend", () => {
  it("request, extra, contexts, tags, transaction, 붙은 브레드크럼의 좌표를 가린다", () => {
    const event: ErrorEvent = {
      type: undefined,
      transaction: "/map?lat=37.5665&lng=126.9780",
      request: {
        url: "https://a.kr/api/reco?lat=37.5665&lng=126.9780&meal=lunch",
        query_string: [
          ["lat", "37.5665"],
          ["lng", "126.9780"],
          ["meal", "lunch"],
        ],
        data: '{"lat":37.5665,"lng":"126.9780","meal":"lunch"}',
        headers: { Referer: "https://a.kr/?x=127.0276&y=37.4979" },
      },
      extra: { origin: { latitude: 37.5665, longitude: 126.978 } },
      contexts: { geo: { city: "Seoul" }, app: { center: [37.5665, 126.978] } },
      tags: { area: "37.5665,126.9780" },
      breadcrumbs: [{ category: "console", message: "pos 37.566535" }],
      exception: {
        values: [{ type: "Error", value: "fail at 37.566535 126.977969" }],
      },
    };
    const out = options.beforeSend(event);
    expect(JSON.stringify(out)).not.toMatch(COORD_RE);
    expect(out.request?.query_string).toEqual([
      ["lat", FILTERED],
      ["lng", FILTERED],
      ["meal", "lunch"],
    ]);
    expect(out.request?.url).toContain("meal=lunch");
    expect(out.request?.data).toContain('"meal":"lunch"');
  });

  it("query_string 객체와 문자열 형태도 가린다", () => {
    const asObject = options.beforeSend({
      type: undefined,
      request: { query_string: { lat: "37.5665", q: "국밥" } },
    } satisfies ErrorEvent);
    expect(asObject.request?.query_string).toEqual({
      lat: FILTERED,
      q: "국밥",
    });

    const asString = options.beforeSend({
      type: undefined,
      request: { query_string: "lat=37.5665&lng=126.978&q=국밥" },
    } satisfies ErrorEvent);
    expect(asString.request?.query_string).toBe(
      `lat=${FILTERED}&lng=${FILTERED}&q=국밥`,
    );
  });
});

describe("beforeBreadcrumb", () => {
  it("fetch 브레드크럼의 url과 http.query를 가린다", () => {
    const crumb: Breadcrumb = {
      category: "fetch",
      type: "http",
      data: {
        method: "GET",
        url: "https://dapi.kakao.com/v2/local/search/category.json?category_group_code=FD6&x=126.978&y=37.5665&radius=700",
        "http.query": "category_group_code=FD6&x=126.978&y=37.5665&radius=700",
        status_code: 200,
      },
    };
    const out = options.beforeBreadcrumb(crumb);
    expect(JSON.stringify(out)).not.toMatch(COORD_RE);
    expect(out.data?.url).toContain("radius=700");
    expect(out.data?.["http.query"]).toBe(
      `category_group_code=FD6&x=${FILTERED}&y=${FILTERED}&radius=700`,
    );
    expect(out.data?.status_code).toBe(200);
  });

  it("xhr 브레드크럼의 url을 가린다", () => {
    const out = options.beforeBreadcrumb({
      category: "xhr",
      data: { method: "POST", url: "/api/x?coords=37.5665,126.978" },
    });
    expect(out.data?.url).toBe(`/api/x?coords=${FILTERED}`);
  });

  it("navigation 브레드크럼의 from, to와 인코딩된 중첩 URL을 가린다", () => {
    const out = options.beforeBreadcrumb({
      category: "navigation",
      data: {
        from: "/map?lat=37.5665&lng=126.978",
        to: "/login?next=%2Fmap%3Flat%3D37.5665%26lng%3D126.978%26tab%3Dlist",
      },
    });
    expect(out.data?.from).toBe(`/map?lat=${FILTERED}&lng=${FILTERED}`);
    expect(String(out.data?.to)).not.toMatch(COORD_RE);
    expect(String(out.data?.to)).toContain("tab%3Dlist");
  });

  it("console 메시지와 인자 속 좌표를 가린다", () => {
    const out = options.beforeBreadcrumb({
      category: "console",
      message: "current 37.5665, 126.9780",
      data: { arguments: ["current", { lat: 37.5665, lng: 126.978 }] },
    });
    expect(JSON.stringify(out)).not.toMatch(COORD_RE);
  });
});

describe("beforeSendSpan", () => {
  it("span 이름과 url 속성의 좌표를 가린다", () => {
    const span = {
      trace_id: "t",
      span_id: "s",
      name: "GET /api/reco?lat=37.5665&lng=126.978",
      start_timestamp: 1730000000.123,
      status: "ok" as const,
      is_segment: false,
      attributes: {
        "url.full": "https://a.kr/api/reco?lat=37.5665&lng=126.978",
        "url.query": "?lat=37.5665&lng=126.978",
        "http.response.status_code": 200,
      },
    };
    const out = options.beforeSendSpan(span);
    expect(JSON.stringify(out)).not.toMatch(COORD_RE);
    expect(out.start_timestamp).toBe(1730000000.123);
    expect(out.attributes["http.response.status_code"]).toBe(200);
  });
});
