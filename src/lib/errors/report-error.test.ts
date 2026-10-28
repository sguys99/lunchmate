// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

const captureException = vi.hoisted(() => vi.fn());
const initSentryClient = vi.hoisted(() => vi.fn());
vi.mock("@sentry/nextjs", () => ({ captureException }));
vi.mock("@/lib/analytics/sentry-client", () => ({ initSentryClient }));

import { errorDigest, reportError } from "./report-error";

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
