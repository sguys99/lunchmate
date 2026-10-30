// 인앱 브라우저 감지와 외부 브라우저 열기 (T4.10, PRD AUTH-04, AC-AUTH-2, research-notes T0.17, D-08 안건 10, 11).
// 감지 문자열과 스킴은 이 파일 한 곳에 둔다(앱 업데이트로 UA가 바뀌면 여기만 고친다). 의존성 없는 순수 함수라
// 서버(/login 첫 렌더, /auth/sign-in 이중 안전장치)와 브라우저(구글 버튼, 로그인 유도 시트)가 함께 쓴다.
//
// 결정
// - 구글은 임베디드 웹뷰의 OAuth를 막는다(disallowed_useragent). 감지된 인앱은 모두 "구글 막힘"으로 본다.
//   네이버 앱은 자체 브라우저라 될 수도 있지만 T4.14 실기기 확인 전까지 안내를 보인다(안건 11).
// - 카카오톡은 iOS와 Android 모두 kakaotalk://web/openExternal?url= 을 먼저 시도한다(안건 10, 비공식 스킴).
//   라인은 공식 파라미터 openExternalBrowser=1. 그 밖의 Android 인앱은 Chrome intent:// (fallback URL 포함).
//   iOS 인스타그램, 페이스북, 네이버 앱은 웹에서 Safari를 여는 공개 수단이 없어 수동 안내만 한다.
// - iOS의 "Safari/ 토큰 없음"은 웹뷰로 보지 않는다. 홈 화면에 추가한 우리 PWA(standalone)도 Safari 토큰이 없어서
//   구글 로그인이 되는 환경을 막아 버리기 때문이다. Android 일반 웹뷰는 "; wv)" 토큰으로 본다.
// - UA 원문은 저장하거나 분석 도구로 보내지 않는다. 분석에는 판정 결과(앱 id)만 쓴다(T4.29).
//
// [실기기 확인 T4.14] 스킴 동작, 메뉴 위치와 메뉴 이름(앱 업데이트로 바뀔 수 있음).

export const IN_APPS = [
  "kakaotalk",
  "line",
  "instagram",
  "facebook",
  "naver",
  "webview",
] as const;
export type InApp = (typeof IN_APPS)[number];
export type MobileOs = "ios" | "android";

/** UA로 인앱 브라우저를 판정한다. 일반 브라우저(사파리, 크롬, 삼성 인터넷, 데스크톱)와 판정 불가는 null */
export function detectInApp(ua: string | null | undefined): InApp | null {
  if (!ua) return null;
  const s = ua.toLowerCase();
  if (s.includes("kakaotalk")) return "kakaotalk";
  if (/\bline\/\d/.test(s)) return "line";
  if (s.includes("instagram")) return "instagram";
  if (s.includes("fban/") || s.includes("fbav/") || s.includes("fb_iab"))
    return "facebook";
  if (s.includes("naver(inapp")) return "naver";
  if (/android.*;\s*wv\)/.test(s)) return "webview";
  return null;
}

export function detectOs(ua: string | null | undefined): MobileOs | null {
  if (!ua) return null;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return null;
}

export function isInApp(v: unknown): v is InApp {
  return typeof v === "string" && (IN_APPS as readonly string[]).includes(v);
}

/** 이 인앱에서 구글 로그인을 막고 안내로 보내는가. 지금은 감지된 인앱 전부(네이버 포함, 안건 11) */
export function googleBlocked(app: InApp | null): app is InApp {
  return app !== null;
}

/**
 * 외부 브라우저로 여는 주소. 사용자 탭 이벤트 안에서 동기로 location.href에 넣는다.
 * 웹에서 자동으로 열 수단이 없으면 null(수동 안내만).
 * @param current 외부 브라우저에서 열 절대 주소(https)
 */
export function externalOpenUrl(
  app: InApp,
  os: MobileOs | null,
  current: string,
): string | null {
  if (app === "kakaotalk") {
    return `kakaotalk://web/openExternal?url=${encodeURIComponent(current)}`;
  }
  if (app === "line") {
    const u = new URL(current);
    u.searchParams.set("openExternalBrowser", "1");
    return u.toString();
  }
  if (os === "android") {
    const u = new URL(current);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const scheme = u.protocol.slice(0, -1);
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(current)};end`;
  }
  return null;
}

export type MenuPosition = "bottom-right" | "top-right";

export type InAppGuide = {
  app: InApp;
  os: MobileOs;
  menu: MenuPosition;
  /** 메뉴 아이콘 모양: 가로 점 셋(iOS 관례) 또는 세로 점 셋(Android 관례) */
  menuIcon: "horizontal" | "vertical";
  /** 메뉴에서 고를 항목의 종류(문구는 src/copy/auth.ts) */
  menuItem: "otherBrowser" | "externalBrowser";
  /** 사용자 탭 안에서 스킴이나 intent로 외부 브라우저 열기를 시도할 수 있는가 */
  canAutoOpen: boolean;
};

/**
 * 수동 안내 그림과 단계에 쓸 메뉴 위치. OS를 모르면 iOS로 본다(Android는 대부분 자동 열기가 된다).
 * - 카카오톡, 네이버 앱 iOS: 오른쪽 아래 메뉴. Android: 오른쪽 위
 * - 인스타그램, 페이스북, 라인, 일반 웹뷰: 오른쪽 위
 */
export function inAppGuide(app: InApp, os: MobileOs | null): InAppGuide {
  const o: MobileOs = os ?? "ios";
  const android = o === "android";
  const bottomOnIos = app === "kakaotalk" || app === "naver";
  return {
    app,
    os: o,
    menu: !android && bottomOnIos ? "bottom-right" : "top-right",
    menuIcon: android ? "vertical" : "horizontal",
    menuItem:
      app === "instagram" || app === "facebook"
        ? "externalBrowser"
        : "otherBrowser",
    canAutoOpen: externalOpenUrl(app, o, "https://example.com/") !== null,
  };
}
