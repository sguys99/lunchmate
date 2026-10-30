"use client";
// 로그인 유도 시트 실제 구현 확인 (T4.13). 오늘(홈) 실제 화면은 T5에서 만들므로, 지금은 시안의 둘러보기 맥락 화면에
// 실제 useLoginPrompt를 붙여 확인한다. 시트 안 로그인 버튼은 실제 /auth/sign-in으로 간다(개발 환경 로그인).
import { useLoginPrompt } from "@/features/auth/login-prompt";
import { ContextScene } from "./shared/parts";

export function SheetDemo() {
  const login = useLoginPrompt();
  return (
    <div className="@container/screen relative isolate flex min-h-dvh flex-1 flex-col bg-background font-sans text-foreground">
      <main className="mx-auto w-full max-w-(--lm-layout-max-width) px-(--lm-layout-gutter) pt-5 pb-10 desktop:pt-10">
        <ContextScene idPrefix="sheet-demo" onTrigger={login.prompt} />
      </main>
      {login.sheet}
    </div>
  );
}
