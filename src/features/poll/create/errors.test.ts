import { describe, expect, it } from "vitest";
import { mapPollError } from "./errors";

describe("투표 쓰기 오류 (T7.11)", () => {
  it.each([
    ["polls_daily_limit_exceeded", "limit"],
    ["poll_closes_at_range", "deadline"],
    ["poll_already_shared", "shared"],
    ["poll_candidates_full", "full"],
    ["poll_candidates_min", "min"],
    ["poll_candidate_exists", "exists"],
    ["poll_multi_has_votes", "multi_votes"],
    ["poll_not_host", "not_found"],
    ["poll_state_closed", "closed"],
    ["poll_candidates_count", "invalid"],
    ["not_authenticated", "unauthenticated"],
  ])("%s → %s", (message, code) => {
    expect(mapPollError({ message, code: "P0001" })).toBe(code);
  });

  it("오류가 없으면 null, 모르는 오류는 save", () => {
    expect(mapPollError(null)).toBeNull();
    expect(mapPollError({ message: "fetch failed" })).toBe("save");
    expect(mapPollError({ message: "x", code: "23514" })).toBe("invalid");
  });
});
