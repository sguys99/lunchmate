"use client";
// 로그인이 열려 있는지(flags.auth) 클라이언트 화면에 알리는 컨텍스트 (5단계 마무리, 2026-10-31).
//
// 왜: flags.auth는 productionOff라 브라우저에서 isEnabled("auth")가 항상 false다(lib/flags.ts). 그래서 서버((app) 레이아웃)가
// 판정한 값을 이 컨텍스트로 내려 준다. 로그인이 닫힌 환경(프로덕션)에서는
// - useLoginPrompt().prompt()와 홈의 저장 유도가 로그인 시트(→ /auth/sign-in 404) 대신 "로그인은 곧 열립니다" 토스트를 띄우고,
// - 회사 위치 저장 같은 로그인 전용 행동 버튼과 지도 즐겨찾기 칩은 숨긴다(useLoginOpen()).
// 토스트 문구(copy/soon)는 누른 뒤에 받는다(홈 첫 로드 예산).
// 공급자 밖(디자인 랩)은 기본값 true로 지금까지와 같이 동작한다.
import { createContext, useContext, type ReactNode } from "react";
import { toast } from "@/components/ui/lazy-toaster";

const LoginOpenContext = createContext(true);

export function LoginGateProvider({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  return (
    <LoginOpenContext.Provider value={open}>
      {children}
    </LoginOpenContext.Provider>
  );
}

/** 로그인(가입, 저장)이 열려 있는지. 서버가 판정한 flags.auth */
export function useLoginOpen(): boolean {
  return useContext(LoginOpenContext);
}

/** 로그인이 닫힌 환경에서 로그인 유도 대신 띄우는 조용한 안내. 같은 id라 여러 번 눌러도 하나만 뜬다 */
export function notifyLoginSoon(): void {
  void import("@/copy/soon").then(({ soonCopy }) =>
    toast(soonCopy.toast.title, {
      id: "login-soon",
      description: soonCopy.toast.body,
    }),
  );
}
