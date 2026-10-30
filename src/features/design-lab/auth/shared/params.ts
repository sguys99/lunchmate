// 로그인 시안 쿼리 (T4.2). 서버와 클라이언트 양쪽에서 쓰는 순수 함수.
//   ?view=prompt | terms | inapp        보여 줄 단계 (기본 prompt)
//   ?state=loading | empty | error | offline
//       prompt: loading = 로그인 제공자로 이동 중, empty = 제공자에서 취소하고 돌아옴, error = 로그인 실패
//       terms:  loading = 약관과 프로필을 불러오는 중, error = 동의 저장 실패 (empty는 정상과 같음)
//       inapp:  loading = 외부 브라우저 여는 중(Android), error = 외부 열기 실패 (empty는 정상과 같음)
//   ?inapp=kakao | instagram | naver    인앱 브라우저 흉내 (AUTH-04). view=inapp인데 없으면 kakao
//   ?os=ios | android                   인앱 안내 OS (기본 ios)
//   ?trigger=poll | save | review       로그인을 부른 행동 (AUTH-07, 기본 poll)
//   ?provider=kakao | naver | google    약관 화면의 "○○ 계정으로 로그인했습니다" (기본 kakao)
import type { AuthInApp, AuthOs, AuthTrigger } from "@/copy/design-lab-auth";
import {
  parseDesignState,
  type DesignState,
  type DesignStateSearchParams,
} from "@/features/design-lab/mock";

export type AuthView = "prompt" | "terms" | "inapp";
export type AuthProvider = "kakao" | "naver" | "google";

export type AuthParams = {
  view: AuthView;
  state: DesignState;
  inApp: AuthInApp | null;
  os: AuthOs;
  trigger: AuthTrigger;
  provider: AuthProvider;
};

function read(
  searchParams: DesignStateSearchParams,
  key: string,
): string | undefined {
  if (!searchParams) return undefined;
  let raw: string | readonly string[] | null | undefined;
  if (searchParams instanceof URLSearchParams) raw = searchParams.get(key);
  else raw = searchParams[key];
  const first = typeof raw === "string" ? raw : raw?.[0];
  return first?.trim().toLowerCase() || undefined;
}

function pick<T extends string>(
  value: string | undefined,
  options: readonly T[],
): T | undefined {
  return (options as readonly string[]).includes(value ?? "")
    ? (value as T)
    : undefined;
}

export function parseAuthParams(
  searchParams: DesignStateSearchParams,
): AuthParams {
  const view =
    pick(read(searchParams, "view"), ["prompt", "terms", "inapp"] as const) ??
    "prompt";
  const inAppQuery = pick(read(searchParams, "inapp"), [
    "kakao",
    "instagram",
    "naver",
  ] as const);
  return {
    view,
    state: parseDesignState(searchParams),
    inApp: inAppQuery ?? (view === "inapp" ? "kakao" : null),
    os: pick(read(searchParams, "os"), ["ios", "android"] as const) ?? "ios",
    trigger:
      pick(read(searchParams, "trigger"), [
        "poll",
        "save",
        "review",
      ] as const) ?? "poll",
    provider:
      pick(read(searchParams, "provider"), [
        "kakao",
        "naver",
        "google",
      ] as const) ?? "kakao",
  };
}

/**
 * 인앱 브라우저 UA 판정 (research-notes T0.17 표). 실제 구현(T4.10)은 src/lib/inapp.ts 한 곳에 둔다.
 * 시안에서는 실기기로 열었을 때 쿼리 없이도 안내가 보이게 쓴다.
 */
export function detectInAppUserAgent(ua: string): AuthInApp | null {
  const s = ua.toLowerCase();
  if (s.includes("kakaotalk")) return "kakao";
  if (s.includes("instagram")) return "instagram";
  if (s.includes("naver(inapp")) return "naver";
  return null;
}

export function detectOs(ua: string): AuthOs | null {
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return null;
}
