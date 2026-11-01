// 설치 유도의 인라인 스크립트 (T8.2, PRD APP-01 "설치 유도는 3번째 방문부터 1회").
// 루트 layout <head>에 넣는 고정 문자열이라 홈 JS 번들에 더하지 않는다(/today 예산, CLAUDE.md 9장).
//
// 하는 일
// 1) 방문 세기: 탭 세션마다 한 번(sessionStorage 표시) localStorage 방문 수를 1 올린다. 시안, 관리자, 오프라인, 인증 경로는 세지 않는다.
//    값은 숫자 하나와 "보여 줌" 표시뿐이다(장소 데이터 아님, CLAUDE.md 7장). 저장소가 막힌 환경(사생활 보호 모드 등)은 try/catch로 조용히 넘긴다.
// 2) 3번째 방문부터, 아직 보여 주지 않았으면 window.__lmInstallDue = true. 앱 셸의 InstallPromptLoader가 이 값만 보고
//    유휴 시간에 유도 청크(install-prompt.ts)를 받는다. 조건이 안 맞으면 청크를 받지 않는다.
// 3) beforeinstallprompt(Chrome, Edge, 삼성 인터넷)를 일찍 잡아 브라우저 기본 설치 띠를 막고(preventDefault) 나중에 쓰도록 보관한다.
//    청크가 받기 전에 이벤트가 와도 놓치지 않는다. 보관 뒤 "lm:bip" 이벤트를 쏜다.
//    appinstalled가 오면 "보여 줌"으로 표시해 다시 묻지 않는다.

export const INSTALL_VISITS_KEY = "lm-install-visits";
export const INSTALL_SHOWN_KEY = "lm-install-shown";
export const INSTALL_SESSION_KEY = "lm-install-counted";
/** 몇 번째 방문부터 묻는가(APP-01) */
export const INSTALL_MIN_VISITS = 3;
/** 방문으로 세지 않는 경로 */
export const INSTALL_SKIP_PREFIXES = [
  "/design-lab",
  "/admin",
  "/offline",
  "/auth",
] as const;

const S = JSON.stringify;

export function installInitScript(): string {
  return `(function(){var w=window;try{var ls=w.localStorage,ss=w.sessionStorage,p=w.location.pathname,skip=${S(INSTALL_SKIP_PREFIXES)}.some(function(x){return p===x||p.indexOf(x+"/")===0});if(!skip&&!ss.getItem(${S(INSTALL_SESSION_KEY)})){ss.setItem(${S(INSTALL_SESSION_KEY)},"1");ls.setItem(${S(INSTALL_VISITS_KEY)},String((parseInt(ls.getItem(${S(INSTALL_VISITS_KEY)})||"0",10)||0)+1))}w.__lmInstallDue=!ls.getItem(${S(INSTALL_SHOWN_KEY)})&&(parseInt(ls.getItem(${S(INSTALL_VISITS_KEY)})||"0",10)||0)>=${INSTALL_MIN_VISITS}}catch(e){}w.addEventListener("beforeinstallprompt",function(e){e.preventDefault();w.__lmBip=e;w.dispatchEvent(new Event("lm:bip"))});w.addEventListener("appinstalled",function(){w.__lmBip=null;try{w.localStorage.setItem(${S(INSTALL_SHOWN_KEY)},"installed")}catch(e){}})})();`;
}
