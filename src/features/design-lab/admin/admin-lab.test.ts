import { describe, expect, it } from "vitest";
import { adminLabCopy } from "@/copy/design-lab-admin";
import { CLOSURES, REPORTED, closedCount, sortQueue, topReason } from "./mock";
import { parseAdminParams } from "./params";

const FORBIDDEN = /[—–―·・‧]/;

function collect(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (typeof value === "function") out.push(String(value));
  else if (Array.isArray(value)) value.forEach((v) => collect(v, out));
  else if (value && typeof value === "object")
    Object.values(value).forEach((v) => collect(v, out));
  return out;
}

describe("parseAdminParams", () => {
  it("기본값", () => {
    expect(parseAdminParams({})).toEqual({
      state: "ready",
      section: "reviews",
      item: null,
      confirm: null,
      select: false,
      step: null,
    });
  });

  it("쿼리를 읽고 모르는 값은 버린다", () => {
    expect(
      parseAdminParams({
        state: "offline",
        section: "USERS",
        item: "r2",
        confirm: "suspend",
        select: "some",
        step: "reason",
      }),
    ).toEqual({
      state: "offline",
      section: "users",
      item: "r2",
      confirm: "suspend",
      select: true,
      step: "reason",
    });
    expect(
      parseAdminParams({ section: "x", item: "../a", confirm: "y" }),
    ).toMatchObject({
      section: "reviews",
      item: null,
      confirm: null,
    });
  });
});

describe("목업 규칙", () => {
  it("자동 숨김(신고 3건 이상)이 큐 앞에 온다", () => {
    const q = sortQueue(REPORTED);
    const firstOpen = q.findIndex((i) => !i.autoHidden);
    expect(q.slice(firstOpen).every((i) => !i.autoHidden)).toBe(true);
  });

  it("숨김 사유 기본값은 가장 많은 신고 사유", () => {
    expect(topReason(REPORTED[0]!)).toBe("spam");
  });

  it("오늘만 쉬어요는 폐업 수에 세지 않는다", () => {
    const c = CLOSURES.find((x) => x.id === "c3")!;
    expect(closedCount(c)).toBe(1);
  });

  it("문구와 목업에 금지 문자(대시, 중간점)가 없다", () => {
    const strings = collect([adminLabCopy, REPORTED, CLOSURES]);
    expect(strings.filter((s) => FORBIDDEN.test(s))).toEqual([]);
  });
});
