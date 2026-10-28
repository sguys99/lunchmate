import { afterEach, describe, expect, it, vi } from "vitest";
import { EnvValidationError } from "./keys";
import { parseClientEnv, resetClientEnvCache } from "./client";
import { absoluteUrl, siteUrl } from "./site";

const dev = { NODE_ENV: "development" };
const prod = { NODE_ENV: "production" };
const vercelProd = { NODE_ENV: "production", VERCEL_ENV: "production" };
const build = { NODE_ENV: "production", NEXT_PHASE: "phase-production-build" };

describe("parseClientEnv", () => {
  it("정상 값을 통과시킨다", () => {
    const env = parseClientEnv(
      {
        NEXT_PUBLIC_SITE_URL: "https://lunchmate.kr",
        NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
        NEXT_PUBLIC_SENTRY_DSN: "https://k@o1.ingest.sentry.io/1",
      },
      prod,
    );
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://lunchmate.kr");
    expect(env.NEXT_PUBLIC_SENTRY_DSN).toBe("https://k@o1.ingest.sentry.io/1");
  });

  it("SENTRY_DSN이 URL이 아니면 실패하고 값은 노출하지 않는다", () => {
    try {
      parseClientEnv({ NEXT_PUBLIC_SENTRY_DSN: "dsn-secret-xyz" }, dev);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(EnvValidationError);
      expect((e as Error).message).toContain("NEXT_PUBLIC_SENTRY_DSN");
      expect((e as Error).message).not.toContain("dsn-secret-xyz");
    }
  });

  it("개발 환경에서는 전부 비어 있어도 통과하고 빈 문자열은 미설정으로 본다", () => {
    const env = parseClientEnv(
      { NEXT_PUBLIC_SITE_URL: "", NEXT_PUBLIC_KAKAO_JS_KEY: "" },
      dev,
    );
    expect(env.NEXT_PUBLIC_SITE_URL).toBeUndefined();
    expect(env.NEXT_PUBLIC_KAKAO_JS_KEY).toBeUndefined();
  });

  it("잘못된 URL이면 키 이름을 알리고 값은 노출하지 않는다", () => {
    const bad = "not-a-url-secret-value";
    try {
      parseClientEnv({ NEXT_PUBLIC_SITE_URL: bad }, dev);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(EnvValidationError);
      const msg = (e as Error).message;
      expect(msg).toContain("NEXT_PUBLIC_SITE_URL");
      expect(msg).toContain("URL");
      expect(msg).not.toContain(bad);
    }
  });

  it("플래그를 boolean으로 변환하고 기본값은 false", () => {
    expect(parseClientEnv({}, dev).NEXT_PUBLIC_DESIGN_LAB).toBe(false);
    expect(
      parseClientEnv({ NEXT_PUBLIC_DESIGN_LAB: "true" }, dev)
        .NEXT_PUBLIC_DESIGN_LAB,
    ).toBe(true);
    expect(
      parseClientEnv({ NEXT_PUBLIC_DESIGN_LAB: "false" }, dev)
        .NEXT_PUBLIC_DESIGN_LAB,
    ).toBe(false);
    expect(() =>
      parseClientEnv({ NEXT_PUBLIC_DESIGN_LAB: "yes" }, dev),
    ).toThrow(/NEXT_PUBLIC_DESIGN_LAB/);
  });

  it("프로덕션에서 필수 키가 없으면 실패한다", () => {
    expect(() => parseClientEnv({}, prod)).toThrow(
      /NEXT_PUBLIC_SITE_URL.*필수/,
    );
    expect(() => parseClientEnv({}, vercelProd)).toThrow(EnvValidationError);
  });

  it("SITE_URL이 없으면 Vercel 프로덕션 URL(https:// 붙임)로 대체하고 필수 검사를 통과한다", () => {
    const env = parseClientEnv(
      { NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: "lunchmate.vercel.app" },
      vercelProd,
    );
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://lunchmate.vercel.app");
  });

  it("SITE_URL이 있으면 Vercel 프로덕션 URL보다 우선한다", () => {
    const env = parseClientEnv(
      {
        NEXT_PUBLIC_SITE_URL: "https://lunchmate.kr",
        NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: "lunchmate.vercel.app",
      },
      prod,
    );
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://lunchmate.kr");
  });

  it("둘 다 없는 프로덕션은 여전히 오류", () => {
    expect(() =>
      parseClientEnv({ NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: " " }, prod),
    ).toThrow(/NEXT_PUBLIC_SITE_URL.*필수/);
  });

  it("로컬 next build 단계는 필수 검사를 건너뛰지만 VERCEL_ENV=production 이면 검사한다", () => {
    expect(() => parseClientEnv({}, build)).not.toThrow();
    expect(() =>
      parseClientEnv({}, { ...build, VERCEL_ENV: "production" }),
    ).toThrow(EnvValidationError);
  });
});

describe("siteUrl, absoluteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetClientEnvCache();
  });

  it("미설정이면 localhost 폴백", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(siteUrl()).toBe("http://localhost:3000");
    expect(absoluteUrl("/poll/abc")).toBe("http://localhost:3000/poll/abc");
  });

  it("SITE_URL이 없고 Vercel 프로덕션 URL이 있으면 그것을 쓴다", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv(
      "NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL",
      "lunchmate.vercel.app",
    );
    expect(siteUrl()).toBe("https://lunchmate.vercel.app");
  });

  it("끝 슬래시를 정리하고 경로를 붙인다", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://lunchmate.kr/");
    expect(siteUrl()).toBe("https://lunchmate.kr");
    expect(absoluteUrl("poll/abc")).toBe("https://lunchmate.kr/poll/abc");
    expect(absoluteUrl()).toBe("https://lunchmate.kr/");
  });

  it("외부 URL, 프로토콜 상대 경로는 거부한다", () => {
    expect(() => absoluteUrl("https://evil.com")).toThrow();
    expect(() => absoluteUrl("//evil.com")).toThrow();
  });
});
