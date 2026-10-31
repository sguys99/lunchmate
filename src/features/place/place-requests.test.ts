import { describe, expect, it, vi } from "vitest";
import {
  readPlaceUserState,
  saveVisit,
  setBlocked,
  setFavorite,
  type BlockDeps,
  type PlaceDeps,
} from "./place-requests";

function deps(overrides: Partial<PlaceDeps> = {}): PlaceDeps {
  return {
    currentUserId: async () => "user-1",
    insertVisit: vi.fn(async () => "ok" as const),
    isFavorite: async () => false,
    isBlocked: async () => false,
    insertFavorite: vi.fn(async () => "ok" as const),
    deleteFavorite: vi.fn(async () => true),
    ...overrides,
  };
}

const visit = {
  placeId: "123456",
  placeUrl: "https://place.map.kakao.com/123456",
  meal: "lunch",
  source: "rec",
} as const;

describe("saveVisit (NAV-04)", () => {
  it("place_id, place_url, 끼니, 출처만 저장한다", async () => {
    const d = deps();
    await expect(saveVisit(visit, d)).resolves.toEqual({
      ok: true,
      created: true,
    });
    expect(d.insertVisit).toHaveBeenCalledWith("user-1", {
      place_id: "123456",
      place_url: "https://place.map.kakao.com/123456",
      meal: "lunch",
      source: "rec",
    });
  });
  it("place_url이 없어도 된다", async () => {
    const d = deps();
    await saveVisit({ ...visit, placeUrl: undefined }, d);
    expect(d.insertVisit).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ place_url: null }),
    );
  });
  it.each([
    ["숫자가 아닌 place_id", { ...visit, placeId: "abc" }],
    [
      "다른 id의 place_url",
      { ...visit, placeUrl: "https://place.map.kakao.com/999" },
    ],
    [
      "카카오맵이 아닌 주소",
      { ...visit, placeUrl: "https://evil.example/123456" },
    ],
    ["모르는 끼니", { ...visit, meal: "brunch" }],
    ["모르는 출처", { ...visit, source: "ad" }],
    ["장소명 같은 추가 필드", { ...visit, name: "정담 국밥" }],
    ["좌표 같은 추가 필드", { ...visit, lat: 37.5 }],
    ["서버가 정하는 방문일", { ...visit, visited_on: "2026-01-01" }],
  ])("%s는 거절한다", async (_label, input) => {
    const d = deps();
    await expect(saveVisit(input, d)).resolves.toEqual({
      ok: false,
      error: "invalid",
    });
    expect(d.insertVisit).not.toHaveBeenCalled();
  });
  it("비로그인이면 저장하지 않는다", async () => {
    const d = deps({ currentUserId: async () => null });
    await expect(saveVisit(visit, d)).resolves.toEqual({
      ok: false,
      error: "unauthenticated",
    });
    expect(d.insertVisit).not.toHaveBeenCalled();
  });
  it("같은 날 같은 끼니 중복은 성공(새로 만들지 않음), 하루 20건 초과는 limit", async () => {
    await expect(
      saveVisit(visit, deps({ insertVisit: async () => "duplicate" })),
    ).resolves.toEqual({
      ok: true,
      created: false,
    });
    await expect(
      saveVisit(visit, deps({ insertVisit: async () => "limit" })),
    ).resolves.toEqual({
      ok: false,
      error: "limit",
    });
  });
});

describe("setFavorite (PLACE-04)", () => {
  const fav = { placeId: "123456", placeUrl: null, on: true };
  it("담기", async () => {
    const d = deps();
    await expect(setFavorite(fav, d)).resolves.toEqual({ ok: true, on: true });
    expect(d.insertFavorite).toHaveBeenCalledWith("user-1", {
      place_id: "123456",
      place_url: null,
    });
  });
  it("다시 안 갈 곳이면 담지 않는다", async () => {
    const d = deps({ isBlocked: async () => true });
    await expect(setFavorite(fav, d)).resolves.toEqual({
      ok: false,
      error: "blocked",
    });
    expect(d.insertFavorite).not.toHaveBeenCalled();
  });
  it("빼기는 다시 안 갈 곳과 무관하게 지운다", async () => {
    const d = deps({ isBlocked: async () => true });
    await expect(setFavorite({ ...fav, on: false }, d)).resolves.toEqual({
      ok: true,
      on: false,
    });
    expect(d.deleteFavorite).toHaveBeenCalledWith("user-1", "123456");
  });
  it("이미 담겨 있으면 성공, 300곳 초과는 limit", async () => {
    await expect(
      setFavorite(fav, deps({ insertFavorite: async () => "duplicate" })),
    ).resolves.toEqual({
      ok: true,
      on: true,
    });
    await expect(
      setFavorite(fav, deps({ insertFavorite: async () => "limit" })),
    ).resolves.toEqual({
      ok: false,
      error: "limit",
    });
  });
  it("비로그인과 잘못된 입력", async () => {
    await expect(
      setFavorite(fav, deps({ currentUserId: async () => null })),
    ).resolves.toEqual({
      ok: false,
      error: "unauthenticated",
    });
    await expect(
      setFavorite({ placeId: "1", on: "yes" }, deps()),
    ).resolves.toEqual({
      ok: false,
      error: "invalid",
    });
  });
});

