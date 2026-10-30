// 나 탭 설정 서버 흐름 (T4.23~T4.27, SET-01~05): 입력 재검증, 기본 사무실 대체, 못 먹는 음식 차이 저장, 땡겨요 7일 새로 세기.
import { describe, expect, it, vi } from "vitest";
import type { OfficeSummary } from "./offices";
import {
  addOffice,
  deleteOffice,
  diffAvoid,
  renameOffice,
  saveAvoid,
  saveCravings,
  saveNickname,
  savePrefs,
  setDefaultOffice,
  type SettingsDeps,
  type StoredAvoid,
} from "./settings";

const USER = "11111111-1111-4111-8111-111111111111";
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function office(
  id: string,
  created: string,
  is_default = false,
): OfficeSummary {
  return { id, name: `곳${id[0]}`, is_default, created_at: created };
}

function deps(over: Partial<SettingsDeps> = {}): SettingsDeps {
  return {
    currentUserId: vi.fn(async () => USER),
    updateNickname: vi.fn(async () => true),
    listOffices: vi.fn(async () => []),
    insertOffice: vi.fn(async () => "ok" as const),
    renameOffice: vi.fn(async () => true),
    setDefaultOffice: vi.fn(async () => true),
    deleteOffice: vi.fn(async () => true),
    updatePrefs: vi.fn(async () => true),
    listAvoid: vi.fn(async () => []),
    insertAvoid: vi.fn(async () => true),
    deleteAvoid: vi.fn(async () => true),
    readCravings: vi.fn(async () => []),
    updateCravings: vi.fn(async (_u: string, c: string[]) => ({
      until: c.length ? "2026-11-06T01:00:00Z" : null,
    })),
    ...over,
  };
}

describe("공통: 검증과 로그인", () => {
  it("알 수 없는 키가 섞이면 저장하지 않는다(strictObject)", async () => {
    const d = deps();
    expect(
      await savePrefs({ lunch: 10000, dinner: 20000, walk: 10, x: 1 }, d),
    ).toEqual({ ok: false, error: "invalid" });
    expect(d.updatePrefs).not.toHaveBeenCalled();
  });

  it("세션이 없으면 unauthenticated", async () => {
    const d = deps({ currentUserId: async () => null });
    expect(await saveNickname({ nickname: "점심왕" }, d)).toEqual({
      ok: false,
      error: "unauthenticated",
    });
  });

  it("저장 함수가 던지면 save 오류로 바꾼다", async () => {
    const d = deps({
      updatePrefs: async () => {
        throw new Error("db");
      },
    });
    expect(
      await savePrefs({ lunch: 10000, dinner: 20000, walk: 10 }, d),
    ).toEqual({ ok: false, error: "save" });
  });
});

describe("이름 (T4.27)", () => {
  it("앞뒤 공백을 지우고 저장한다", async () => {
    const d = deps();
    expect(await saveNickname({ nickname: "  점심왕 " }, d)).toEqual({
      ok: true,
      nickname: "점심왕",
    });
    expect(d.updateNickname).toHaveBeenCalledWith(USER, "점심왕");
  });

  it.each([
    ["빈 값", "   "],
    ["21자", "가".repeat(21)],
    ["줄바꿈", "점심\n왕"],
  ])("%s은 거절", async (_name, nickname) => {
    const d = deps();
    expect(await saveNickname({ nickname }, d)).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(d.updateNickname).not.toHaveBeenCalled();
  });
});

describe("예산과 거리 (SET-02)", () => {
  it.each([
    { lunch: 4000, dinner: 20000, walk: 10 },
    { lunch: 10500, dinner: 20000, walk: 10 },
    { lunch: 10000, dinner: 61000, walk: 10 },
    { lunch: 10000, dinner: 20000, walk: 12 },
  ])("범위 밖 %o는 거절", async (prefs) => {
    expect(await savePrefs(prefs, deps())).toEqual({
      ok: false,
      error: "invalid",
    });
  });

  it("도보 5, 10, 15, 20분과 1천 원 단위만 저장", async () => {
    const d = deps();
    expect(
      await savePrefs({ lunch: 5000, dinner: 60000, walk: 20 }, d),
    ).toEqual({ ok: true });
    expect(d.updatePrefs).toHaveBeenCalledWith(USER, {
      lunch: 5000,
      dinner: 60000,
      walk: 20,
    });
  });
});

