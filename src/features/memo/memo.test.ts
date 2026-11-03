// 식당 메모 (T10.15, D-33) 규칙, 서버 검사, 저장 흐름 분기, 홈 배지 자리 규칙
import { describe, expect, it, vi } from "vitest";
import { MAX_CARD_BADGES } from "@/components/badges/pick-badges";
import {
  MEMO_MAX,
  memoCheck,
  memoLength,
  normalizeMemo,
  showMemoBadge,
} from "./model";

vi.mock("server-only", () => ({}));

const { setPlaceMemo, setPlaceMemoSchema } = await import("./requests");
type Deps = Parameters<typeof setPlaceMemo>[1];

const PLACE = "1840235701";
const URL = `https://place.map.kakao.com/${PLACE}`;

function deps(over: Partial<Deps> = {}): Deps & {
  calls: string[];
} {
  const calls: string[] = [];
  return {
    calls,
    currentUserId: async () => "u1",
    update: vi.fn(async () => {
      calls.push("update");
      return { count: 1, error: null };
    }),
    insert: vi.fn(async () => {
      calls.push("insert");
      return null;
    }),
    remove: vi.fn(async () => {
      calls.push("remove");
      return null;
    }),
    ...over,
  };
}

describe("메모 규칙 (model)", () => {
  it("공백, 줄바꿈, 탭, 제어 문자를 한 칸으로 줄이고 앞뒤를 자른다", () => {
    expect(normalizeMemo("  깍두기\n맛집\t\t12시 전 ")).toBe(
      "깍두기 맛집 12시 전",
    );
    expect(normalizeMemo("a\u0000b\u0007c")).toBe("a b c");
    expect(normalizeMemo("　국밥 ")).toBe("국밥");
  });
  it("빈 글은 지우기, 40자까지 저장, 넘으면 저장할 수 없다", () => {
    expect(MEMO_MAX).toBe(40);
    expect(memoCheck("   ")).toBe("empty");
    expect(memoCheck("가".repeat(MEMO_MAX))).toBe("ok");
    expect(memoCheck("가".repeat(MEMO_MAX + 1))).toBe("tooLong");
  });
  it("글자 수는 코드 포인트로 센다(DB char_length와 같게)", () => {
    expect(memoLength("국밥🍚")).toBe(3);
  });
});

describe("홈 카드 메모 배지 자리 (D-33 안건 1)", () => {
  it("카드 배지가 2개 미만일 때만, 메모가 있을 때만", () => {
    expect(MAX_CARD_BADGES).toBe(2);
    expect(showMemoBadge(0, "깍두기")).toBe(true);
    expect(showMemoBadge(1, "깍두기")).toBe(true);
    expect(showMemoBadge(2, "깍두기")).toBe(false);
    expect(showMemoBadge(0, undefined)).toBe(false);
    expect(showMemoBadge(0, null)).toBe(false);
    expect(showMemoBadge(0, "")).toBe(false);
  });
});

describe("setPlaceMemoSchema (서버 zod, DB 제약과 같게)", () => {
  const parse = (body: string, extra: object = {}) =>
    setPlaceMemoSchema.safeParse({
      placeId: PLACE,
      placeUrl: URL,
      body,
      ...extra,
    });

  it("정규화한 글을 돌려준다", () => {
    const r = parse("  깍두기가\n맛있는 곳 ");
    expect(r.success && r.data.body).toBe("깍두기가 맛있는 곳");
  });
  it("41자는 거절, 40자는 통과(코드 포인트)", () => {
    expect(parse("가".repeat(41)).success).toBe(false);
    expect(parse("🍚".repeat(40)).success).toBe(true);
  });
  it("빈 글은 통과(지우기)", () => {
    const r = parse("   ");
    expect(r.success && r.data.body).toBe("");
  });
  it("장소명, 좌표 같은 다른 키는 받지 않는다(strictObject), place_url은 그 id의 카카오맵 주소만", () => {
    expect(parse("메모", { name: "정담국밥" }).success).toBe(false);
    expect(
      parse("메모", { placeUrl: "https://place.map.kakao.com/999" }).success,
    ).toBe(false);
    expect(parse("메모", { placeUrl: null }).success).toBe(true);
    expect(
      setPlaceMemoSchema.safeParse({ placeId: "abc", body: "메모" }).success,
    ).toBe(false);
  });
});

