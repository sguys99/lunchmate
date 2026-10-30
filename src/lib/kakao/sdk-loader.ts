// 카카오 지도 JS SDK(services 라이브러리) 로더 (T4.16).
// 출처 (2026-10-30 확인): https://apis.map.kakao.com/web/guide/ ("autoload=false"와 kakao.maps.load(callback)으로
//   동적 로드, libraries=services로 장소 검색과 주소 검색), Context7 /websites/apis_map_kakao_web
// - 싱글턴 Promise: 여러 번 불러도 스크립트는 한 번만 넣는다.
// - 실패하면 1회 재시도(CLAUDE.md 9장). 최종 실패 시 캐시를 비워 사용자가 다시 시도할 수 있게 한다.
// - 이 함수를 부르는 화면에서만 받는다(홈, 랜딩 첫 로드 무영향).
// - 카카오 응답은 저장하지 않는다(CLAUDE.md 7장). 이 파일은 스크립트만 다룬다.
import { clientEnv } from "@/lib/env/client";
import type { KakaoMapsApi } from "./kakao-types";

export const KAKAO_SDK_URL = "https://dapi.kakao.com/v2/maps/sdk.js";
export const DEFAULT_KAKAO_TIMEOUT_MS = 10_000;
const SCRIPT_ATTR = "data-kakao-maps";

export class KakaoKeyMissingError extends Error {
  constructor() {
    super("카카오 JS 키가 설정되어 있지 않습니다.");
    this.name = "KakaoKeyMissingError";
  }
}

export class KakaoLoadError extends Error {
  constructor(message = "카카오 SDK를 불러오지 못했습니다.") {
    super(message);
    this.name = "KakaoLoadError";
  }
}

export function buildKakaoSdkUrl(appKey: string): string {
  const params = new URLSearchParams({
    appkey: appKey,
    libraries: "services",
    autoload: "false",
  });
  return `${KAKAO_SDK_URL}?${params.toString()}`;
}

function readyApi(): KakaoMapsApi | undefined {
  if (typeof window === "undefined") return undefined;
  const api = window.kakao?.maps;
  return api?.services ? api : undefined;
}

/** 로드된 카카오 SDK. load 전에 부르면 오류 */
export function getKakaoMapsApi(): KakaoMapsApi {
  const api = readyApi();
  if (!api) throw new KakaoLoadError("카카오 SDK가 아직 로드되지 않았습니다.");
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
      if (error) {
        script.remove();
        reject(error);
      } else resolve();
    };
    const timer = setTimeout(
      () =>
        finish(new KakaoLoadError("카카오 SDK 로딩 시간이 초과되었습니다.")),
      timeoutMs,
    );
    script.addEventListener("load", () => {
      const maps = window.kakao?.maps;
      if (!maps?.load) {
        finish(new KakaoLoadError("카카오 SDK 초기화에 실패했습니다."));
        return;
      }
      maps.load(() =>
        readyApi()
          ? finish()
          : finish(
              new KakaoLoadError("카카오 services를 불러오지 못했습니다."),
            ),
      );
    });
    script.addEventListener("error", () => finish(new KakaoLoadError()));
    document.head.appendChild(script);
  });
}

let pending: Promise<void> | undefined;

export function loadKakaoSdk(
  options: { appKey?: string; timeoutMs?: number; retries?: number } = {},
): Promise<void> {
  if (typeof window === "undefined")
    return Promise.reject(new KakaoLoadError("브라우저에서만 불러옵니다."));
  if (readyApi()) return Promise.resolve();
  if (pending) return pending;

  const appKey = (
    options.appKey ?? clientEnv().NEXT_PUBLIC_KAKAO_JS_KEY
  )?.trim();
  if (!appKey) return Promise.reject(new KakaoKeyMissingError());

  const url = buildKakaoSdkUrl(appKey);
  const timeoutMs = options.timeoutMs ?? DEFAULT_KAKAO_TIMEOUT_MS;
  const retries = options.retries ?? 1;
  pending = (async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        await injectOnce(url, timeoutMs);
        return;
      } catch (error) {
        if (attempt >= retries) throw error;
      }
    }
  })().catch((error: unknown) => {
    pending = undefined;
    throw error;
  });
  return pending;
}

/** 테스트 전용: 모듈 상태 초기화 */
export function resetKakaoSdkForTest(): void {
  pending = undefined;
  if (typeof window !== "undefined") delete window.kakao;
  if (typeof document !== "undefined")
    document
      .querySelectorAll(`script[${SCRIPT_ATTR}]`)
      .forEach((s) => s.remove());
}
