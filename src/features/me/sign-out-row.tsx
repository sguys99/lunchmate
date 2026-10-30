"use client";
// 나 탭 "로그아웃" 줄 (T4.27, AUTH-05). /auth/sign-out POST(이 기기만). 계정 관리 화면의 로그아웃과 같은 경로다.
// 오프라인이면 막고(aria-disabled) 줄 안에 안내, 누른 뒤에는 aria-busy.
import { LogOut } from "lucide-react";
import { useState, type FormEvent } from "react";
import { focusRing } from "@/components/ui/interaction";
import { authCopy } from "@/copy/auth";
import { meCopy } from "@/copy/me";
import { useOnlineStatus } from "@/lib/network";
import { cn } from "@/lib/utils";

export function SignOutRow() {
  const online = useOnlineStatus();
  const [busy, setBusy] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    if (!online || busy) {
      e.preventDefault();
      return;
    }
    setBusy(true);
  }

  return (
    <li>
      <form action="/auth/sign-out" method="post" onSubmit={onSubmit}>
        <input type="hidden" name="next" value="/today" />
        <button
          type="submit"
          aria-disabled={!online || busy || undefined}
          aria-busy={busy || undefined}
          className={cn(
            "flex min-h-14 w-full items-center justify-between gap-4 py-3 text-left aria-disabled:opacity-60",
            focusRing,
          )}
        >
          <span className="flex flex-col gap-0.5">
            <span className="type-body">{meCopy.rows.signOut}</span>
            {!online ? (
              <span className="type-caption text-muted-foreground">
                {authCopy.account.offlineBody}
              </span>
            ) : null}
          </span>
          <LogOut
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground"
            strokeWidth={1.75}
          />
        </button>
      </form>
    </li>
  );
}
