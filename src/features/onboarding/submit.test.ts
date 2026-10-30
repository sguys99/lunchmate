import { describe, expect, it, vi } from "vitest";
import {
  finishOnboarding,
  type FinishOnboardingDeps,
  type FinishOnboardingInput,
} from "./submit";

function deps(over: Partial<FinishOnboardingDeps> = {}): FinishOnboardingDeps {
  return {
    currentUserId: vi.fn(async () => "u1"),
    hasOffice: vi.fn(async () => false),
    updatePrefs: vi.fn(async () => true),
    replaceAvoid: vi.fn(async () => true),
    insertOffice: vi.fn(async () => true),
    ...over,
  };
}

const valid: FinishOnboardingInput = {
  office: { lat: 37.5021, lng: 127.0411 },
  prefs: { lunch: 10_000, dinner: 20_000, walk: 10 },
  avoid: { foods: ["회"], allergies: ["땅콩"], custom: ["고수"] },
  next: "/today?walk=15&tab=x",
};

describe("finishOnboarding (서버 재검증, ONB-01~05)", () => {
  it("핀 좌표, 설정, 기피 음식을 저장하고 next(이어받기 키 제거)로 보낸다", async () => {
    const d = deps();
    const r = await finishOnboarding(valid, d);
    expect(r).toEqual({ ok: true, location: "/today?tab=x" });
    expect(d.updatePrefs).toHaveBeenCalledWith("u1", valid.prefs);
    expect(d.replaceAvoid).toHaveBeenCalledWith("u1", [
      { kind: "food", value: "회" },
      { kind: "allergy", value: "땅콩" },
      { kind: "custom", value: "고수" },
    ]);
    expect(d.insertOffice).toHaveBeenCalledWith("u1", {
      name: "회사",
      lat: 37.5021,
      lng: 127.0411,
    });
  });

  it("AC-ONB-3: 사무실 값에 주소, 장소명, 검색 좌표 같은 다른 키가 섞이면 저장하지 않는다", async () => {
    for (const office of [
      { ...valid.office, address: "소담로 24" },
      { ...valid.office, name: "소담빌딩" },
      { ...valid.office, source: "search" },
    ]) {
      const d = deps();
      const r = await finishOnboarding({ ...valid, office }, d);
      expect(r).toEqual({ ok: false, error: "invalid" });
      expect(d.insertOffice).not.toHaveBeenCalled();
    }
    const d = deps();
    expect(
      await finishOnboarding({ ...valid, searchResult: valid.office }, d),
    ).toEqual({ ok: false, error: "invalid" });
  });

  it.each([
    ["범위 밖 좌표", { office: { lat: 10, lng: 127 } }],
    [
      "예산 단위 어긋남",
      { prefs: { lunch: 10_500, dinner: 20_000, walk: 10 } },
    ],
    ["예산 범위 밖", { prefs: { lunch: 4_000, dinner: 20_000, walk: 10 } }],
    ["저녁 범위 밖", { prefs: { lunch: 10_000, dinner: 70_000, walk: 10 } }],
    ["도보 분 목록 밖", { prefs: { lunch: 10_000, dinner: 20_000, walk: 12 } }],
    ["목록 밖 칩", { avoid: { foods: ["피자"], allergies: [], custom: [] } }],
    ["중복 칩", { avoid: { foods: ["회", "회"], allergies: [], custom: [] } }],
    [
      "긴 직접 입력",
      { avoid: { foods: [], allergies: [], custom: ["가".repeat(21)] } },
    ],
    [
      "직접 입력 11개",
      {
        avoid: {
          foods: [],
          allergies: [],
          custom: Array.from({ length: 11 }, (_, i) => `음식${i}`),
        },
      },
    ],
  ])("%s는 거부한다", async (_name, patch) => {
    const d = deps();
    expect(await finishOnboarding({ ...valid, ...patch }, d)).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(d.updatePrefs).not.toHaveBeenCalled();
  });

  it("비로그인이면 unauthenticated", async () => {
    const d = deps({ currentUserId: vi.fn(async () => null) });
    expect(await finishOnboarding(valid, d)).toEqual({
      ok: false,
      error: "unauthenticated",
    });
  });

  it("저장이 하나라도 실패하면 save, 사무실은 마지막에 만든다", async () => {
    const d = deps({ replaceAvoid: vi.fn(async () => false) });
    expect(await finishOnboarding(valid, d)).toEqual({
      ok: false,
      error: "save",
    });
    expect(d.insertOffice).not.toHaveBeenCalled();
    const d2 = deps({ insertOffice: vi.fn(async () => false) });
    expect(await finishOnboarding(valid, d2)).toEqual({
      ok: false,
      error: "save",
    });
  });

  it("이미 사무실이 있으면 새로 만들지 않는다(두 번 누름)", async () => {
    const d = deps({ hasOffice: vi.fn(async () => true) });
    expect((await finishOnboarding(valid, d)).ok).toBe(true);
    expect(d.insertOffice).not.toHaveBeenCalled();
  });

  it("next가 외부 주소나 로그인 흐름이면 기본 경로로", async () => {
    expect(
      await finishOnboarding({ ...valid, next: "//evil.com" }, deps()),
    ).toEqual({ ok: true, location: "/today" });
    expect(
      await finishOnboarding({ ...valid, next: "/welcome/terms" }, deps()),
    ).toEqual({ ok: true, location: "/today" });
  });

  it("직접 입력 앞뒤 공백은 지운다", async () => {
    const d = deps();
    await finishOnboarding(
      { ...valid, avoid: { foods: [], allergies: [], custom: ["  고수 "] } },
      d,
    );
    expect(d.replaceAvoid).toHaveBeenCalledWith("u1", [
      { kind: "custom", value: "고수" },
    ]);
  });
});
