"use client";
// 랜딩 환경 (T3.4): 쿼리로 준 상태 + 실제 브라우저 상태(오프라인, 카카오톡 인앱)를 합친다.
// 서버 렌더와 첫 렌더는 쿼리 값만 쓰고, 마운트 뒤 브라우저 값을 더한다(하이드레이션 불일치 방지).
import { useSyncExternalStore } from "react";
import {
  isKakaoInAppUserAgent,
  type LandingParams,
  type LandingState,
} from "./params";

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

const noop = () => () => {};

export type LandingEnv = {
  state: LandingState;
  offline: boolean;
  inApp: boolean;
};

export function useLandingEnv(params: LandingParams): LandingEnv {
  const browserOffline = useSyncExternalStore(
    subscribeOnline,
    () => !navigator.onLine,
    () => false,
  );
  const browserInApp = useSyncExternalStore(
    noop,
    () => isKakaoInAppUserAgent(navigator.userAgent),
    () => false,
  );
  const offline = params.state === "offline" || browserOffline;
  return {
    state: offline ? "offline" : params.state,
    offline,
    inApp: params.inApp || browserInApp,
  };
}
