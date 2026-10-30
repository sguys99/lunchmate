"use client";
// 계정 화면 뼈대 /me/account (T4.12, PRD AUTH-05, 11.4절). 나 탭 실제 화면(T4.27, T6)이 생기면 그 안으로 옮긴다.
// - 로그아웃: /auth/sign-out POST(이 기기만). 회원 탈퇴: 확인 대화상자 → /auth/delete-account POST(confirm=delete).
// - 포인트 컬러 면 버튼은 없다. 탈퇴는 destructive 테두리 버튼, 대화상자의 최종 버튼도 destructive.
// - 4상태: 처리 중(누른 버튼 aria-busy + 2px 진행 선), 오류(?error=delete, 버튼 위 안내), 오프라인(버튼 aria-disabled + 안내).
//   로딩은 페이지 Suspense 스켈레톤, 빈 상태는 해당 없음.
import { useState, type FormEvent } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { authCopy } from "@/copy/auth";
import { useOnlineStatus } from "@/lib/network";
import { cn } from "@/lib/utils";
import { AuthNote, ProviderMark } from "./auth-parts";
import type { LoginProvider } from "./providers";

const copy = authCopy.account;

export function AccountScreen({
  provider,
  failed,
}: {
  provider: LoginProvider | null;
  failed: boolean;
}) {
  const online = useOnlineStatus();
  const [busy, setBusy] = useState<"signOut" | "delete" | null>(null);

  function guard(kind: "signOut" | "delete") {
    return (e: FormEvent<HTMLFormElement>) => {
      if (!online || busy) {
        e.preventDefault();
        return;
      }
      setBusy(kind);
    };
  }

  return (
    <div className="flex flex-col gap-10 pt-6">
      {provider ? (
        <p className="flex items-center gap-2 type-caption text-muted-foreground">
          <ProviderMark provider={provider} />
          {copy.signedInAs(authCopy.providerNames[provider])}
        </p>
      ) : null}

      {!online ? (
        <AuthNote kind="offline" title={copy.offline} body={copy.offlineBody} />
      ) : failed && !busy ? (
        <AuthNote
          kind="error"
          title={copy.deleteFailed}
          body={copy.deleteFailedBody}
        />
      ) : null}

      <section className="flex flex-col gap-3 border-t border-border pt-5">
        <h2 className="type-label">{copy.signOut}</h2>
        <p className="type-body-sm break-keep text-muted-foreground">
          {copy.signOutBody}
        </p>
        <form action="/auth/sign-out" method="post" onSubmit={guard("signOut")}>
          <input type="hidden" name="next" value="/today" />
          <button
            type="submit"
            aria-disabled={!online || busy !== null || undefined}
            aria-busy={busy === "signOut" || undefined}
            className={cn(buttonClass("secondary"), "w-full desktop:w-auto")}
          >
            {copy.signOut}
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3 border-t border-border pt-5">
        <h2 className="type-label">{copy.deleteSection}</h2>
        <p className="type-body-sm break-keep text-muted-foreground">
          {copy.deleteBody}
        </p>
        <Dialog>
          <DialogTrigger
            aria-disabled={!online || busy !== null || undefined}
            className={cn(buttonClass("destructive"), "w-full desktop:w-auto")}
          >
            {copy.deleteOpen}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{copy.deleteTitle}</DialogTitle>
              <DialogDescription>{copy.deleteConfirmBody}</DialogDescription>
            </DialogHeader>
            {busy === "delete" ? (
              <AuthNote kind="progress" title={copy.deleting} />
            ) : null}
            <form
              action="/auth/delete-account"
              method="post"
              onSubmit={guard("delete")}
            >
              <input type="hidden" name="confirm" value="delete" />
              <DialogFooter className="mt-0">
                <button
                  type="submit"
                  aria-disabled={!online || busy !== null || undefined}
                  aria-busy={busy === "delete" || undefined}
                  className={buttonClass("destructive")}
                >
                  {copy.deleteConfirm}
                </button>
                <DialogClose className={buttonClass("secondary")}>
                  {copy.cancel}
                </DialogClose>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}
