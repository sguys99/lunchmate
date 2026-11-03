import { describe, expect, it } from "vitest";
import { mapPgError, mapPlaceMemoError } from "./db-errors";

const err = (message: string, code = "23514") => ({ code, message });

describe("mapPgError", () => {
  it("오류가 없으면 null", () => {
    expect(mapPgError(null)).toBeNull();
  });
  it.each([
    ["reviews_daily_limit_exceeded", "reviews"],
    ["reports_daily_limit_exceeded", "reports"],
    ["deals_daily_limit_exceeded", "deals"],
    ["visits_daily_limit_exceeded", "visits"],
  ] as const)("%s → limit %s (T6.18)", (message, bucket) => {
    expect(mapPgError(err(message))).toEqual({
      ok: false,
      error: "limit",
      bucket,
    });
  });
  it.each([
    ["reviews_visit_too_old", "too_old"],
    ["reviews_visit_not_found", "not_found"],
    ["report_own_target", "own_target"],
    ["report_target_unavailable", "unavailable"],
    ["deal_not_open", "unavailable"],
  ] as const)("%s → %s", (message, error) => {
    expect(mapPgError(err(message))).toEqual({ ok: false, error });
  });
  it("banned_content(23514, T10.3b 트리거) → banned, check 위반(invalid)보다 먼저", () => {
    expect(mapPgError(err("banned_content"))).toEqual({
      ok: false,
      error: "banned",
    });
  });
  it("not_authenticated(42501) → unauthenticated", () => {
    expect(mapPgError(err("not_authenticated", "42501"))).toEqual({
      ok: false,
      error: "unauthenticated",
    });
  });
  it("유일 키 위반 → duplicate", () => {
    expect(
      mapPgError(
        err(
          'duplicate key value violates unique constraint "reviews_one_per_visit"',
          "23505",
        ),
      ),
    ).toEqual({ ok: false, error: "duplicate" });
  });
  it("그 밖의 check 위반 → invalid, 모르는 오류 → save", () => {
    expect(mapPgError(err('violates check constraint "x"'))).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(mapPgError({ message: "fetch failed" })).toEqual({
      ok: false,
      error: "save",
    });
    expect(
      mapPgError(err("permission denied for table reviews", "42501")),
    ).toEqual({
      ok: false,
      error: "save",
    });
  });
  it("정지된 계정의 쓰기(account_suspended, T8.5) → suspended", () => {
    expect(mapPgError(err("account_suspended", "42501"))).toEqual({
      ok: false,
      error: "suspended",
    });
  });
});

describe("mapPlaceMemoError (T10.15)", () => {
  it("오류가 없으면 null", () => {
    expect(mapPlaceMemoError(null)).toBeNull();
  });

  it("하루 30회와 300곳을 나눈다", () => {
    expect(
      mapPlaceMemoError(err("place_memos_daily_limit_exceeded", "P0001")),
    ).toBe("daily");
    expect(mapPlaceMemoError(err("place_memos_limit_exceeded"))).toBe("limit");
  });

  it("금칙어, 정지, 형식 위반, 권한 거절", () => {
    expect(mapPlaceMemoError(err("banned_content"))).toBe("banned");
    expect(mapPlaceMemoError(err("account_suspended", "42501"))).toBe(
      "suspended",
    );
    expect(
      mapPlaceMemoError(
        err('violates check constraint "place_memos_body_length"'),
      ),
    ).toBe("invalid");
    expect(mapPlaceMemoError(err("permission denied", "42501"))).toBe(
      "unauthenticated",
    );
  });

  it("그 밖은 저장 실패", () => {
    expect(mapPlaceMemoError({ message: "fetch failed" })).toBe("save");
    expect(mapPlaceMemoError(err("duplicate key", "23505"))).toBe("save");
  });
});