describe("readPlaceUserState", () => {
  it("비로그인이면 signedIn false", async () => {
    await expect(
      readPlaceUserState(
        { placeId: "1" },
        deps({ currentUserId: async () => null }),
      ),
    ).resolves.toEqual({ signedIn: false });
  });
  it("즐겨찾기와 다시 안 갈 곳 여부", async () => {
    await expect(
      readPlaceUserState(
        { placeId: "1" },
        deps({ isFavorite: async () => true }),
      ),
    ).resolves.toEqual({ signedIn: true, favorite: true, blocked: false });
  });
});

function blockDeps(overrides: Partial<BlockDeps> = {}): BlockDeps {
  return {
    currentUserId: async () => "user-1",
    isFavorite: vi.fn(async () => false),
    deleteFavorite: vi.fn(async () => true),
    insertBlock: vi.fn(async () => "ok" as const),
    deleteBlock: vi.fn(async () => true),
    ...overrides,
  };
}

const block = {
  placeId: "123456",
  placeUrl: "https://place.map.kakao.com/123456",
  on: true,
} as const;

describe("setBlocked (REC-08, T5.20)", () => {
  it("place_id, place_url만 넣는다", async () => {
    const d = blockDeps();
    await expect(setBlocked(block, d)).resolves.toEqual({
      ok: true,
      on: true,
      unfavorited: false,
    });
    expect(d.insertBlock).toHaveBeenCalledWith("user-1", {
      place_id: "123456",
      place_url: "https://place.map.kakao.com/123456",
    });
    expect(d.deleteFavorite).not.toHaveBeenCalled();
  });
  it("즐겨찾기에 있으면 넣은 뒤 즐겨찾기에서 뺀다", async () => {
    const d = blockDeps({ isFavorite: vi.fn(async () => true) });
    await expect(setBlocked(block, d)).resolves.toEqual({
      ok: true,
      on: true,
      unfavorited: true,
    });
    expect(d.deleteFavorite).toHaveBeenCalledWith("user-1", "123456");
  });
  it("넣기에 실패하면 즐겨찾기를 건드리지 않는다", async () => {
    const d = blockDeps({
      isFavorite: vi.fn(async () => true),
      insertBlock: vi.fn(async () => "error" as const),
    });
    await expect(setBlocked(block, d)).resolves.toEqual({
      ok: false,
      error: "save",
    });
    expect(d.deleteFavorite).not.toHaveBeenCalled();
  });
  it("이미 있으면 성공으로 본다", async () => {
    const d = blockDeps({
      insertBlock: vi.fn(async () => "duplicate" as const),
    });
    await expect(setBlocked(block, d)).resolves.toMatchObject({
      ok: true,
      on: true,
    });
  });
  it("300곳을 넘으면 limit", async () => {
    const d = blockDeps({ insertBlock: vi.fn(async () => "limit" as const) });
    await expect(setBlocked(block, d)).resolves.toEqual({
      ok: false,
      error: "limit",
    });
  });
  it("되돌리기(on false)는 지우기만 한다", async () => {
    const d = blockDeps();
    await expect(setBlocked({ ...block, on: false }, d)).resolves.toEqual({
      ok: true,
      on: false,
    });
    expect(d.deleteBlock).toHaveBeenCalledWith("user-1", "123456");
    expect(d.insertBlock).not.toHaveBeenCalled();
  });
  it("지우기에 실패하면 save", async () => {
    const d = blockDeps({ deleteBlock: vi.fn(async () => false) });
    await expect(setBlocked({ ...block, on: false }, d)).resolves.toEqual({
      ok: false,
      error: "save",
    });
  });
  it("비로그인이면 저장하지 않는다", async () => {
    const d = blockDeps({ currentUserId: async () => null });
    await expect(setBlocked(block, d)).resolves.toEqual({
      ok: false,
      error: "unauthenticated",
    });
    expect(d.insertBlock).not.toHaveBeenCalled();
  });
  it.each([
    ["숫자가 아닌 place_id", { ...block, placeId: "12a" }],
    [
      "다른 id의 place_url",
      { ...block, placeUrl: "https://place.map.kakao.com/999" },
    ],
    [
      "카카오맵이 아닌 주소",
      { ...block, placeUrl: "https://evil.example/123456" },
    ],
    ["장소명 같은 다른 키", { ...block, name: "식당" }],
    ["on 없음", { placeId: "123456" }],
  ])("%s는 거절한다", async (_, input) => {
    const d = blockDeps();
    await expect(setBlocked(input, d)).resolves.toEqual({
      ok: false,
      error: "invalid",
    });
    expect(d.insertBlock).not.toHaveBeenCalled();
  });
});
