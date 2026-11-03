// 메뉴 제보 시안 (T10.16b) 쿼리 해석과 메뉴 규칙 테스트
import { describe, expect, it } from "vitest";
import { MENU_NAME_MAX } from "@/copy/design-lab-menu";
import { parseMenuParams } from "./params";
import {
  CARD_MIN_REPORTS,
  MENUS,
  PLACE,
  cardMenu,
  menuKey,
  menuNameCheck,
  menuNameLength,
  normalizeMenuName,
} from "./shared";

describe("parseMenuParams", () => {
  it("기본은 ready, home, 편집 닫힘, 저장 실패", () => {
    expect(parseMenuParams({})).toEqual({ state: "ready", view: "home", edit: false, fail: "save" });
  });
  it("모르는 view는 home, fail은 banned|limit만 받는다", () => {
    expect(parseMenuParams({ view: "map", fail: "boom" })).toMatchObject({ view: "home", fail: "save" });
    expect(parseMenuParams({ view: "REPORT", fail: "limit" })).toMatchObject({ view: "report", fail: "limit" });
  });
  it("오류 상태는 쓰는 중이므로 편집을 연 채로 시작한다", () => {
    expect(parseMenuParams({ state: "error" }).edit).toBe(true);
  });
});

describe("메뉴 이름 규칙 (PRD MENU-01, MENU-05)", () => {
  it("공백과 줄바꿈을 한 칸으로 줄이고 앞뒤를 자른다", () => {
    expect(normalizeMenuName("  김치\n 찌개 ")).toBe("김치 찌개");
  });
  it("비교 키는 공백을 지운다", () => {
    expect(menuKey("수육 백반")).toBe(menuKey("수육백반"));
  });
  it("빈 이름은 고르지 않음, 상한을 넘으면 보낼 수 없다", () => {
    expect(menuNameCheck("  ")).toBe("empty");
    expect(menuNameCheck("가".repeat(MENU_NAME_MAX))).toBe("ok");
    expect(menuNameCheck("가".repeat(MENU_NAME_MAX + 1))).toBe("tooLong");
    expect(menuNameLength("국밥🍚")).toBe(3);
  });
});

describe("목업 데이터", () => {
  it("메뉴는 제보 수 많은 순이고 이름에 식당 이름이 없다", () => {
    const counts = MENUS.map((m) => m.count);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
    for (const m of MENUS) {
      expect(m.name).not.toContain(PLACE.name);
      expect(menuKey(m.name)).toBe(m.key);
    }
  });
  it("카드 대표 메뉴는 제보 수 기준을 넘을 때만, 제보 없음이면 없다", () => {
    expect(cardMenu("ready")?.count).toBeGreaterThanOrEqual(CARD_MIN_REPORTS);
    expect(cardMenu("empty")).toBeNull();
  });
});
