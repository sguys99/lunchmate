"use client";
// 랜딩 행동 칸: 추천 체험 + 소셜 로그인 + 약관 위치 (T4.28, DESIGN.md 5장 "랜딩", PRD APP-04, AUTH-01, AUTH-04).
//
// - 추천 체험("추천 먼저 받아 보기")은 화면의 유일한 primary다. 비로그인 둘러보기(AUTH-07)인 /today로 간다.
// - 로그인은 /login과 같은 방식: 브랜드 버튼이 /auth/sign-in으로 POST하는 폼의 제출 버튼이다(supabase-js를 싣지 않음,
//   JS 없이도 동작). 돌아올 곳은 /today(로그인 콜백이 약관, 온보딩으로 먼저 보낸다).
// - 인앱 브라우저(UA, src/lib/inapp.ts)면 카카오를 권하는 한 줄과 구글 안내를 붙인다. 구글을 누르면 서버(/auth/sign-in)가
//   OAuth 대신 /login?view=inapp 안내 화면으로 보낸다(AC-AUTH-2). 외부 브라우저 자동 열기는 그 화면이 맡는다.
// - 오프라인: 체험과 로그인 버튼을 aria-disabled로 막고 위에 안내(아이콘 + 글자). 로그인 오류와 취소는 콜백이
//   /login?error=로 보내 그 화면이 다음 행동을 안내한다(랜딩에서 토스트를 띄우지 않아 sonner도 싣지 않는다).
// - 플래그(서버 판정)가 꺼진 프로덕션: 앱(/today)과 로그인(/login, /auth/*)이 404라 버튼 대신 "출시 준비" 안내만 둔다.
// - 제공자 화면에서 뒤로 오면(bfcache) 이동 중 표시를 지운다.
import { ArrowRight, Clock, WifiOff } from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing, hitArea44 } from "@/components/ui/interaction";
import { authCopy } from "@/copy/auth";
import { landingCopy } from "@/copy/landing";
import { BrandLoginButton } from "@/features/auth/brand-button";
import {
  isLoginProvider,
  LOGIN_PROVIDERS,
  type LoginProvider,
} from "@/features/auth/providers";
import { detectInApp, googleBlocked, type InApp } from "@/lib/inapp";
import { useOnlineStatus } from "@/lib/network";
import { cn } from "@/lib/utils";
import {
  LANDING_LOGIN_ANCHOR,
  LANDING_NEXT,
  SIGN_IN_ACTION,
  TRY_HREF,
} from "./paths";

const copy = landingCopy;
const OFFLINE_ID = "landing-offline-note";
const GOOGLE_NOTE_ID = "landing-google-inapp";

const noop = () => () => {};

/** 인앱 판정은 마운트 뒤 UA로 한다(정적 HTML을 유지해 첫 로드를 가볍게. 서버 렌더와 첫 렌더는 null) */
function useInApp(override: InApp | null | undefined): InApp | null {
  const detected = useSyncExternalStore(
    noop,
    () => detectInApp(navigator.userAgent),
    () => null,
  );
  return override ?? detected;
}

export type LandingActionsProps = {
  /** 서버가 판정한 appShell 플래그. 꺼져 있으면 /today가 404라 체험 버튼을 두지 않는다 */
  appEnabled: boolean;
  /** 서버가 판정한 auth 플래그. 꺼져 있으면 /auth/sign-in이 404라 로그인 버튼을 두지 않는다 */
  authEnabled: boolean;
  /** design-lab 확인 화면용 상태 흉내 */
  preview?: { offline?: boolean; inApp?: InApp | null };
  className?: string;
};

export function LandingActions({
  appEnabled,
  authEnabled,
  preview,
  className,
}: LandingActionsProps) {
  const online = useOnlineStatus();
  const offline = preview?.offline === true || !online;
  const inApp = useInApp(preview?.inApp);

  if (!appEnabled && !authEnabled) {
    return <ComingSoon className={className} />;
  }

  return (
    <section className={cn("flex flex-col gap-4", className)}>
      {offline ? <OfflineNote className="pb-1" /> : null}
      {appEnabled ? <TryBlock offline={offline} /> : null}
      {authEnabled ? (
        <>
          <LoginDivider
            id={LANDING_LOGIN_ANCHOR}
            className={cn("scroll-mt-6", appEnabled && "pt-2")}
          />
          <SocialLogin offline={offline} inApp={inApp} />
          <TermsNote className="pt-1" />
        </>
      ) : null}
    </section>
  );
}