describe("setPlaceMemo 흐름", () => {
  it("금칙어, 연락처, 링크는 banned", async () => {
    const d = deps();
    for (const body of ["010-1234-5678 전화", "https://example.com 참고"]) {
      await expect(
        setPlaceMemo({ placeId: PLACE, placeUrl: URL, body }, d),
      ).resolves.toEqual({ ok: false, error: "banned" });
    }
    expect(d.calls).toEqual([]);
  });

  it("형식이 틀리면 invalid, 비로그인이면 unauthenticated", async () => {
    await expect(
      setPlaceMemo({ placeId: PLACE, body: "가".repeat(41) }, deps()),
    ).resolves.toEqual({ ok: false, error: "invalid" });
    await expect(
      setPlaceMemo(
        { placeId: PLACE, body: "메모" },
        deps({ currentUserId: async () => null }),
      ),
    ).resolves.toEqual({ ok: false, error: "unauthenticated" });
  });

  it("빈 글은 지우기만 한다", async () => {
    const d = deps();
    await expect(
      setPlaceMemo({ placeId: PLACE, body: "  " }, d),
    ).resolves.toEqual({ ok: true, memo: null });
    expect(d.calls).toEqual(["remove"]);
  });

  it("있던 메모는 update 한 번", async () => {
    const d = deps();
    await expect(
      setPlaceMemo({ placeId: PLACE, placeUrl: URL, body: " 국밥 " }, d),
    ).resolves.toEqual({ ok: true, memo: "국밥" });
    expect(d.calls).toEqual(["update"]);
  });

  it("처음이면 update 0행 → insert(user_id, place_id, place_url, body만)", async () => {
    const insert = vi.fn(async () => null);
    const d = deps({
      update: async () => ({ count: 0, error: null }),
      insert,
    });
    await expect(
      setPlaceMemo({ placeId: PLACE, placeUrl: URL, body: "국밥" }, d),
    ).resolves.toEqual({ ok: true, memo: "국밥" });
    expect(insert).toHaveBeenCalledWith({
      user_id: "u1",
      place_id: PLACE,
      place_url: URL,
      body: "국밥",
    });
  });

  it("insert가 23505(동시 저장)면 update를 한 번 더", async () => {
    const counts = [0, 1];
    const update = vi.fn(async () => ({
      count: counts.shift() ?? 0,
      error: null,
    }));
    const d = deps({
      update,
      insert: async () => ({ code: "23505", message: "duplicate key" }),
    });
    await expect(
      setPlaceMemo({ placeId: PLACE, body: "국밥" }, d),
    ).resolves.toEqual({ ok: true, memo: "국밥" });
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("DB 거절을 메모 오류로 바꾼다(하루 30회, 300곳, 정지)", async () => {
    const cases = [
      [{ code: "P0001", message: "place_memos_daily_limit_exceeded" }, "daily"],
      [{ code: "23514", message: "place_memos_limit_exceeded" }, "limit"],
      [{ code: "42501", message: "account_suspended" }, "suspended"],
      [{ message: "fetch failed" }, "save"],
    ] as const;
    for (const [error, code] of cases) {
      const d = deps({
        update: async () => ({ count: 0, error: null }),
        insert: async () => error,
      });
      await expect(
        setPlaceMemo({ placeId: PLACE, body: "국밥" }, d),
      ).resolves.toEqual({ ok: false, error: code });
    }
    const upd = deps({
      update: async () => ({
        count: 0,
        error: { code: "P0001", message: "place_memos_daily_limit_exceeded" },
      }),
    });
    await expect(
      setPlaceMemo({ placeId: PLACE, body: "국밥" }, upd),
    ).resolves.toEqual({ ok: false, error: "daily" });
  });
});
