// 베타 의견에 함께 보내는 기기 종류 (T9.4, D-23 안건 11). 순수 함수, 브라우저와 테스트가 쓴다.
// UA 원문은 판정에만 쓰고 보내거나 저장하지 않는다. 결과는 ios, android, desktop + 인앱 여부 + 홈 화면 앱 여부뿐이다.
import { detectInApp, detectOs } from "@/lib/inapp";

export const BETA_DEVICES = ["ios", "android", "desktop"] as const;
export type BetaDeviceKind = (typeof BETA_DEVICES)[number];

export type DeviceInfo = {
  device: BetaDeviceKind;
  inApp: boolean;
  standalone: boolean;
};

export type DeviceEnv = {
  ua: string;
  /** iPadOS 사파리는 맥 UA를 쓴다. 터치 지점이 있으면 아이패드로 본다 */
  maxTouchPoints: number;
  standalone: boolean;
};

export function deviceInfoFrom(env: DeviceEnv): DeviceInfo {
  const os = detectOs(env.ua);
  const ipadAsMac = /macintosh/i.test(env.ua) && env.maxTouchPoints > 1;
  return {
    device: os ?? (ipadAsMac ? "ios" : "desktop"),
    inApp: detectInApp(env.ua) !== null,
    standalone: env.standalone,
  };
}

/** 지금 브라우저의 기기 종류 (브라우저 전용) */
export function readDeviceInfo(): DeviceInfo {
  const nav = navigator as Navigator & { standalone?: boolean };
  return deviceInfoFrom({
    ua: nav.userAgent,
    maxTouchPoints: nav.maxTouchPoints ?? 0,
    standalone:
      nav.standalone === true ||
      window.matchMedia?.("(display-mode: standalone)").matches === true,
  });
}
