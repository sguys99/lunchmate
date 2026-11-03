// 메뉴 제보 규칙과 요청 흐름 (T10.16d, PRD MENU-01, MENU-02, MENU-05, AC-MENU-3)
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { menuCopy } from "@/copy/menu";
import {
  CARD_MIN_REPORTS,
  MENU_NAME_MAX,
  cardMenu,
  clampMenuPrice,
  menuKey,
  menuNameCheck,
  menuNameLength,
  monthOf,
  normalizeMenuName,
  suggestMenus,
  type MenuStat,
} from "./model";
import {
  groupMenus,
  reportMenu,
  setReviewMenu,
  type MenuDeps,
  type MenuInsertRow,
} from "./requests";

const PLACE = "1840235701";
const REVIEW = "8b3a3a58-7c0f-4d4c-9a52-6f3c0d1b2e11";

function deps(over: Partial<MenuDeps> = {}) {
  const inserted: MenuInsertRow[] = [];
  const removed: string[] = [];
  const d: MenuDeps = {
    currentUserId: async () => "user-1",
    insert: async (row) => {
      inserted.push(row);
      return null;
    },
    removeForReview: async (_u, r) => {
      removed.push(r);
      return null;
    },
    ...over,
  };
  return { d, inserted, removed };
}

describe("메뉴 이름 규칙", () => {
  it("NFC, 공백과 제어 문자 덩어리를 한 칸, 앞뒤 공백 제거", () => {
    expect(normalizeMenuName("  김치\n\t 찌개 ")).toBe("김치 찌개");
    expect(normalizeMenuName("국밥".normalize("NFD"))).toBe("국밥");
  });
  it("비교 키는 공백을 지우고 소문자 (DB 트리거와 같음)", () => {
    expect(menuKey("수육 백반")).toBe("수육백반");
    expect(menuKey("BLT 샌드위치")).toBe("blt샌드위치");
  });
  it("20자(코드 포인트)까지", () => {
    expect(menuNameCheck(" ")).toBe("empty");
    expect(menuNameCheck("가".repeat(MENU_NAME_MAX))).toBe("ok");
    expect(menuNameCheck("가".repeat(MENU_NAME_MAX + 1))).toBe("tooLong");
    expect(menuNameLength("국밥🍚")).toBe(3);
  });
  it("가격은 1천~10만 원 500원 단위로", () => {
    expect(clampMenuPrice(9240)).toBe(9000);
    expect(clampMenuPrice(9260)).toBe(9500);
    expect(clampMenuPrice(200)).toBe(1000);
    expect(clampMenuPrice(500000)).toBe(100000);
  });
  it("쓰는 동안 제안: 비교 키가 겹치는 다른 메뉴만", () => {
    const menus: MenuStat[] = [
      { key: "제육볶음", name: "제육볶음", medianKrw: 9000, count: 3, lastMonth: "2026-10-01" },
      { key: "김치찌개", name: "김치찌개", medianKrw: 8000, count: 2, lastMonth: "2026-10-01" },
    ];
    expect(suggestMenus("제육", menus).map((m) => m.key)).toEqual(["제육볶음"]);
    expect(suggestMenus("제육 볶음", menus)).toEqual([]);
    expect(suggestMenus("", menus)).toEqual([]);
  });
  it("최근 제보 달", () => {
    expect(monthOf("2026-10-01")).toBe(10);
    expect(monthOf("bad")).toBeNull();
  });
});

describe("카드 대표 메뉴 (D-35 안건 2)", () => {
  it(`제보 ${CARD_MIN_REPORTS}건 이상인 1위만`, () => {
    expect(cardMenu({ name: "돼지국밥", medianKrw: 9000, count: 2 })).toEqual({
      name: "돼지국밥",
      medianKrw: 9000,
      count: 2,
    });
    expect(cardMenu({ name: "돼지국밥", medianKrw: 9000, count: 1 })).toBeNull();
    expect(cardMenu(undefined)).toBeNull();
  });
});

