// /auth/callback의 판단 흐름 (T4.6, T4.7, T4.9). Supabase와 fetch는 주입받아 테스트한다(route.ts가 실제 구현을 넘긴다).
//
// 1. 제공자가 돌려준 error(취소 등)나 code 없음 → /login?error=...&next=...
// 2. code를 세션으로 교환(PKCE, code verifier는 /auth/sign-in이 쿠키에 둔 것) 실패 → /login?error=failed
// 3. 네이버(custom:naver)이고 닉네임이 비어 있으면 provider_token으로 프로필 API를 한 번 불러 닉네임, 사진만 채운다.
//    실패는 무시(온보딩에서 닉네임 입력). 토큰은 이 함수 밖으로 나가지 않고 로그도 남기지 않는다.
// 4. 약관 동의 전(terms_agreed_at null)이면 약관 화면으로, 아니면 next로.
import { loginUrl, TERMS_PATH } from "./routes";
import type { ProfilePatch } from "./naver-profile";

export type LoginError = "cancelled" | "failed";

export type ExchangeResult =
  | {
      ok: true;
      userId: string;
      /** app_metadata.provider (서비스 롤만 쓰는 값이라 신뢰 가능) */
      provider: string | null;
      /** 제공자 접근 토큰. 세션 교환 결과에만 있고 DB에는 저장되지 않는다 */
      providerToken: string | null;
    }
  | { ok: false };

export type ProfileRow = {
  nickname: string | null;
  avatar_url: string | null;
  terms_agreed_at: string | null;
};

export type CompleteSignInDeps = {
  exchange: (code: string) => Promise<ExchangeResult>;
  readProfile: (userId: string) => Promise<ProfileRow | null>;
  updateProfile: (userId: string, patch: ProfilePatch) => Promise<boolean>;
  fetchNaverProfile: (accessToken: string) => Promise<ProfilePatch | null>;
};

export type CompleteSignInInput = {
  code: string | null;
  /** 제공자나 Supabase가 붙여 보낸 error 쿼리 */
  error: string | null;
  /** 이미 sanitizeNext를 거친 내부 경로 */
  next: string;
};

export type CompleteSignInResult = {
  location: string;
  /** 분석과 테스트용 요약. 토큰, 닉네임 같은 값은 담지 않는다 */
  outcome:
    | { type: "error"; error: LoginError }
    | {
        type: "signed-in";
        provider: string | null;
        naverSync: "skipped" | "filled" | "failed";
        needsTerms: boolean;
      };
};

export const NAVER_PROVIDER = "custom:naver";

/** 제공자 error 값을 화면 상태로. 사용자가 동의 화면에서 취소하면 OAuth 표준 access_denied가 온다 */
export function toLoginError(error: string): LoginError {
  return error === "access_denied" ? "cancelled" : "failed";
}

function termsUrl(next: string): string {
  return `${TERMS_PATH}?${new URLSearchParams({ next }).toString()}`;
}

export async function completeSignIn(
  input: CompleteSignInInput,
  deps: CompleteSignInDeps,
): Promise<CompleteSignInResult> {
  const { next } = input;
  if (input.error || !input.code) {
    const error = input.error ? toLoginError(input.error) : "failed";
    return {
      location: loginUrl(next, error),
      outcome: { type: "error", error },
    };
  }

  let exchanged: ExchangeResult;
  try {
    exchanged = await deps.exchange(input.code);
  } catch {
    exchanged = { ok: false };
  }
  if (!exchanged.ok) {
    return {
      location: loginUrl(next, "failed"),
      outcome: { type: "error", error: "failed" },
    };
  }

  const { userId, provider, providerToken } = exchanged;
  let profile = await deps.readProfile(userId).catch(() => null);

  let naverSync: "skipped" | "filled" | "failed" = "skipped";
  if (provider === NAVER_PROVIDER && profile && !profile.nickname) {
    const patch = providerToken
      ? await deps.fetchNaverProfile(providerToken).catch(() => null)
      : null;
    if (patch) {
      // 이미 있는 사진은 덮지 않는다(사용자가 바꿨을 수 있음)
      const toWrite: ProfilePatch = { ...patch };
      if (profile.avatar_url) delete toWrite.avatar_url;
      const saved = await deps
        .updateProfile(userId, toWrite)
        .catch(() => false);
      naverSync = saved ? "filled" : "failed";
      if (saved) profile = { ...profile, ...toWrite };
    } else {
      naverSync = "failed";
    }
  }

  // 프로필을 못 읽었으면 약관 화면이 다시 확인한다(그쪽이 로그인 필요 경로라 안전).
  const needsTerms = !profile?.terms_agreed_at;
  return {
    location: needsTerms ? termsUrl(next) : next,
    outcome: { type: "signed-in", provider, naverSync, needsTerms },
  };
}
