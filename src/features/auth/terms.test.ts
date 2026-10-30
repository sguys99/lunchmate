import { describe, expect, it, vi } from "vitest";
import { authCopy } from "@/copy/auth";
import {
  afterTermsLocation,
  allState,
  canSubmit,
  EMPTY_CONSENT,
  FULL_CONSENT,
  missingRequired,
  setItem,
  TERM_ITEMS,
  termsAction,
  toggleAll,
} from "./terms";
import { submitTerms, type TermsSubmitDeps } from "./terms-submit";

describe("약관 모델 (AUTH-02, D-08 안건 6)", () => {
  it("항목은 필수 3개뿐이고 마케팅이 없다", () => {
    expect(TERM_ITEMS.map((t) => t.id)).toEqual(["age", "service", "privacy"]);
  });

  it("모두 동의는 전부 켜고, 다시 누르면 전부 끈다", () => {
    expect(toggleAll(EMPTY_CONSENT)).toEqual(FULL_CONSENT);
    expect(toggleAll(FULL_CONSENT)).toEqual(EMPTY_CONSENT);
    const some = setItem(EMPTY_CONSENT, "age", true);
    expect(allState(some)).toBe("some");
    expect(toggleAll(some)).toEqual(FULL_CONSENT);
  });

  it("남은 필수 개수를 센다 (안건 12 버튼 위 안내)", () => {
    expect(missingRequired(EMPTY_CONSENT)).toHaveLength(3);
    const two = setItem(setItem(EMPTY_CONSENT, "age", true), "privacy", true);
    expect(missingRequired(two)).toEqual(["service"]);
    expect(canSubmit(two)).toBe(false);
    expect(canSubmit(FULL_CONSENT)).toBe(true);
  });
});

describe("동의 버튼 문구는 하려던 일을 잇는다 (D-08 C)", () => {
  it.each([
    ["/poll/new", "pollCreate", "동의하고 투표 만들기"],
    ["/poll/new?from=home", "pollCreate", "동의하고 투표 만들기"],
    ["/poll/abc123defg", "pollJoin", "동의하고 투표 참여하기"],
    ["/today", "start", "동의하고 시작하기"],
    ["/me", "start", "동의하고 시작하기"],
  ] as const)("%s → %s", (next, action, label) => {
    expect(termsAction(next)).toBe(action);
    expect(authCopy.terms.submit[action]).toBe(label);
  });
});

describe("동의 뒤 갈 곳 (온보딩 연결 고리, T4.16)", () => {
  it("온보딩 경로가 없으면 next 그대로", () => {
    expect(afterTermsLocation({ next: "/poll/abc", hasOffice: false })).toBe(
      "/poll/abc",
    );
  });
  it("온보딩 경로가 있고 사무실이 없으면 온보딩으로 next를 이어 보낸다", () => {
    expect(
      afterTermsLocation({
        next: "/poll/abc",
        hasOffice: false,
        onboardingPath: "/welcome/office",
      }),
    ).toBe("/welcome/office?next=%2Fpoll%2Fabc");
    expect(
      afterTermsLocation({
        next: "/poll/abc",
        hasOffice: true,
        onboardingPath: "/welcome/office",
      }),
    ).toBe("/poll/abc");
  });
});

describe("submitTerms (서버 재검증)", () => {
  function deps(over: Partial<TermsSubmitDeps> = {}): TermsSubmitDeps {
    return {
      currentUserId: vi.fn(async () => "u1"),
      recordConsent: vi.fn(async () => true),
      hasOffice: vi.fn(async () => true),
      ...over,
    };
  }
  const full = { age: "on", service: "on", privacy: "on", next: "/poll/abc" };

  it("필수 3개가 모두 있어야 저장한다", async () => {
    const d = deps();
    const r = await submitTerms({ ...full, privacy: undefined }, d);
    expect(r).toEqual({ ok: false, error: "invalid", next: "/poll/abc" });
    expect(d.recordConsent).not.toHaveBeenCalled();
  });

  it("on 이외의 값은 거부한다", async () => {
    const r = await submitTerms({ ...full, age: "true" }, deps());
    expect(r.ok).toBe(false);
  });

  it("세션이 없으면 저장하지 않는다", async () => {
    const d = deps({ currentUserId: async () => null });
    const r = await submitTerms(full, d);
    expect(r).toMatchObject({ ok: false, error: "unauthenticated" });
    expect(d.recordConsent).not.toHaveBeenCalled();
  });

  it("저장 실패는 save 오류", async () => {
    const r = await submitTerms(
      full,
      deps({ recordConsent: async () => false }),
    );
    expect(r).toMatchObject({ ok: false, error: "save" });
  });

  it("성공하면 next로, 외부 주소 next는 기본 경로로", async () => {
    expect(await submitTerms(full, deps())).toEqual({
      ok: true,
      location: "/poll/abc",
    });
    expect(
      await submitTerms({ ...full, next: "//evil.example" }, deps()),
    ).toEqual({ ok: true, location: "/today" });
  });
});
