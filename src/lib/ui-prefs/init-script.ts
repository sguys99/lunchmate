// 첫 페인트 전 화면 설정 적용 (T4.25, SET-04). 루트 layout의 <head>에 인라인으로 넣는다.
// React가 붙기 전에 <html>에 .light/.dark와 data-motion을 달아 다크 깜빡임(FOUC)을 막는다.
// 값을 읽지 못하면(사생활 보호 모드, 저장소 차단, 깨진 JSON) 아무것도 하지 않는다 = 시스템 설정을 따른다.
// applyUiPrefs(prefs.ts)와 같은 규칙이어야 한다(init-script.test.ts가 두 결과를 비교한다).
import { UI_PREFS_STORAGE_KEY } from "./prefs";

export const UI_PREFS_INIT_SCRIPT = `(function(){try{var s=JSON.parse(window.localStorage.getItem(${JSON.stringify(
  UI_PREFS_STORAGE_KEY,
)})||"null");var p=(s&&s.state)||{};var r=document.documentElement;if(p.theme==="light"||p.theme==="dark"){r.classList.add(p.theme)}if(p.reduceMotion===true){r.dataset.motion="reduce"}}catch(e){}})();`;
