import { describe, expect, it, vi } from "vitest";
import {
  completeSignIn,
  type CompleteSignInDeps,
  type ProfileRow,
} from "./complete-sign-in";

const TOKEN = "provider-token-SECRET";
const USER = "00000000-0000-0000-0000-000000000001";

function deps(
  over: Partial<CompleteSignInDeps> & {
    profile?: ProfileRow | null;
    provider?: string;
  } = {},
) {
  const {
    profile = { nickname: null, avatar_url: null, terms_agreed_at: null },
    provider = "custom:naver",
    ...rest
  } = over;
  return {
    exchange: vi.fn(async () => ({
      ok: true as const,
      userId: USER,
      provider,
      providerToken: TOKEN,
    })),
    readProfile: vi.fn(async () => profile),
    updateProfile: vi.fn(async () => true),
    fetchNaverProfile: vi.fn(async () => ({
      nickname: "점심요정",
      avatar_url: "https://a.pstatic.net/p.png",
    })),
    ...rest,
  } satisfies CompleteSignInDeps;
}

const base = { code: "abc", error: null, next: "/poll/AbCdEf1234" };

describe("completeSignIn: 오류", () => {
  it("취소(access_denied) → /login?error=cancelled, next 유지", async () => {
    const d = deps();
    const r = await completeSignIn(
      { ...base, code: null, error: "access_denied" },
      d,
    );
    expect(r.location).toBe("/login?next=%2Fpoll%2FAbCdEf1234&error=cancelled");
    expect(d.exchange).not.toHaveBeenCalled();
  });
  it("그 밖의 오류, code 없음 → failed", async () => {
    expect(
      (await completeSignIn({ ...base, error: "server_error" }, deps()))
        .outcome,
    ).toEqual({ type: "error", error: "failed" });
    expect(
      (await completeSignIn({ ...base, code: null }, deps())).outcome,
    ).toEqual({ type: "error", error: "failed" });
  });
  it("교환 실패나 예외 → failed", async () => {
    const a = await completeSignIn(
      base,
      deps({ exchange: vi.fn(async () => ({ ok: false as const })) }),
    );
    expect(a.location).toContain("error=failed");
    const b = await completeSignIn(
      base,
      deps({
        exchange: vi.fn(async () => {
          throw new Error("x");
        }),
      }),
    );
    expect(b.location).toContain("error=failed");
  });
});

describe("completeSignIn: 네이버 프로필 1회 동기화 (T4.7)", () => {
  it("네이버 + 닉네임 없음 → 프로필 API 1회, 닉네임과 사진 저장", async () => {
    const d = deps();
    const r = await completeSignIn(base, d);
    expect(d.fetchNaverProfile).toHaveBeenCalledTimes(1);
    expect(d.fetchNaverProfile).toHaveBeenCalledWith(TOKEN);
    expect(d.updateProfile).toHaveBeenCalledWith(USER, {
      nickname: "점심요정",
      avatar_url: "https://a.pstatic.net/p.png",
    });
    expect(r.outcome).toMatchObject({ type: "signed-in", naverSync: "filled" });
  });
  it("이미 사진이 있으면 사진은 덮지 않는다", async () => {
    const d = deps({
      profile: {
        nickname: null,
        avatar_url: "https://x.pstatic.net/old.png",
        terms_agreed_at: null,
      },
    });
    await completeSignIn(base, d);
    expect(d.updateProfile).toHaveBeenCalledWith(USER, {
      nickname: "점심요정",
    });
  });
  it("프로필 API 실패 → 저장하지 않고 닉네임 비운 채 진행", async () => {
    const d = deps({ fetchNaverProfile: vi.fn(async () => null) });
    const r = await completeSignIn(base, d);
    expect(d.updateProfile).not.toHaveBeenCalled();
    expect(r.outcome).toMatchObject({
      type: "signed-in",
      naverSync: "failed",
      needsTerms: true,
    });
    expect(r.location).toBe("/welcome/terms?next=%2Fpoll%2FAbCdEf1234");
  });
  it("provider_token이 없으면 호출하지 않는다", async () => {
    const d = deps({
      exchange: vi.fn(async () => ({
        ok: true as const,
        userId: USER,
        provider: "custom:naver",
        providerToken: null,
      })),
    });
    await completeSignIn(base, d);
    expect(d.fetchNaverProfile).not.toHaveBeenCalled();
  });
  it("저장 실패도 로그인은 진행", async () => {
    const d = deps({ updateProfile: vi.fn(async () => false) });
    const r = await completeSignIn(base, d);
    expect(r.outcome).toMatchObject({ naverSync: "failed" });
    expect(r.location).toContain("/welcome/terms");
  });
  it("닉네임이 이미 있으면 (두 번째 로그인) 부르지 않는다", async () => {
    const d = deps({
      profile: {
        nickname: "기존",
        avatar_url: null,
        terms_agreed_at: "2026-10-30T00:00:00Z",
      },
    });
    const r = await completeSignIn(base, d);
    expect(d.fetchNaverProfile).not.toHaveBeenCalled();
    expect(r.location).toBe("/poll/AbCdEf1234");
  });
  it.each(["custom:kakao", "google"])(
    "%s는 부르지 않는다 (닉네임은 가입 트리거가 채움, 부분 동의면 비어 있음)",
    async (provider) => {
      const d = deps({ provider });
      const r = await completeSignIn(base, d);
      expect(d.fetchNaverProfile).not.toHaveBeenCalled();
      expect(d.updateProfile).not.toHaveBeenCalled();
      expect(r.outcome).toMatchObject({
        type: "signed-in",
        provider,
        naverSync: "skipped",
      });
    },
  );
  it("결과(outcome)와 위치에 토큰이 담기지 않고 콘솔에도 남지 않는다", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map(
      (m) => vi.spyOn(console, m).mockImplementation(() => {}),
    );
    const r = await completeSignIn(
      base,
      deps({
        fetchNaverProfile: vi.fn(async () => {
          throw new Error(TOKEN);
        }),
      }),
    );
    expect(JSON.stringify(r)).not.toContain(TOKEN);
    for (const s of spies)
      for (const c of s.mock.calls)
        expect(JSON.stringify(c)).not.toContain(TOKEN);
    spies.forEach((s) => s.mockRestore());
  });
});

describe("completeSignIn: 약관과 복귀 (T4.9)", () => {
  it("약관 동의 전 → 약관 화면, next 유지", async () => {
    const r = await completeSignIn(base, deps({ provider: "google" }));
    expect(r.location).toBe("/welcome/terms?next=%2Fpoll%2FAbCdEf1234");
  });
  it("동의 후 → next 그대로", async () => {
    const r = await completeSignIn(
      { ...base, next: "/today" },
      deps({
        provider: "google",
        profile: {
          nickname: "a",
          avatar_url: null,
          terms_agreed_at: "2026-10-30T00:00:00Z",
        },
      }),
    );
    expect(r.location).toBe("/today");
  });
  it("프로필을 못 읽으면 약관 화면 (그쪽에서 다시 확인)", async () => {
    const r = await completeSignIn(
      base,
      deps({
        provider: "google",
        readProfile: vi.fn(async () => {
          throw new Error("db");
        }),
      }),
    );
    expect(r.location).toContain("/welcome/terms");
  });
});
