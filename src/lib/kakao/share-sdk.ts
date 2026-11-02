// 카카오톡 공유용 Kakao JavaScript SDK 로더 (T7.13, T7.20, POLL-03, POLL-09S).
// 지도 SDK(sdk-loader.ts, window.kakao)와 다른 스크립트다(window.Kakao). 공유 화면이 뜰 때 미리 받는다(preloadKakaoShare,
// 홈과 투표방 첫 로드 무영향). 미리 받아 두면 누를 때 peekKakaoShare()로 바로 sendDefault를 불러 탭 안에서 카카오톡을 연다(T9.10).
// 주의: SDK 2.x는 Kakao.init() 전에는 Kakao.Share 같은 모듈이 없다(VERSION, init, isInitialized, cleanup, isInAppBrowser만 있음).
// 그래서 init을 먼저 하고 Share를 확인한다. 순서를 바꾸면 항상 "쓸 수 없음"으로 실패한다(T9.10에서 고친 원인).
// 출처 (2026-11-01 확인):
// - 설치와 초기화: https://developers.kakao.com/docs/ko/javascript/getting-started
//   (t1.kakaocdn.net/kakao_js_sdk/<버전>/kakao.min.js, integrity 필수, crossorigin anonymous, Kakao.init, Kakao.isInitialized,
//    "JavaScript SDK 도메인" 등록 필요)
// - 버전: https://developers.kakao.com/docs/ko/javascript/download (2.8.3, 2026.9.3 배포. 최신 2.8.4는 배포 2주 안이라 쓰지 않음)
//   integrity 값은 CDN 파일을 받아 sha384로 직접 계산했다(openssl dgst -sha384 -binary | base64).
// - 공유: https://developers.kakao.com/docs/ko/kakaotalk-share/js-link (Kakao.Share.sendDefault 피드 템플릿,
//   Kakao.Share.uploadImage({ file }) → infos.original.url, 5MB 이하, 카카오 서버 100일 보관 후 자동 삭제)
// 실패하면 1회 재시도(CLAUDE.md 9장). 응답과 이미지 URL은 저장하지 않는다.
import { clientEnv } from "@/lib/env/client";

export const KAKAO_SHARE_SDK_VERSION = "2.8.3";
export const KAKAO_SHARE_SDK_URL = `https://t1.kakaocdn.net/kakao_js_sdk/${KAKAO_SHARE_SDK_VERSION}/kakao.min.js`;
export const KAKAO_SHARE_SDK_INTEGRITY =
  "sha384-oroumrnFVE0xtgqyDZJARgERibXg2C28380uaUZz2kHDS5CR7tu20eGiOU6GkTpy";
const SCRIPT_ATTR = "data-kakao-share";
const TIMEOUT_MS = 10_000;

type KakaoLink = { mobileWebUrl: string; webUrl: string };

export type KakaoFeedTemplate = {
  objectType: "feed";
  content: {
    title: string;
    description?: string;
    imageUrl: string;
    imageWidth?: number;
    imageHeight?: number;
    link: KakaoLink;
  };
  buttons?: { title: string; link: KakaoLink }[];
};

export type KakaoShareApi = {
  sendDefault(template: KakaoFeedTemplate): void;
  uploadImage(args: {
    file: File[] | FileList;
  }): Promise<{ infos: { original: { url: string } } }>;
};

type KakaoGlobal = {
  init(key: string): void;
  isInitialized(): boolean;
  Share: KakaoShareApi;
};

declare global {
  interface Window {
    Kakao?: KakaoGlobal;
  }
}

export class KakaoShareUnavailableError extends Error {
  constructor(message = "카카오톡 공유를 쓸 수 없습니다.") {
    super(message);
    this.name = "KakaoShareUnavailableError";
  }
}

function inject(): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = KAKAO_SHARE_SDK_URL;
    script.integrity = KAKAO_SHARE_SDK_INTEGRITY;
    script.crossOrigin = "anonymous";
    script.async = true;
    script.setAttribute(SCRIPT_ATTR, "");
    const timer = setTimeout(() => {
      script.remove();
      reject(
        new KakaoShareUnavailableError(
          "카카오 SDK 로딩 시간이 초과되었습니다.",
        ),
      );
    }, TIMEOUT_MS);
    script.addEventListener("load", () => {
      clearTimeout(timer);
      resolve();
    });
    script.addEventListener("error", () => {
      clearTimeout(timer);
      script.remove();
      reject(
        new KakaoShareUnavailableError("카카오 SDK를 불러오지 못했습니다."),
      );
    });
    document.head.appendChild(script);
  });
}

let pending: Promise<KakaoShareApi> | undefined;

/** 공유 API를 받는다. 키가 없거나 두 번 실패하면 KakaoShareUnavailableError */
export function loadKakaoShare(): Promise<KakaoShareApi> {
  if (typeof window === "undefined")
    return Promise.reject(
      new KakaoShareUnavailableError("브라우저에서만 불러옵니다."),
    );
  const key = clientEnv().NEXT_PUBLIC_KAKAO_JS_KEY?.trim();
  if (!key)
    return Promise.reject(
      new KakaoShareUnavailableError("카카오 JS 키가 없습니다."),
    );
  pending ??= (async () => {
    if (!window.Kakao) {
      try {
        await inject();
      } catch {
        await inject();
      }
    }
    const K = window.Kakao;
    if (!K) throw new KakaoShareUnavailableError("카카오 SDK가 없습니다.");
    if (!K.isInitialized()) K.init(key);
    if (!K.Share)
      throw new KakaoShareUnavailableError(
        "초기화 뒤에도 Kakao.Share가 없습니다.",
      );
    ready = K.Share;
    return K.Share;
  })().catch((e: unknown) => {
    pending = undefined;
    throw e;
  });
  return pending;
}

let ready: KakaoShareApi | undefined;

/** 이미 받아 초기화한 공유 API. 없으면 undefined(동기, 탭 안에서 바로 부를 때) */
export function peekKakaoShare(): KakaoShareApi | undefined {
  return ready;
}

/** 공유 화면이 뜰 때 미리 받는다. 실패는 삼키고, 누를 때 loadKakaoShare가 다시 시도한다 */
export function preloadKakaoShare(): void {
  loadKakaoShare().catch(() => undefined);
}

/** 테스트 전용 */
export function resetKakaoShareForTest(): void {
  pending = undefined;
  ready = undefined;
  if (typeof window !== "undefined") delete window.Kakao;
  if (typeof document !== "undefined")
    document
      .querySelectorAll(`script[${SCRIPT_ATTR}]`)
      .forEach((s) => s.remove());
}
