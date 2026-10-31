import { describe, expect, it } from "vitest";
import { mapPgError } from "./db-errors";

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
    expect(mapPgError(err("violates check constraint \"x\""))).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(mapPgError({ message: "fetch failed" })).toEqual({
      ok: false,
      error: "save",
    });
    expect(mapPgError(err("permission denied for table reviews", "42501"))).toEqual({
      ok: false,
      error: "save",
    });
  });
});
