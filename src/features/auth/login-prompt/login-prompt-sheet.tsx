"use client";
// 비로그인 둘러보기 중 로그인 유도 시트 (T4.13, PRD AUTH-07, D-08 A 시트, DESIGN.md 5장 "로그인과 약관" 유도 시트 내용).
// 이 파일은 useLoginPrompt가 행동을 누른 뒤에 동적 import한다(Base UI Drawer를 홈 첫 로드 밖에 둔다).
// - 내용: 눈썹(누른 행동) → 제목(title 세리프) → 이유 → 브랜드 버튼 3개 → "계속 둘러보기"와 돌아오기 문구.
// - 브랜드 버튼은 /auth/sign-in POST 폼(next = 지금 경로, AUTH-03). 약관은 로그인 뒤 전용 화면(/welcome/terms)에서 받는다.
// - 인앱이면 카카오 한 줄 안내를 더하고, 구글은 OAuth 대신 전용 인앱 안내 화면(/login?view=inapp)으로 보낸다(AUTH-04).
// - 바텀시트 규칙: 위 라운드 28, 뒤 딤, 열림 sheet 스프링 근사 300ms(CSS), 초점 가둠, 닫히면 누른 버튼으로 초점 복귀.
//   데스크톱(1024 이상)은 가운데 카드(최대 26rem).
// - 4상태: 이동 중(busy + 2px 선), 오프라인(버튼 aria-disabled + 안내). 로딩은 이 파일을 받는 동안 useLoginPrompt가 맡고,
//   오류(청크 실패)도 useLoginPrompt가 로그인 화면 링크로 대신한다. 빈 상태는 해당 없음.
import { CornerDownLeft, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHandle,
  DrawerPopup,
  DrawerPortal,
  DrawerTitle,
  DrawerViewport,
} from "@/components/ui/drawer";
import { focusRing } from "@/components/ui/interaction";
import { authCopy } from "@/copy/auth";
import { detectInApp, googleBlocked } from "@/lib/inapp";
import { useOnlineStatus } from "@/lib/network";
import { cn } from "@/lib/utils";
import { AuthNote, ProviderMark } from "../auth-parts";
import { BrandLoginButton } from "../brand-button";
import {
  isLoginProvider,
  LOGIN_PROVIDERS,
  type LoginProvider,
} from "../providers";
import type { LoginTrigger } from "./triggers";
import "../auth.css";

const copy = authCopy;
const ID = "login-prompt";

const iconButton = cn(
  "inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
  focusRing,
);

export type LoginPromptSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: LoginTrigger;
  /** 로그인 후 돌아올 내부 경로(지금 화면) */
  next: string;
};

export default function LoginPromptSheet({
  open,
  onOpenChange,
  trigger,
  next,
}: LoginPromptSheetProps) {
  const online = useOnlineStatus();
  const router = useRouter();
  const [pending, setPending] = useState<LoginProvider | null>(null);
  const [inApp] = useState(() =>
    typeof navigator === "undefined" ? null : detectInApp(navigator.userAgent),
  );
  const blockedApp = googleBlocked(inApp) ? inApp : null;
  const reason = copy.prompt.reasons[trigger];
  const googleNoteId = `${ID}-google-inapp`;

  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setPending(null);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const provider = (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
      "value",
    );
    if (!online || pending || !isLoginProvider(provider)) {
      e.preventDefault();
      return;
    }
    if (provider === "google" && blockedApp) {
      // 인앱 안내는 전용 화면(D-08). 외부 열기 시도와 수동 안내를 그 화면이 맡는다
      e.preventDefault();
      const u = new URLSearchParams({ next, view: "inapp" });
      router.push(`/login?${u.toString()}`);
      return;
    }
    setPending(provider);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPortal>
        <DrawerBackdrop className="z-40" />
        <DrawerViewport className="z-50 min-[64rem]:items-center">
          <DrawerPopup
            className={cn(
              "max-h-[calc(100%-3rem)] data-ending-style:duration-(--lm-duration-fast) data-ending-style:ease-exit",
              "min-[64rem]:max-h-[calc(100%-6rem)] min-[64rem]:max-w-[26rem] min-[64rem]:rounded-sheet min-[64rem]:border min-[64rem]:border-border min-[64rem]:shadow-none",
            )}
          >
            <DrawerHandle className="mt-3 mb-0 h-1 w-9 min-[64rem]:hidden" />
            <div className="flex h-12 shrink-0 items-center justify-end px-3 min-[64rem]:mt-3">
              <DrawerClose
                aria-label={copy.prompt.close}
                className={iconButton}
              >
                <X aria-hidden className="size-5" strokeWidth={1.5} />
              </DrawerClose>
            </div>
            <DrawerContent className="px-7 max-[23.75rem]:px-5">
              <div className="flex flex-col gap-7 pt-1">
                <div className="flex flex-col gap-3">
                  <p className="type-caption text-muted-foreground">
                    {reason.eyebrow}
                  </p>
                  <DrawerTitle className="text-balance">
                    {reason.title}
                  </DrawerTitle>
                  <DrawerDescription className="break-keep">
                    {reason.body}
                  </DrawerDescription>
                </div>

                <form
                  action="/auth/sign-in"
                  method="post"
                  onSubmit={onSubmit}
                  className="flex flex-col gap-3"
                >
                  <input type="hidden" name="next" value={next} />
                  {!online ? (
                    <AuthNote kind="offline" {...copy.states.offline} />
                  ) : pending ? (
                    <AuthNote
                      kind="progress"
                      title={copy.states.redirecting.title(
                        copy.providerNames[pending],
                      )}
                      body={copy.states.redirecting.body}
                    />
                  ) : null}
                  {blockedApp ? (
                    <p className="flex items-center gap-2 type-caption break-keep text-foreground">
                      <ProviderMark provider="kakao" />
                      {copy.inapp.kakaoHint(copy.inapp.appNames[blockedApp])}
                    </p>
                  ) : null}
                  <ul
                    aria-label={copy.login.groupLabel}
                    className="flex flex-col gap-2.5"
                  >
                    {LOGIN_PROVIDERS.map((id) => (
                      <li key={id}>
                        <BrandLoginButton
                          type="submit"
                          provider={id}
                          blocked={
                            !online || (pending !== null && pending !== id)
                          }
                          busy={pending === id}
                          describedBy={
                            blockedApp && id === "google"
                              ? googleNoteId
                              : undefined
                          }
                        />
                      </li>
                    ))}
                  </ul>
                  {blockedApp ? (
                    <p
                      id={googleNoteId}
                      className="type-caption break-keep text-muted-foreground"
                    >
                      {copy.inapp.googleNote(copy.inapp.appNames[blockedApp])}
                    </p>
                  ) : null}
                </form>

                <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
                  <p className="flex items-center gap-2 type-caption break-keep text-muted-foreground">
                    <CornerDownLeft
                      aria-hidden
                      className="size-3.5 shrink-0"
                      strokeWidth={1.5}
                    />
                    {copy.login.returnNote}
                  </p>
                  <DrawerClose
                    className={cn(
                      "inline-flex h-11 shrink-0 items-center type-caption text-foreground underline decoration-muted-foreground underline-offset-3",
                      focusRing,
                    )}
                  >
                    {copy.prompt.keepBrowsing}
                  </DrawerClose>
                </div>
              </div>
            </DrawerContent>
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  );
}
