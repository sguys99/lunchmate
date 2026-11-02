// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

const captureException = vi.hoisted(() => vi.fn());
const initSentryClient = vi.hoisted(() => vi.fn());
vi.mock("@sentry/nextjs", () => ({ captureException }));
vi.mock("@/lib/analytics/sentry-client", () => ({ initSentryClient }));

import { errorDigest, reportError } from "./report-error";
import { sanitizeHandledError } from "./report-handled";

afterEach(() => {
  vi.unstubAllEnvs();
  captureException.mockClear();
  initSentryClient.mockClear();
});

describe("errorDigest", () => {
  it("문자열 digest만 돌려준다", () => {
    expect(errorDigest(Object.assign(new Error(), { digest: "abc" }))).toBe(
      "abc",
    );
    expect(
      errorDigest(Object.assign(new Error(), { digest: 1 })),
    ).toBeUndefined();
    expect(errorDigest(new Error())).toBeUndefined();
    expect(errorDigest("x")).toBeUndefined();
    expect(errorDigest(null)).toBeUndefined();
  });
});

describe("reportError (T2.18)", () => {
  it("DSN이 없으면 SDK를 불러오지 않는다", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    await reportError(new Error("x"));
    expect(initSentryClient).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
  });

  it("DSN이 있으면 지연 청크로 초기화한 뒤 captureException", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://k@o.ingest.sentry.io/1");
    const error = new Error("x");
    await reportError(error);
    expect(initSentryClient).toHaveBeenCalledWith(
      "https://k@o.ingest.sentry.io/1",
    );
    expect(captureException).toHaveBeenCalledWith(error);
  });

  it("보고가 실패해도 던지지 않는다", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://k@o.ingest.sentry.io/1");
    captureException.mockImplementationOnce(() => {
      throw new Error("sdk");
    });
    await expect(reportError(new Error("x"))).resolves.toBeUndefined();
  });
});

describe("sanitizeHandledError (T9.10)", () => {
  it("이름과 메시지만 남기고 주소와 초대 코드를 지운다", () => {
    const e = new TypeError(
      "bad https://lunchmate-kr.vercel.app/poll/abcdefghij12?x=1 and /poll/zzzzzzzzzz9 kakaolink://send?a=b",
    );
    const out = sanitizeHandledError("share.kakao", e);
    expect(out.name).toBe("TypeError");
    expect(out.message).toBe("[share.kakao] bad <url> and /poll/<code> <url>");
    expect(out.message).not.toMatch(/abcdefghij12|zzzzzzzzzz9|vercel/);
  });

  it("오류 객체가 아니어도 문자열 이름으로 만든다", () => {
    expect(sanitizeHandledError("c", "boom").name).toBe("StringError");
    expect(sanitizeHandledError("c", { a: 1 }).message).toBe("[c] ");
  });
});
