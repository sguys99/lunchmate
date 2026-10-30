import { describe, expect, it } from "vitest";
import { readGuestHandoff, stripGuestHandoff } from "./guest-handoff";

describe("둘러보기 값 이어받기 (T4.20)", () => {
  it("next 쿼리에서 예산, 도보 분, 기피 칩을 읽는다", () => {
    expect(
      readGuestHandoff(
        "/today?lunch=12000&dinner=30000&walk=15&avoid=회,땅콩,피자",
      ),
    ).toEqual({
      prefs: { lunch: 12_000, dinner: 30_000, walk: 15 },
      avoid: { foods: ["회"], allergies: ["땅콩"], custom: [] },
    });
  });

  it("없거나 잘못된 값은 기본값", () => {
    expect(readGuestHandoff("/today")).toEqual({
      prefs: { lunch: 10_000, dinner: 20_000, walk: 10 },
      avoid: { foods: [], allergies: [], custom: [] },
    });
    expect(
      readGuestHandoff("/today?lunch=12500&dinner=999999&walk=12").prefs,
    ).toEqual({ lunch: 10_000, dinner: 20_000, walk: 10 });
  });

  it("좌표 같은 다른 키는 무시한다", () => {
    const h = readGuestHandoff("/today?lat=37.5&lng=127&center=37.5,127");
    expect(JSON.stringify(h)).not.toContain("37.5");
  });

  it("마친 뒤에는 이어받기 키만 지운다", () => {
    expect(stripGuestHandoff("/today?lunch=12000&walk=15&tab=a")).toBe(
      "/today?tab=a",
    );
    expect(stripGuestHandoff("/poll/abc")).toBe("/poll/abc");
    expect(stripGuestHandoff("/today?avoid=회")).toBe("/today");
  });
});
