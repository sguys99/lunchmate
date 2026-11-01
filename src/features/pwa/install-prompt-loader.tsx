"use client";
// 설치 유도 청크 지연 로더 (T8.2, APP-01). 앱 셸((app)/layout)에 한 번 둔다.
// 루트 인라인 스크립트(install-script.ts)가 정한 window.__lmInstallDue가 참일 때만, 첫 화면이 그려진 뒤
// 5초를 기다려(추천 요청, 글꼴과 겹치지 않게) install-prompt 청크를 받는다. 조건이 거짓이면 아무것도 받지 않는다(홈 첫 로드 JS 예산, CLAUDE.md 9장).
import { useEffect } from "react";

export function InstallPromptLoader() {
  useEffect(() => {
    if (!(window as { __lmInstallDue?: boolean }).__lmInstallDue) return;
    const t = setTimeout(() => {
      void import("./install-prompt").then((m) => m.runInstallPrompt());
    }, 5000);
    return () => clearTimeout(t);
  }, []);
  return null;
}
