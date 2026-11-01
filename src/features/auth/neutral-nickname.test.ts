import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { containsBannedContent } from "@/lib/moderation";
import { neutralNickname } from "./neutral-nickname";

describe("neutralNickname (T6.17 후속)", () => {
  it("접두 + 숫자 4자리, 경계값도 1000~9999", () => {
    expect(neutralNickname(() => 0)).toBe("점심손님 1000");
    expect(neutralNickname(() => 0.999999999)).toBe("점심손님 9999");
  });

  it("기본 난수로 만든 값은 DB 닉네임 규칙(1~20자, 앞뒤 공백 없음)을 지키고 금칙어 필터를 통과한다", () => {
    for (let i = 0; i < 50; i += 1) {
      const v = neutralNickname();
      expect(v).toMatch(/^점심손님 [1-9]\d{3}$/);
      expect(Array.from(v).length).toBeLessThanOrEqual(20);
      expect(v).toBe(v.trim());
      expect(containsBannedContent(v)).toBe(false);
    }
  });
});
