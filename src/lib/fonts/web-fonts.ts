// 웹 글꼴 적용 시점 (T5.41 후속, 2026-10-31 사용자 결정 1, DESIGN.md 3장 "로딩").
//
// - 서체 변수(--font-pretendard, --font-maruburi)와 크기 보정 대체 글꼴은 루트 layout의 app/fonts/fonts.css(작은 파일)에 있다.
//   웹 글꼴 @font-face 목록(unicode-range 조각, 약 21KB gzip)은 public/fonts/<버전>/faces.css로 따로 두고 링크로 붙인다.
//   목록이 없으면 변수의 첫 이름("Pretendard Variable", "MaruBuri")이 없는 글꼴이라 보정된 대체 글꼴로 그린다.
// - 첫 방문(표시 없음): 렌더링을 막는 글꼴 CSS도, 글꼴 파일도 받지 않는다. load 뒤 화면의 로딩 영역
//   ([data-slot=loading-region], 홈 카드 스켈레톤 등)이 모두 사라지면(최대 FIRST_VISIT_MAX_WAIT_MS) 유휴 시간에 링크를 붙인다.
//   글꼴을 다 받으면 "받음" 표시(localStorage, 화면 편의 값)를 남긴다. 표시를 못 남겨도(저장소 차단) 다음 방문이 첫 방문처럼 동작할 뿐이다.
// - 재방문(표시 있음): 첫 페인트 전 이 스크립트가 링크를 바로 붙이고 blocking="render"로 첫 페인트를 기다리게 한다(캐시에서 온다).
// - 글꼴 파일과 목록은 버전 경로(/fonts/v1/)에 두고 1년 immutable 캐시(next.config headers). 글꼴을 바꾸면 버전을 올린다.
//   버전이 바뀌면 표시 값도 달라져 첫 방문처럼 동작한다.
// - 이 동작은 모션 설정, 테마와 무관하다. 대체 글꼴도 같은 크기, 굵기, 색 토큰으로 그리므로 대비와 접근성에 영향이 없다.

export const WEB_FONTS_VERSION = "v1";
export const WEB_FONTS_HREF = `/fonts/${WEB_FONTS_VERSION}/faces.css`;
export const WEB_FONTS_STORAGE_KEY = "lm-fonts";
export const WEB_FONTS_LINK_ID = "lm-font-faces";
/** 첫 방문에서 load 뒤 로딩 영역이 남아 있어도 이 시간이 지나면 글꼴을 붙인다 */
export const FIRST_VISIT_MAX_WAIT_MS = 8000;

const S = JSON.stringify;

/**
 * 루트 layout <head>에 인라인으로 넣는 첫 페인트 전 스크립트. 사용자 입력 없는 고정 문자열.
 * 재방문이면 링크를 바로 붙이고, 첫 방문이면 load와 로딩 영역이 끝난 뒤 붙인다.
 */
export const WEB_FONTS_INIT_SCRIPT = `(function(){var d=document,w=window,K=${S(WEB_FONTS_STORAGE_KEY)},V=${S(WEB_FONTS_VERSION)};function add(b){if(d.getElementById(${S(WEB_FONTS_LINK_ID)}))return null;var l=d.createElement("link");l.id=${S(WEB_FONTS_LINK_ID)};l.rel="stylesheet";l.href=${S(WEB_FONTS_HREF)};if(b)l.setAttribute("blocking","render");d.head.appendChild(l);return l}var seen=false;try{seen=w.localStorage.getItem(K)===V}catch(e){}if(seen){add(true);return}function mark(){try{w.localStorage.setItem(K,V)}catch(e){}}function go(){var l=add(false);if(!l)return;l.onload=function(){var f=d.fonts;if(!f||!f.ready){mark();return}w.requestAnimationFrame(function(){f.ready.then(mark,function(){})})}}function idle(f){if(w.requestIdleCallback)w.requestIdleCallback(f,{timeout:1500});else w.setTimeout(f,100)}function wait(){var t=Date.now();(function poll(){if(!d.querySelector('[data-slot="loading-region"]')||Date.now()-t>${FIRST_VISIT_MAX_WAIT_MS})idle(go);else w.setTimeout(poll,200)})()}if(d.readyState==="complete")wait();else w.addEventListener("load",wait,{once:true})})();`;
