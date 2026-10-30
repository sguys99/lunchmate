// 인앱 브라우저 안내 모델 (T4.2, AUTH-04, research-notes T0.17). 앱과 OS별 메뉴 위치, 메뉴 이름, 자동 열기 가능 여부.
// [실기기 확인] 메뉴 위치와 이름은 앱 업데이트로 바뀔 수 있다. T4.14에서 실기기로 맞춘다.
// - 카카오톡 iOS: 오른쪽 아래 메뉴 → "다른 브라우저로 열기"(copy-guide 4.6 예문)
// - 카카오톡 Android: 오른쪽 위 메뉴 → "다른 브라우저로 열기", kakaotalk://web/openExternal 비공식 스킴 시도
// - 인스타그램: 오른쪽 위 메뉴 → "외부 브라우저에서 열기", Android는 intent:// 시도
// - 네이버 앱: 자체 브라우저라 구글이 될 수도 있다(미검증). 시안은 안내를 보여 준다
import type { AuthInApp, AuthOs } from "@/copy/design-lab-auth";

export type MenuPosition = "bottom-right" | "top-right";

export type InAppGuide = {
  app: AuthInApp;
  os: AuthOs;
  menu: MenuPosition;
  /** 메뉴 아이콘 모양: 가로 점 셋(iOS 관례) 또는 세로 점 셋(Android 관례) */
  menuIcon: "horizontal" | "vertical";
  /** 메뉴에서 고를 항목 이름 */
  menuItem: string;
  /** 사용자 탭 안에서 스킴이나 intent로 외부 브라우저 열기를 시도할 수 있는가 */
  canAutoOpen: boolean;
};

const MENU_ITEM = {
  kakao: "다른 브라우저로 열기",
  instagram: "외부 브라우저에서 열기",
  naver: "다른 브라우저로 열기",
} as const satisfies Record<AuthInApp, string>;

export function inAppGuide(app: AuthInApp, os: AuthOs): InAppGuide {
  const android = os === "android";
  const menu: MenuPosition =
    android || app === "instagram" ? "top-right" : "bottom-right";
  return {
    app,
    os,
    menu,
    menuIcon: android ? "vertical" : "horizontal",
    menuItem: MENU_ITEM[app],
    canAutoOpen: android,
  };
}

/** Android 외부 열기 주소. 사용자 탭 이벤트 안에서 동기로 location.href에 넣는다(research-notes T0.17) */
export function externalOpenUrl(app: AuthInApp, current: string): string {
  if (app === "kakao") {
    return `kakaotalk://web/openExternal?url=${encodeURIComponent(current)}`;
  }
  const u = new URL(current);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(current)};end`;
}
