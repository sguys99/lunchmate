// 네이버 Maps JS v3 스크립트 로더 (T0.34).
// 출처: https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html
//   스크립트 https://oapi.map.naver.com/openapi/v3/maps.js, 키 파라미터는 ncpKeyId(구 ncpClientId 대체),
//   인증 실패 시 전역 window.navermap_authFailure 호출.
// - 싱글턴 Promise: 여러 번 불러도 스크립트는 한 번만 넣는다.
// - 실패하면 1회 재시도(CLAUDE.md 9장). 최종 실패 시 캐시를 비워 사용자가 다시 시도할 수 있게 한다.
// - 지도 스크립트는 이 함수를 부를 때만 받는다(홈 번들 무영향).
import { clientEnv } from "@/lib/env/client";
import {
  MapAuthError,
  MapKeyMissingError,
  MapLoadError,
} from "@/lib/map/errors";
import type { NaverMapsApi } from "./naver-maps-types";

export { MapAuthError, MapKeyMissingError, MapLoadError };

export const NAVER_MAPS_SCRIPT_URL =
  "https://oapi.map.naver.com/openapi/v3/maps.js";
export const DEFAULT_LOAD_TIMEOUT_MS = 10_000;
const SCRIPT_ATTR = "data-naver-maps";

export type LoadNaverMapsOptions = {
  /** 미지정 시 NEXT_PUBLIC_NAVER_MAP_CLIENT_ID */
  keyId?: string;
  timeoutMs?: number;
  /** 재시도 횟수. 기본 1 */
  retries?: number;
};

export function buildNaverMapsScriptUrl(keyId: string): string {
  return `${NAVER_MAPS_SCRIPT_URL}?ncpKeyId=${encodeURIComponent(keyId)}`;
}

// 인증 실패 상태와 구독자. 인증은 스크립트 로드 뒤에 비동기로 실패할 수 있다.
let authFailed = false;
const authListeners = new Set<() => void>();

function installAuthHook(): void {
  if (typeof window === "undefined") return;
  window.navermap_authFailure = () => {
    authFailed = true;
    for (const listener of [...authListeners]) listener();
  };
}

/** 인증 실패 구독. 이미 실패했다면 즉시 호출한다. 반환값은 구독 해제 함수 */
export function onNaverAuthFailure(callback: () => void): () => void {
  if (authFailed) {
    callback();
    return () => {};
  }
  authListeners.add(callback);
  return () => {
    authListeners.delete(callback);
  };
}

function hasMapsApi(): boolean {
  return typeof window !== "undefined" && !!window.naver?.maps;
}

/** 로드된 네이버 Maps API. load 전에 부르면 오류 */
export function getNaverMapsApi(): NaverMapsApi {
  const api = typeof window === "undefined" ? undefined : window.naver?.maps;
  if (!api)
    throw new MapLoadError("네이버 지도 SDK가 아직 로드되지 않았습니다.");
  return api;
}

function injectOnce(url: string, timeoutMs: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.setAttribute(SCRIPT_ATTR, "");

    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      authListeners.delete(onAuth);
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
      if (error) {
        script.remove();
        reject(error);
      } else {
        resolve();
      }
    };
    const onLoad = () =>
      hasMapsApi()
        ? finish()
        : finish(new MapLoadError("네이버 지도 SDK 초기화에 실패했습니다."));
    const onError = () => finish(new MapLoadError());
    const onAuth = () => finish(new MapAuthError());
    const timer = setTimeout(
      () =>
        finish(new MapLoadError("지도 스크립트 로딩 시간이 초과되었습니다.")),
      timeoutMs,
    );

    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    authListeners.add(onAuth);
    document.head.appendChild(script);
  });
}

let pending: Promise<void> | undefined;

export function loadNaverMaps(
  options: LoadNaverMapsOptions = {},
): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new MapLoadError("브라우저에서만 지도를 불러옵니다."),
    );
  }
  if (authFailed) return Promise.reject(new MapAuthError());
  if (hasMapsApi()) return Promise.resolve();
  if (pending) return pending;

  const keyId = (
    options.keyId ?? clientEnv().NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
  )?.trim();
  // 키가 없으면 캐시하지 않는다. 키를 넣은 뒤 다시 시도하면 바로 동작해야 한다.
  if (!keyId) return Promise.reject(new MapKeyMissingError());

  installAuthHook();
  const url = buildNaverMapsScriptUrl(keyId);
  const timeoutMs = options.timeoutMs ?? DEFAULT_LOAD_TIMEOUT_MS;
  const retries = options.retries ?? 1;

  pending = (async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        await injectOnce(url, timeoutMs);
        return;
      } catch (error) {
        // 인증 실패는 재시도해도 같은 결과이므로 바로 끝낸다.
        if (error instanceof MapAuthError || attempt >= retries) throw error;
      }
    }
  })().catch((error: unknown) => {
    pending = undefined;
    throw error;
  });
  return pending;
}

/** 테스트 전용: 모듈 상태 초기화 */
export function resetNaverMapLoaderForTest(): void {
  pending = undefined;
  authFailed = false;
  authListeners.clear();
  if (typeof window !== "undefined") {
    delete window.navermap_authFailure;
    delete window.naver;
  }
  if (typeof document !== "undefined") {
    document
      .querySelectorAll(`script[${SCRIPT_ATTR}]`)
      .forEach((s) => s.remove());
  }
}
