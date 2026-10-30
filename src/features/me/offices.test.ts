// 사무실 기본 결정 (T4.23, SET-01): 기본이 비면 가장 먼저 저장한 곳, 기본을 지우면 남은 곳 중 가장 먼저 저장한 곳.
import { describe, expect, it } from "vitest";
import {
  canAddOffice,
  canDeleteOffice,
  MAX_OFFICES,
  pickFallbackDefault,
  resolveDefaultOffice,
  sortOffices,
  type OfficeSummary,
} from "./offices";

const o = (id: string, created: string, is_default = false): OfficeSummary => ({
  id,
  name: `사무실 ${id}`,
  is_default,
  created_at: `2026-10-${created}T01:00:00Z`,
});

describe("resolveDefaultOffice", () => {
  it("기본 표시가 있으면 그곳", () => {
    expect(resolveDefaultOffice([o("a", "01"), o("b", "02", true)])?.id).toBe(
      "b",
    );
  });

  it("기본이 비어 있으면(지정 실패, 다른 기기에서 지움) 가장 먼저 저장한 곳", () => {
    expect(
      resolveDefaultOffice([o("c", "03"), o("a", "01"), o("b", "02")])?.id,
    ).toBe("a");
  });

  it("목록이 비면 null", () => {
    expect(resolveDefaultOffice([])).toBeNull();
  });
});

describe("pickFallbackDefault", () => {
  it("지운 곳을 빼고 가장 먼저 저장한 곳", () => {
    const rows = [o("b", "02"), o("a", "01", true), o("c", "03")];
    expect(pickFallbackDefault(rows, "a")?.id).toBe("b");
  });

  it("남은 곳이 없으면 null", () => {
    expect(pickFallbackDefault([o("a", "01", true)], "a")).toBeNull();
  });

  it("같은 시각이면 id 순으로 정해 결과가 흔들리지 않는다", () => {
    const rows = [o("z", "01"), o("y", "01"), o("x", "02", true)];
    expect(pickFallbackDefault(rows, "x")?.id).toBe("y");
  });
});

describe("개수 규칙", () => {
  it(`최대 ${MAX_OFFICES}곳까지 추가`, () => {
    expect(canAddOffice(MAX_OFFICES - 1)).toBe(true);
    expect(canAddOffice(MAX_OFFICES)).toBe(false);
  });

  it("마지막 한 곳은 지울 수 없다", () => {
    expect(canDeleteOffice(1)).toBe(false);
    expect(canDeleteOffice(2)).toBe(true);
  });

  it("화면 순서는 저장한 순서", () => {
    expect(sortOffices([o("b", "02"), o("a", "01")]).map((r) => r.id)).toEqual([
      "a",
      "b",
    ]);
  });
});
