import { describe, expect, it, vi } from "vitest";
import { ACCOUNT_DELETION_SCOPE, deleteAccount } from "./delete-account";

describe("deleteAccount (AUTH-05)", () => {
  it("검증된 세션 사용자만 지운다", async () => {
    const deleteUser = vi.fn(async () => ({ error: null }));
    const r = await deleteAccount({
      verifiedUserId: async () => "u1",
      deleteUser,
    });
    expect(r).toEqual({ ok: true, userId: "u1" });
    expect(deleteUser).toHaveBeenCalledWith("u1");
  });

  it("세션이 없으면 아무것도 지우지 않는다", async () => {
    const deleteUser = vi.fn(async () => ({ error: null }));
    const r = await deleteAccount({
      verifiedUserId: async () => null,
      deleteUser,
    });
    expect(r).toEqual({ ok: false, reason: "unauthenticated" });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("세션 검증이 예외여도 지우지 않는다", async () => {
    const deleteUser = vi.fn(async () => ({ error: null }));
    const r = await deleteAccount({
      verifiedUserId: async () => {
        throw new Error("network");
      },
      deleteUser,
    });
    expect(r.ok).toBe(false);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("Admin 삭제 실패는 failed", async () => {
    const r = await deleteAccount({
      verifiedUserId: async () => "u1",
      deleteUser: async () => ({ error: new Error("500") }),
    });
    expect(r).toEqual({ ok: false, reason: "failed" });
  });

  it("삭제 범위 목록에 지금 있는 계정 테이블이 모두 있다", () => {
    expect(ACCOUNT_DELETION_SCOPE).toEqual(
      expect.arrayContaining([
        "profiles",
        "offices",
        "preferences",
        "avoid_rules",
        "visits",
        "favorites",
        "blocklist",
      ]),
    );
  });
});
