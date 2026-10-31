"use client";
// 로그인 유도 시트 훅 (T4.13, PRD AUTH-07, D-08 "Drawer는 행동을 누른 뒤 지연 로딩"). 비로그인 둘러보기 화면이 쓴다.
//
//   const login = useLoginPrompt();
//   <button onClick={() => login.prompt("save")}>저장</button>
//   {login.sheet}
//
// - 시트(Base UI Drawer 포함)는 prompt()를 처음 부를 때 동적 import한다. 그 전에는 sheet가 null이라
//   홈(/today) 첫 로드 번들에 Drawer가 들어가지 않는다(D-08, g4-comparison 2절 A +33.7KB).
// - 받는 동안은 바닥에 스켈레톤 시트, 받지 못하면(청크 실패, 오프라인) 로그인 전용 화면 링크로 대신한다.
// - 로그인 후 돌아올 곳은 누른 순간의 지금 경로(next). 서버(/auth/sign-in)가 다시 검사한다.
// - 로그인이 닫힌 환경(flags.auth 꺼짐, gate.tsx)에서는 시트를 받지 않고 "로그인은 곧 열립니다" 토스트만 띄운다.
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";
import { authCopy } from "@/copy/auth";
import { cn } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button-classes";
import { notifyLoginSoon, useLoginOpen } from "./gate";
import type { LoginPromptSheetProps } from "./login-prompt-sheet";
import { currentPathForNext, type LoginTrigger } from "./triggers";

const copy = authCopy.prompt;

function SheetFallback({ error }: { error?: unknown }) {
  // 시트는 누른 뒤에만 그려지므로 브라우저에서만 실행된다
  const next =
    typeof window === "undefined"
      ? "/today"
      : currentPathForNext(window.location);
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-(--lm-layout-max-width) flex-col gap-4 rounded-t-sheet bg-popover px-7 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-sheet">
      {error ? (
        <div role="alert" className="flex flex-col gap-3">
          <p className="type-label">{copy.loadFailed}</p>
          <p className="type-caption text-muted-foreground">
            {copy.loadFailedBody}
          </p>
          <Link
            href={`/login?${new URLSearchParams({ next }).toString()}`}
            className={cn(buttonClass("secondary"), "w-full")}
          >
            {copy.goLogin}
          </Link>
        </div>
      ) : (
        <div
          role="status"
          aria-busy
          aria-label={copy.loading}
          className="flex flex-col gap-3"
        >
          <span className="h-3 w-20 rounded-full bg-skeleton" />
          <span className="h-7 w-56 rounded-full bg-skeleton" />
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-12 w-full rounded-md bg-skeleton" />
          ))}
        </div>
      )}
    </div>
  );
}

const LazySheet = dynamic<LoginPromptSheetProps>(
  () => import("./login-prompt-sheet"),
  {
    ssr: false,
    loading: ({ error }) => <SheetFallback error={error} />,
  },
);

/** 선언형으로 쓸 때. open이 처음 true가 될 때까지 시트 코드를 받지 않는다 */
export function LoginPromptSheet(props: LoginPromptSheetProps) {
  const [mounted, setMounted] = useState(props.open);
  if (props.open && !mounted) setMounted(true);
  if (!mounted) return null;
  return <LazySheet {...props} />;
}

type PromptState = { open: boolean; trigger: LoginTrigger; next: string };

export function useLoginPrompt(): {
  prompt: (trigger: LoginTrigger) => void;
  close: () => void;
  sheet: ReactNode;
} {
  const [state, setState] = useState<PromptState | null>(null);
  const loginOpen = useLoginOpen();

  const prompt = useCallback(
    (trigger: LoginTrigger) => {
      if (!loginOpen) {
        notifyLoginSoon();
        return;
      }
      setState({
        open: true,
        trigger,
        next: currentPathForNext(window.location),
      });
    },
    [loginOpen],
  );
  const close = useCallback(
    () => setState((s) => (s ? { ...s, open: false } : s)),
    [],
  );
  const onOpenChange = useCallback(
    (open: boolean) => setState((s) => (s ? { ...s, open } : s)),
    [],
  );

  const sheet = state ? (
    <LoginPromptSheet
      open={state.open}
      trigger={state.trigger}
      next={state.next}
      onOpenChange={onOpenChange}
    />
  ) : null;

  return { prompt, close, sheet };
}