describe("사무실 (SET-01)", () => {
  const pin = { lat: 37.5021, lng: 127.0411 };

  it("추가: 핀 좌표와 이름만 저장한다", async () => {
    const d = deps();
    expect(await addOffice({ name: " 판교 ", office: pin }, d)).toEqual({
      ok: true,
    });
    expect(d.insertOffice).toHaveBeenCalledWith(USER, {
      name: "판교",
      ...pin,
    });
  });

  it.each([
    [
      "주소 문자열",
      { name: "판교", office: { ...pin, address: "경기 성남시" } },
    ],
    ["좌표 출처", { name: "판교", office: { ...pin, source: "search" } }],
    ["장소명", { name: "판교", office: pin, placeName: "판교역" }],
    ["국외 좌표", { name: "판교", office: { lat: 35.68, lng: 139.76 } }],
  ])("추가: %s가 섞이면 거절(AC-ONB-3)", async (_n, input) => {
    const d = deps();
    expect(await addOffice(input, d)).toEqual({ ok: false, error: "invalid" });
    expect(d.insertOffice).not.toHaveBeenCalled();
  });

  it("추가: 이미 5곳이면 limit(DB 트리거 전에 막음)", async () => {
    const five = [A, B, C, A, B].map((id, i) =>
      office(id, `2026-10-0${i + 1}T00:00:00Z`),
    );
    const d = deps({ listOffices: async () => five });
    expect(await addOffice({ name: "여섯째", office: pin }, d)).toEqual({
      ok: false,
      error: "limit",
    });
    expect(d.insertOffice).not.toHaveBeenCalled();
  });

  it("추가: DB가 한도 초과로 거절하면 limit", async () => {
    const d = deps({ insertOffice: async () => "limit" });
    expect(await addOffice({ name: "판교", office: pin }, d)).toEqual({
      ok: false,
      error: "limit",
    });
  });

  it("이름 바꾸기와 기본 지정은 uuid만 받는다", async () => {
    const d = deps();
    expect(await renameOffice({ id: "1", name: "본사" }, d)).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await renameOffice({ id: A, name: "본사" }, d)).toEqual({
      ok: true,
    });
    expect(await setDefaultOffice({ id: A }, d)).toEqual({ ok: true });
    expect(d.setDefaultOffice).toHaveBeenCalledWith(USER, A);
  });

  it("기본을 지우면 남은 곳 중 가장 먼저 저장한 곳을 기본으로 지정한다", async () => {
    const list = [
      office(C, "2026-10-03T00:00:00Z"),
      office(A, "2026-10-01T00:00:00Z", true),
      office(B, "2026-10-02T00:00:00Z"),
    ];
    const d = deps({ listOffices: async () => list });
    expect(await deleteOffice({ id: A }, d)).toEqual({
      ok: true,
      promoted: "곳b",
    });
    expect(d.deleteOffice).toHaveBeenCalledWith(USER, A);
    expect(d.setDefaultOffice).toHaveBeenCalledWith(USER, B);
  });

  it("기본이 아닌 곳을 지우면 기본을 건드리지 않는다", async () => {
    const list = [
      office(A, "2026-10-01T00:00:00Z", true),
      office(B, "2026-10-02T00:00:00Z"),
    ];
    const d = deps({ listOffices: async () => list });
    expect(await deleteOffice({ id: B }, d)).toEqual({
      ok: true,
      promoted: null,
    });
    expect(d.setDefaultOffice).not.toHaveBeenCalled();
  });

  it("기본 지정이 실패해도 지우기는 성공(읽는 쪽이 가장 먼저 저장한 곳을 씀)", async () => {
    const list = [
      office(A, "2026-10-01T00:00:00Z", true),
      office(B, "2026-10-02T00:00:00Z"),
    ];
    const d = deps({
      listOffices: async () => list,
      setDefaultOffice: async () => false,
    });
    expect(await deleteOffice({ id: A }, d)).toEqual({
      ok: true,
      promoted: null,
    });
  });

  it("마지막 한 곳은 지울 수 없다", async () => {
    const d = deps({
      listOffices: async () => [office(A, "2026-10-01T00:00:00Z", true)],
    });
    expect(await deleteOffice({ id: A }, d)).toEqual({
      ok: false,
      error: "last-office",
    });
    expect(d.deleteOffice).not.toHaveBeenCalled();
  });

  it("이미 없는 곳(다른 기기에서 지움)은 지운 것으로 본다", async () => {
    const d = deps({
      listOffices: async () => [
        office(A, "2026-10-01T00:00:00Z", true),
        office(B, "2026-10-02T00:00:00Z"),
      ],
    });
    expect(await deleteOffice({ id: C }, d)).toEqual({
      ok: true,
      promoted: null,
    });
    expect(d.deleteOffice).not.toHaveBeenCalled();
  });
});