function TryBlock({ offline }: { offline: boolean }) {
  const t = copy.try;
  const className = cn(buttonClass("primary"), "w-full");
  return (
    <div className="flex flex-col gap-2">
      <p className="type-body-sm text-foreground">{t.hint}</p>
      {offline ? (
        <button
          type="button"
          aria-disabled
          aria-describedby={OFFLINE_ID}
          className={cn(className, "cursor-not-allowed")}
        >
          {t.cta}
          <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
        </button>
      ) : (
        <Link href={TRY_HREF} className={className}>
          {t.cta}
          <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
        </Link>
      )}
      <p className="type-caption text-muted-foreground">{t.note}</p>
    </div>
  );
}

function SocialLogin({
  offline,
  inApp,
}: {
  offline: boolean;
  inApp: InApp | null;
}) {
  const [pending, setPending] = useState<LoginProvider | null>(null);
  const blockedApp = googleBlocked(inApp) ? inApp : null;

  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setPending(null);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const provider = submitter?.getAttribute("value");
    if (offline || pending || !isLoginProvider(provider)) {
      e.preventDefault();
      return;
    }
    setPending(provider);
  }

  return (
    <form
      action={SIGN_IN_ACTION}
      method="post"
      onSubmit={onSubmit}
      className="flex flex-col gap-2.5"
    >
      <input type="hidden" name="next" value={LANDING_NEXT} />
      {blockedApp ? (
        <p className="type-caption break-keep text-foreground">
          {authCopy.inapp.kakaoHint(authCopy.inapp.appNames[blockedApp])}
        </p>
      ) : null}
      <ul aria-label={copy.login.groupLabel} className="flex flex-col gap-2.5">
        {LOGIN_PROVIDERS.map((id) => (
          <li key={id}>
            <BrandLoginButton
              type="submit"
              provider={id}
              blocked={offline || (pending !== null && pending !== id)}
              busy={pending === id}
              describedBy={
                offline
                  ? OFFLINE_ID
                  : blockedApp && id === "google"
                    ? GOOGLE_NOTE_ID
                    : undefined
              }
            />
          </li>
        ))}
      </ul>
      {blockedApp ? (
        <p
          id={GOOGLE_NOTE_ID}
          className="type-caption break-keep text-muted-foreground"
        >
          {authCopy.inapp.googleNote(authCopy.inapp.appNames[blockedApp])}
        </p>
      ) : null}
    </form>
  );
}

/** 오프라인 안내. 빨간 면 없이 아이콘과 글자만(DESIGN.md 2장 의미 색). */
function OfflineNote({ className }: { className?: string }) {
  return (
    <div
      id={OFFLINE_ID}
      role="status"
      className={cn("flex items-start gap-3", className)}
    >
      <WifiOff
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.5}
      />
      <div className="flex flex-col gap-0.5">
        <p className="type-label">{copy.offline.title}</p>
        <p className="type-caption break-keep text-muted-foreground">
          {copy.offline.body}
        </p>
      </div>
    </div>
  );
}

/** 플래그가 꺼진 환경(프로덕션)의 안내. 오프라인 안내와 같은 말투(아이콘 + 글자) */
function ComingSoon({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "flex items-start gap-3 border-t border-border pt-6",
        className,
      )}
    >
      <Clock
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.5}
      />
      <div className="flex flex-col gap-0.5">
        <p className="type-label">{copy.soon.title}</p>
        <p className="type-caption break-keep text-muted-foreground">
          {copy.soon.body}
        </p>
      </div>
    </section>
  );
}

/** 로그인 버튼 위 구분 줄: 가는 선 사이 caption 한 줄 */
function LoginDivider({ className, id }: { className?: string; id?: string }) {
  return (
    <div
      id={id}
      className={cn(
        "flex items-center gap-3 type-caption text-muted-foreground",
        className,
      )}
    >
      <span aria-hidden className="h-px flex-1 bg-border" />
      <span>{copy.login.divider}</span>
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  );
}

// 문장 안 링크라 글자 크기는 그대로 두고 터치 영역만 44px로 넓힌다(T3.5)
const termsLink = cn(
  hitArea44,
  "text-foreground underline decoration-muted-foreground underline-offset-3 hover:decoration-foreground",
  focusRing,
);

/** 약관 위치 안내. 동의는 로그인 뒤 약관 화면(/welcome/terms, AUTH-02)에서 받는다 */
function TermsNote({ className }: { className?: string }) {
  const t = copy.login.terms;
  return (
    <p
      className={cn("type-caption break-keep text-muted-foreground", className)}
    >
      {t.before}
      <Link href="/terms" className={termsLink}>
        {t.termsLink}
      </Link>
      {t.middle}
      <Link href="/privacy" className={termsLink}>
        {t.privacyLink}
      </Link>
      {t.after}
    </p>
  );
}
