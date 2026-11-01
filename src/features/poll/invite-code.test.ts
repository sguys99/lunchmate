import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  parseInviteCode,
} from "./invite-code";

const MIGRATION = readFileSync(
  join(process.cwd(), "supabase/migrations/20261101140000_t7_6_polls.sql"),
  "utf8",
);

describe("초대 코드 형식 (T7.7, AC-POLL-3)", () => {
  it("12자, 31글자 알파벳, 혼동 글자 없음", () => {
    expect(INVITE_CODE_LENGTH).toBeGreaterThanOrEqual(10);
    expect(INVITE_CODE_ALPHABET).toHaveLength(31);
    expect(INVITE_CODE_ALPHABET).not.toMatch(/[01ilo]/);
    // 추측 난이도: 31^12 ≈ 2^59
    expect(INVITE_CODE_LENGTH * Math.log2(31)).toBeGreaterThan(58);
  });

  it("DB 함수, 제약과 같은 알파벳과 길이", () => {
    expect(MIGRATION).toContain(`'${INVITE_CODE_ALPHABET}'`);
    expect(MIGRATION).toContain("'^[2-9a-hjkmnp-z]{12}$'");
  });

  it("맞는 코드만 통과, 대문자와 앞뒤 공백은 정리", () => {
    expect(parseInviteCode("pbnnqs7rk8pv")).toBe("pbnnqs7rk8pv");
    expect(parseInviteCode(" PBNNQS7RK8PV ")).toBe("pbnnqs7rk8pv");
    expect(parseInviteCode("pbnnqs7rk8p")).toBeNull();
    expect(parseInviteCode("pbnnqs7rk8pv1")).toBeNull();
    expect(parseInviteCode("pbnnqs7rk8p0")).toBeNull();
    expect(parseInviteCode("pbnnqs7rk8pl")).toBeNull();
    expect(parseInviteCode(null)).toBeNull();
  });
});
