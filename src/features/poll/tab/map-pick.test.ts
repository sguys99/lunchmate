import { describe, expect, it } from "vitest";
import { pickMapPoll } from "./map-pick";

type Row = Parameters<typeof pickMapPoll>[0][number];

const row = (
  pollId: string,
  status: Row["status"],
  closesAt: string,
  tieUntil: string | null = null,
): Row => ({ pollId, status, closesAt, tieUntil });

describe("pickMapPoll (T8.11b)", () => {
  it("진행 중 방이 없으면 null", () => {
    expect(pickMapPoll([], null)).toBeNull();
    expect(
      pickMapPoll(
        [
          row("a", "closed", "2026-11-01T03:00:00Z"),
          row("b", "canceled", "2026-11-01T02:00:00Z"),
        ],
        null,
      ),
    ).toBeNull();
  });

  it("마감이 가장 가까운 진행 중 방을 고른다(지난 방은 빼고)", () => {
    const polls = [
      row("late", "open", "2026-11-01T05:00:00Z"),
      row("past", "closed", "2026-11-01T01:00:00Z"),
      row("soon", "open", "2026-11-01T03:00:00Z"),
    ];
    expect(pickMapPoll(polls, null)?.pollId).toBe("soon");
  });

  it("동점 대기는 tie_until로 비교한다", () => {
    const polls = [
      row("open", "open", "2026-11-01T03:00:00Z"),
      row("tie", "tie", "2026-11-01T01:00:00Z", "2026-11-01T02:30:00Z"),
    ];
    expect(pickMapPoll(polls, null)?.pollId).toBe("tie");
  });

  it("초점을 둔 진행 중 방이 있으면 그 방", () => {
    const polls = [
      row("soon", "open", "2026-11-01T03:00:00Z"),
      row("late", "open", "2026-11-01T05:00:00Z"),
    ];
    expect(pickMapPoll(polls, "late")?.pollId).toBe("late");
  });

  it("초점이 지난 방이거나 없는 방이면 기본(가장 가까운 마감)", () => {
    const polls = [
      row("soon", "open", "2026-11-01T03:00:00Z"),
      row("past", "closed", "2026-11-01T01:00:00Z"),
    ];
    expect(pickMapPoll(polls, "past")?.pollId).toBe("soon");
    expect(pickMapPoll(polls, "gone")?.pollId).toBe("soon");
  });
});
