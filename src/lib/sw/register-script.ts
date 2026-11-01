// 서비스 워커 등록 (T8.3, T8.4). 루트 layout <head>에 인라인으로 넣는 고정 문자열이라 홈 JS 번들에 더하지 않는다.
//
// - 켜진 환경(프로덕션 빌드): load 뒤 유휴 시간에 /sw.js?v=<빌드 버전>을 등록한다. 첫 렌더와 글꼴, 추천 요청과 겹치지 않게 한다.
//   빌드마다 주소의 v가 바뀌어 새 서비스 워커가 설치되고, 활성화 때 이전 버전 캐시(lm-shell-*)를 지운다(public/sw.js).
// - 꺼진 환경(next dev): 이전에 등록된 /sw.js가 있으면 해제하고 lm-shell-* 캐시를 지운다. 로컬에서 pnpm start로 켰던
//   서비스 워커가 개발 화면을 가로채지 않게 한다.
// - 캐시 범위와 제외 규칙은 public/sw.js 머리 주석과 docs/research-notes.md T0.16-3 "서비스 워커 캐시 범위"가 정본이다.

export const SW_PATH = "/sw.js";
export const SW_CACHE_PREFIX = "lm-shell-";

const S = JSON.stringify;

/** 빌드 버전. next.config의 env.LM_SW_VERSION(빌드 때 고정). 없으면 "0" */
export function swVersion(): string {
  return process.env.LM_SW_VERSION || "0";
}

/** 지금 환경에서 서비스 워커를 켜는가. 프로덕션 빌드에서만 켠다 */
export function swEnabled(): boolean {
  return process.env.NODE_ENV === "production";
}

/** 등록(또는 해제) 스크립트 문자열. 사용자 입력 없는 고정 문자열 */
export function swRegisterScript(
  enabled: boolean = swEnabled(),
  version: string = swVersion(),
): string {
  if (!enabled) {
    return `(function(){var n=navigator;if(!("serviceWorker" in n))return;n.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){var w=r.active||r.waiting||r.installing;if(w&&new URL(w.scriptURL).pathname===${S(SW_PATH)})r.unregister()})},function(){});if(window.caches)caches.keys().then(function(ks){ks.forEach(function(k){if(k.indexOf(${S(SW_CACHE_PREFIX)})===0)caches.delete(k)})},function(){})})();`;
  }
  const url = `${SW_PATH}?v=${encodeURIComponent(version)}`;
  return `(function(){var w=window,n=navigator;if(!("serviceWorker" in n))return;function reg(){n.serviceWorker.register(${S(url)},{scope:"/"}).catch(function(){})}function idle(){if(w.requestIdleCallback)w.requestIdleCallback(reg,{timeout:5000});else w.setTimeout(reg,2000)}if(document.readyState==="complete")idle();else w.addEventListener("load",idle,{once:true})})();`;
}
