import { describe, expect, it } from "vitest";
import {
  afterLocate,
  defaultOffice,
  initialChoice,
  resolveBase,
  sortOffices,
  type OfficeOption,
} from "./base-location";

const A: OfficeOption = {
  id: "a",
  name: "본사",
  isDefault: false,
  position: { lat: 37.5, lng: 127 },
};
const B: OfficeOption = {
  id: "b",
  name: "지점",
  isDefault: true,
  position: { lat: 37.6, lng: 127.1 },
};
const here = { lat: 37.55, lng: 127.05 };

describe("기준 위치 (REC-02, PRD 12장)", () => {
  it("기본 사무실이 처음 선택이고 메뉴 맨 앞이다", () => {
    expect(defaultOffice([A, B])?.id).toBe("b");
    expect(sortOffices([A, B]).map((o) => o.id)).toEqual(["b", "a"]);
    expect(initialChoice([A, B])).toEqual({ kind: "office", id: "b" });
  });

  it("사무실이 없으면(둘러보기) 현위치가 처음 선택이다", () => {
    expect(initialChoice([])).toEqual({ kind: "here" });
    expect(resolveBase(null, [], { status: "idle" })).toEqual({
      kind: "here",
      state: { status: "idle" },
      center: null,
    });
  });

  it("지운 사무실을 고르고 있었다면 기본 사무실로", () => {
    const r = resolveBase({ kind: "office", id: "gone" }, [A, B], {
      status: "idle",
    });
    expect(r.kind === "office" && r.office.id).toBe("b");
  });

  it("현위치를 찾으면 그 좌표가 기준점(메모리)", () => {
    const r = resolveBase({ kind: "here" }, [A], {
      status: "ok",
      position: here,
    });
    expect(r.center).toEqual(here);
  });

  it("권한 거부: 사무실이 있으면 기본 사무실로 돌아가고 안내를 남긴다", () => {
    expect(afterLocate({ status: "denied" }, [A, B])).toEqual({
      choice: { kind: "office", id: "b" },
      notice: "denied",
    });
    expect(afterLocate({ status: "unavailable" }, [A])).toEqual({
      choice: { kind: "office", id: "a" },
      notice: "unavailable",
    });
  });

  it("권한 거부 + 사무실 없음: 현위치에 머문다(위치 없음 안내)", () => {
    expect(afterLocate({ status: "denied" }, [])).toEqual({
      choice: { kind: "here" },
      notice: null,
    });
  });
});
