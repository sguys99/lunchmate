import { afterEach, describe, expect, it, vi } from "vitest";
import { contactEmail, contactMailto, parseContactEmail } from ".";

describe("parseContactEmail", () => {
  it("비었거나 없으면 null", () => {
    expect(parseContactEmail(undefined)).toBeNull();
    expect(parseContactEmail("")).toBeNull();
    expect(parseContactEmail("   ")).toBeNull();
  });

  it("이메일 모양이 아니면 null", () => {
    expect(parseContactEmail("lunchmate")).toBeNull();
    expect(parseContactEmail("a@b")).toBeNull();
    expect(parseContactEmail("a b@c.kr")).toBeNull();
    expect(parseContactEmail("a@@c.kr")).toBeNull();
  });

  it("앞뒤 공백을 지우고 돌려준다", () => {
    expect(parseContactEmail("  help@lunchmate.kr \n")).toBe(
      "help@lunchmate.kr",
    );
  });
});

describe("contactEmail", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("환경변수 값을 읽는다", () => {
    vi.stubEnv("NEXT_PUBLIC_CONTACT_EMAIL", "help@lunchmate.kr");
    expect(contactEmail()).toBe("help@lunchmate.kr");
  });

  it("값이 없으면 null", () => {
    vi.stubEnv("NEXT_PUBLIC_CONTACT_EMAIL", "");
    expect(contactEmail()).toBeNull();
  });
});

describe("contactMailto", () => {
  it("제목을 인코딩한다", () => {
    expect(contactMailto("help@lunchmate.kr", "[런치메이트 문의]")).toBe(
      `mailto:help@lunchmate.kr?subject=${encodeURIComponent("[런치메이트 문의]")}`,
    );
  });
});
