// 랜딩 확인 화면 쿼리 (T3.4 시안, T4.28 실제 랜딩 확인용). 서버와 클라이언트 양쪽에서 쓰는 순수 함수.
//   ?state=loading | offline   (empty, error는 랜딩에 해당하지 않아 정상으로 본다. 로그인 오류는 /login이 안내)
//   ?inapp=kakao               카카오톡 인앱 브라우저 흉내 (AUTH-04)
//   ?flags=off                 appShell, auth 플래그가 꺼진 운영 화면 흉내("출시 준비" 안내)
import {
  parseDesignState,
  type DesignStateSearchParams,
} from "@/features/design-lab/mock";
import type { LandingPreview } from "@/features/landing/landing";

export type LandingLabParams = {
  preview: LandingPreview;
  flagsOff: boolean;
};

function first(
  searchParams: DesignStateSearchParams,
  key: string,
): string | undefined {
  let raw: string | readonly string[] | null | undefined;
  if (searchParams instanceof URLSearchParams) raw = searchParams.get(key);
  else raw = searchParams?.[key];
  const v = typeof raw === "string" ? raw : raw?.[0];
  return v?.trim().toLowerCase();
}

export function parseLandingParams(
  searchParams: DesignStateSearchParams,
): LandingLabParams {
  const state = parseDesignState(searchParams);
  return {
    preview: {
      loading: state === "loading",
      offline: state === "offline",
      inApp: first(searchParams, "inapp") === "kakao" ? "kakaotalk" : null,
    },
    flagsOff: first(searchParams, "flags") === "off",
  };
}
