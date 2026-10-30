// 로그인 제공자 식별자 (T4.6, T4.7). 화면은 짧은 id(kakao, naver, google)를 쓰고, Supabase에는 아래 식별자를 넘긴다.
// 식별자는 처음 정한 것을 바꾸지 않는다. 바꾸면 기존 사용자가 새 계정이 된다(CLAUDE.md 13장, T0.20).
// 카카오와 네이버는 Supabase 커스텀 OIDC provider, 구글은 내장 provider (setup-guide 2.1).
import type { Provider } from "@supabase/supabase-js";

export const LOGIN_PROVIDERS = ["kakao", "naver", "google"] as const;
export type LoginProvider = (typeof LOGIN_PROVIDERS)[number];

export const SUPABASE_PROVIDER = {
  kakao: "custom:kakao",
  naver: "custom:naver",
  google: "google",
} as const satisfies Record<LoginProvider, Provider>;

export function isLoginProvider(v: unknown): v is LoginProvider {
  return (
    typeof v === "string" && (LOGIN_PROVIDERS as readonly string[]).includes(v)
  );
}
