// /beta 환영 페이지의 기기 판정 (T9.3, D-23). 순수 함수: 서버(첫 HTML)와 테스트가 쓴다.
// - 요청 UA로 인앱(detectInApp)과 OS(detectOs)를 판정한다(AUTH-04 로그인 화면과 같은 함수). UA가 있는데 휴대폰 OS가 아니면 컴퓨터.
//   UA가 없으면 모름(빈 상태: 기기 고르기 칩). 홈 화면 앱(standalone)과 맥 UA 아이패드는 브라우저가 첫 렌더 뒤 고친다.
// - UA 원문은 판정에만 쓰고 저장하거나 분석 도구로 보내지 않는다(T4.29와 같은 규칙).
// - 개발 환경(allowOverride)에서만 ?device= 로 흉내 낸다(화면 확인과 E2E용).
import { detectInApp, detectOs, type InApp, type MobileOs } from "@/lib/inapp";

export type BetaPlatform = "ios" | "android" | "desktop";

export type BetaEnv = {
  inApp: InApp | null;
  os: MobileOs | null;
  /** 설치 방법을 고를 기기. null이면 알아보지 못함 */
  platform: BetaPlatform | null;
  /** 아이폰 Chrome(UA CriOS). 공유 버튼 위치가 Safari와 달라 설치 안내를 바꾼다 */
  iosChrome?: boolean;
  /** 개발용 흉내: 홈 화면 앱으로 연 것처럼 */
  forceStandalone: boolean;
};

export const BETA_DEVICE_OVERRIDES = [
  "kakao-ios",
  "kakao-android",
  "ios",
  "chrome-ios",
  "android",
  "desktop",
  "app",
  "unknown",
] as const;

type Raw = string | string[] | undefined;

export function betaEnvFromUa(ua: string | null | undefined): BetaEnv {
  const os = detectOs(ua);
  return {
    inApp: detectInApp(ua),
    os,
    platform: os ?? (ua ? "desktop" : null),
    iosChrome: os === "ios" && /\bCriOS\//.test(ua ?? ""),
    forceStandalone: false,
  };
}

export function resolveBetaEnv(
  params: Record<string, Raw>,
  ua: string | null,
  allowOverride: boolean,
): BetaEnv {
  const real = betaEnvFromUa(ua);
  if (!allowOverride) return real;
  const raw = params.device;
  const v = (Array.isArray(raw) ? raw[0] : raw)?.trim().toLowerCase();
  switch (v) {
    case "kakao-ios":
      return {
        inApp: "kakaotalk",
        os: "ios",
        platform: "ios",
        forceStandalone: false,
      };
    case "kakao-android":
      return {
        inApp: "kakaotalk",
        os: "android",
        platform: "android",
        forceStandalone: false,
      };
    case "chrome-ios":
      return {
        inApp: null,
        os: "ios",
        platform: "ios",
        iosChrome: true,
        forceStandalone: false,
      };
    case "ios":
    case "android":
      return { inApp: null, os: v, platform: v, forceStandalone: false };
    case "desktop":
      return {
        inApp: null,
        os: null,
        platform: "desktop",
        forceStandalone: false,
      };
    case "app":
      return { inApp: null, os: "ios", platform: "ios", forceStandalone: true };
    case "unknown":
      return { inApp: null, os: null, platform: null, forceStandalone: false };
    default:
      return real;
  }
}