describe("상세 알려주기 (MENU-02)", () => {
  it("정규화한 이름, place_id, place_url만 넣는다(장소명, 좌표 없음)", async () => {
    const { d, inserted } = deps();
    const r = await reportMenu(
      { placeId: PLACE, placeUrl: `https://place.map.kakao.com/${PLACE}`, name: " 수육  백반 ", priceKrw: 12000 },
      d,
    );
    expect(r).toEqual({ ok: true, name: "수육 백반" });
    expect(inserted).toEqual([
      {
        user_id: "user-1",
        place_id: PLACE,
        place_url: `https://place.map.kakao.com/${PLACE}`,
        menu_name: "수육 백반",
        price_krw: 12000,
        source: "detail",
        review_id: null,
      },
    ]);
  });
  it("모르는 칸(장소명), 다른 식당 주소, 범위 밖 가격, 500원 단위가 아닌 가격, 21자는 invalid", async () => {
    const { d, inserted } = deps();
    const bad = [
      { placeId: PLACE, name: "국밥", priceKrw: 9000, placeName: "정담국밥" },
      { placeId: PLACE, placeUrl: "https://place.map.kakao.com/1", name: "국밥", priceKrw: 9000 },
      { placeId: PLACE, name: "국밥", priceKrw: 500 },
      { placeId: PLACE, name: "국밥", priceKrw: 9100 },
      { placeId: PLACE, name: "가".repeat(21), priceKrw: 9000 },
      { placeId: PLACE, name: "  ", priceKrw: 9000 },
    ];
    for (const raw of bad) expect(await reportMenu(raw, d)).toEqual({ ok: false, error: "invalid" });
    expect(inserted).toEqual([]);
  });
  it("연락처, 링크는 banned", async () => {
    const { d } = deps();
    expect(await reportMenu({ placeId: PLACE, name: "010-1234-5678", priceKrw: 9000 }, d)).toEqual({
      ok: false,
      error: "banned",
    });
  });
  it("비로그인은 unauthenticated", async () => {
    const { d } = deps({ currentUserId: async () => null });
    expect(await reportMenu({ placeId: PLACE, name: "국밥", priceKrw: 9000 }, d)).toEqual({
      ok: false,
      error: "unauthenticated",
    });
  });
  it("DB 오류 이름을 바꾼다: 하루 한도, 같은 메뉴 하루 1회, 정지", async () => {
    const cases = [
      [{ code: "23514", message: "menu_reports_daily_limit_exceeded" }, "daily"],
      [{ code: "23505", message: "duplicate key value violates unique constraint" }, "duplicate"],
      [{ code: "42501", message: "account_suspended" }, "suspended"],
      [{ code: "23514", message: "banned_content" }, "banned"],
      [{ code: "08006", message: "network" }, "save"],
    ] as const;
    for (const [err, code] of cases) {
      const { d } = deps({ insert: vi.fn(async () => err) });
      expect(await reportMenu({ placeId: PLACE, name: "국밥", priceKrw: 9000 }, d)).toEqual({ ok: false, error: code });
    }
  });
});

describe("피드백 먹은 메뉴 (MENU-01)", () => {
  it("그 후기의 메뉴를 지우고 새로 넣는다", async () => {
    const { d, inserted, removed } = deps();
    const r = await setReviewMenu({ reviewId: REVIEW, placeId: PLACE, name: "돼지국밥", priceKrw: 9000 }, d);
    expect(r).toEqual({ ok: true, name: "돼지국밥" });
    expect(removed).toEqual([REVIEW]);
    expect(inserted[0]).toMatchObject({ source: "feedback", review_id: REVIEW, menu_name: "돼지국밥", price_krw: 9000 });
  });
  it("이름 null이면 지우기만", async () => {
    const { d, inserted, removed } = deps();
    expect(await setReviewMenu({ reviewId: REVIEW, placeId: PLACE, name: null, priceKrw: null }, d)).toEqual({
      ok: true,
      name: null,
    });
    expect(removed).toEqual([REVIEW]);
    expect(inserted).toEqual([]);
  });
  it("메뉴를 고르면 가격은 필수", async () => {
    const { d } = deps();
    expect(await setReviewMenu({ reviewId: REVIEW, placeId: PLACE, name: "국밥", priceKrw: null }, d)).toEqual({
      ok: false,
      error: "invalid",
    });
  });
  it("지우기가 실패하면 넣지 않는다", async () => {
    const { d, inserted } = deps({ removeForReview: async () => ({ code: "08006", message: "x" }) });
    expect((await setReviewMenu({ reviewId: REVIEW, placeId: PLACE, name: "국밥", priceKrw: 9000 }, d)).ok).toBe(false);
    expect(inserted).toEqual([]);
  });
});

describe("집계 묶기", () => {
  it("place_id별로 rank 순서", () => {
    const g = groupMenus([
      { place_id: "1", menu_key: "b", menu_name: "B", median_krw: 9000, report_count: 1, last_month: "2026-10-01", rank: 2 },
      { place_id: "1", menu_key: "a", menu_name: "A", median_krw: 8000, report_count: 3, last_month: "2026-10-01", rank: 1 },
    ]);
    expect(g["1"]?.map((m) => m.key)).toEqual(["a", "b"]);
  });
});

describe("문구", () => {
  it("하루 한도 문구가 20번", () => {
    expect(menuCopy.errors.daily).toContain("20번");
  });
});
