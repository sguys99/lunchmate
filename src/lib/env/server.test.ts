import { describe, expect, it, vi } from "vitest";

// 'server-only'는 클라이언트 번들에서만 오류를 내는 마커이므로 테스트에서는 비운다.
vi.mock("server-only", () => ({}));

const { parseServerEnv } = await import("./server");

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
      },
      prod,
    );
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe("service-role-abcdef");
  });

  it("프로덕션 필수 키 목록에 서버 키가 없는 현재는 프로덕션에서도 통과한다", () => {
    expect(() => parseServerEnv({}, prod)).not.toThrow();
  });
});
