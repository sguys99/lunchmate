// 오프라인 기본 화면(/offline, T8.3)의 인라인 스크립트. 재연결 시 자동 새로고침과 다시 시도 버튼.
//
// 서비스 워커는 /today 같은 원래 주소에 /offline HTML을 돌려준다. 이 스크립트는 HTML을 읽는 즉시(하이드레이션 전)
// 원래 주소를 잡아 두고, online 이벤트나 버튼 누름에 그 주소를 다시 연다. /offline을 직접 연 경우에는 fallback으로 간다.
// 아직 연결이 없으면 서비스 워커가 다시 이 화면을 보여 준다.

export const OFFLINE_PATH = "/offline";
export const OFFLINE_RETRY_ATTR = "data-lm-offline-retry";

const S = JSON.stringify;

/** fallback은 /today 또는 / 같은 내부 경로(서버가 정하는 고정값) */
export function offlineReloadScript(fallback: string): string {
  const safe =
    fallback.startsWith("/") && !fallback.startsWith("//") ? fallback : "/";
  return `(function(){var w=window,d=document,l=w.location,t=l.pathname===${S(OFFLINE_PATH)}?${S(safe)}:l.href;function go(){l.replace(t)}w.addEventListener("online",go);d.addEventListener("click",function(e){var el=e.target;if(el&&el.closest&&el.closest("[${OFFLINE_RETRY_ATTR}]")){e.preventDefault();go()}})})();`;
}
