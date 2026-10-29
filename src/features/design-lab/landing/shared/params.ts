// 랜딩 시안 쿼리 (T3.4). 서버와 클라이언트 양쪽에서 쓰는 순수 함수.
//   ?state=loading | offline | error   (empty는 랜딩에 해당하지 않아 정상으로 본다)
//   ?inapp=kakao                        카카오톡 인앱 브라우저 흉내 (AUTH-04)
import {
  parseDesignState,
  type DesignStateSearchParams,
} from "@/features/design-lab/mock";

export type LandingState = "ready" | "loading" | "offline" | "error";

export type LandingParams = {
  state: LandingState;
  inApp: boolean;
};

export function parseLandingParams(
  searchParams: DesignStateSearchParams,
): LandingParams {
  const s = parseDesignState(searchParams);
  const state: LandingState = s === "empty" ? "ready" : s;
  let raw: string | readonly string[] | null | undefined;
  if (searchParams instanceof URLSearchParams) raw = searchParams.get("inapp");
  else raw = searchParams?.inapp;
  const first = typeof raw === "string" ? raw : raw?.[0];
  return { state, inApp: first?.trim().toLowerCase() === "kakao" };
}

/** 카카오톡 인앱 브라우저 UA (AUTH-04). 실제 감지 로직은 4단계 인증 작업에서 공용 모듈로 옮긴다. */
export function isKakaoInAppUserAgent(ua: string): boolean {
  return /KAKAOTALK/i.test(ua);
}