describe("못 먹는 음식 (SET-03)", () => {
  const stored: StoredAvoid[] = [
    { id: "r1", kind: "food", value: "회" },
    { id: "r2", kind: "allergy", value: "땅콩" },
    { id: "r3", kind: "custom", value: "고수" },
  ];

  it("diffAvoid: 바뀐 것만 넣고 뺀다", () => {
    expect(
      diffAvoid(stored, [
        { kind: "food", value: "회" },
        { kind: "allergy", value: "우유" },
      ]),
    ).toEqual({
      insert: [{ kind: "allergy", value: "우유" }],
      remove: ["r2", "r3"],
    });
  });

  it("넣기를 먼저 하고, 넣기가 실패하면 빼지 않는다(규칙이 줄지 않음)", async () => {
    const order: string[] = [];
    const d = deps({
      listAvoid: async () => stored,
      insertAvoid: vi.fn(async () => {
        order.push("insert");
        return false;
      }),
      deleteAvoid: vi.fn(async () => {
        order.push("delete");
        return true;
      }),
    });
    expect(
      await saveAvoid({ foods: ["회"], allergies: ["우유"], custom: [] }, d),
    ).toEqual({ ok: false, error: "save" });
    expect(order).toEqual(["insert"]);
  });

  it("칩 목록 밖 값, 중복, 21자 직접 입력은 거절", async () => {
    for (const input of [
      { foods: ["피자"], allergies: [], custom: [] },
      { foods: ["회", "회"], allergies: [], custom: [] },
      { foods: [], allergies: [], custom: ["가".repeat(21)] },
    ]) {
      expect(await saveAvoid(input, deps())).toEqual({
        ok: false,
        error: "invalid",
      });
    }
  });
});

describe("요즘 이게 땡겨요 (SET-05)", () => {
  it("12종 밖 slug, 4개 이상, 중복은 거절", async () => {
    for (const categories of [
      ["pizza"],
      ["hansik", "ilsik", "jungsik", "pub"],
      ["hansik", "hansik"],
    ]) {
      expect(await saveCravings({ categories }, deps())).toEqual({
        ok: false,
        error: "invalid",
      });
    }
  });

  it("새 선택은 한 번에 저장하고 DB가 정한 만료 시각을 돌려준다", async () => {
    const d = deps({ readCravings: async () => ["pub"] });
    expect(await saveCravings({ categories: ["hansik"] }, d)).toEqual({
      ok: true,
      until: "2026-11-06T01:00:00Z",
    });
    expect(d.updateCravings).toHaveBeenCalledTimes(1);
  });

  it("같은 선택을 다시 저장하면 비웠다가 넣어 7일을 새로 센다", async () => {
    const d = deps({ readCravings: async () => ["ilsik", "hansik"] });
    await saveCravings({ categories: ["hansik", "ilsik"] }, d);
    expect(vi.mocked(d.updateCravings).mock.calls).toEqual([
      [USER, []],
      [USER, ["hansik", "ilsik"]],
    ]);
  });

  it("모두 빼기는 빈 배열 한 번", async () => {
    const d = deps();
    expect(await saveCravings({ categories: [] }, d)).toEqual({
      ok: true,
      until: null,
    });
    expect(d.readCravings).not.toHaveBeenCalled();
  });
});
