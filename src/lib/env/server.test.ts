import { describe, expect, it, vi } from "vitest";

// 'server-only'는 클라이언트 번들에서만 오류를 내는 마커이므로 테스트에서는 비운다.
vi.mock("server-only", () => ({}));

const { parseServerEnv } = await import("./server");
const { EnvValidationError } = await import("./keys");

const dev = { NODE_ENV: "development" };
const prod = { NODE_ENV: "production" };

describe("parseServerEnv", () => {
  it("개발 환경에서는 전부 비어 있어도 통과한다", () => {
    expect(() => parseServerEnv({}, dev)).not.toThrow();
  });

  it("정상 값을 통과시킨다", () => {
    const env = parseServerEnv(
      {
        SUPABASE_SERVICE_ROLE_KEY: "service-role-abcdef",
        SENTRY_DSN: "https://k@o1.ingest.sentry.io/1",
      },
      prod,
    );
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe("service-role-abcdef");
  });

  it("SENTRY_DSN이 URL이 아니면 실패하고 값은 노출하지 않는다", () => {
    try {
      parseServerEnv({ SENTRY_DSN: "dsn-secret-xyz" }, dev);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(EnvValidationError);
      expect((e as Error).message).toContain("SENTRY_DSN");
      expect((e as Error).message).not.toContain("dsn-secret-xyz");
    }
  });

  it("프로덕션 필수 키 목록에 서버 키가 없는 현재는 프로덕션에서도 통과한다", () => {
    expect(() => parseServerEnv({}, prod)).not.toThrow();
  });
});
