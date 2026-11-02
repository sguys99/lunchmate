import { describe, expect, it } from "vitest";
import { showsAdminEntry } from "./admin-entry";

describe("showsAdminEntry (T9.10)", () => {
  it("관리자이고 플래그가 켜져 있을 때만 보인다", () => {
    expect(showsAdminEntry({ role: "admin" }, true)).toBe(true);
  });
  it("일반 사용자, 프로필을 못 읽음, 플래그 꺼짐이면 숨긴다", () => {
    expect(showsAdminEntry({ role: "user" }, true)).toBe(false);
    expect(showsAdminEntry(null, true)).toBe(false);
    expect(showsAdminEntry({ role: "admin" }, false)).toBe(false);
  });
});
