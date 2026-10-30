"use client";
// 로그인 전용 화면 /login (T4.6~T4.10, DESIGN.md 5장 "로그인과 약관", D-08 시안 B "전용 화면").
// 한 컴포넌트가 두 화면을 가진다: 로그인 방법(login)과 인앱 구글 안내(inapp, T4.10, AUTH-04, AC-AUTH-2).
//
// - 브랜드 버튼은 /auth/sign-in으로 POST하는 폼의 제출 버튼이다. supabase-js를 브라우저에 싣지 않는다.
//   JS가 없어도 폼 제출로 로그인이 된다. 인앱에서 JS 없이 구글을 누르면 서버가 안내 화면(?view=inapp)으로 돌려보낸다.
// - 인앱(서버가 UA로 판정해 넘김)이면 카카오를 맨 위에 두고 "카카오톡에서는 카카오 로그인이 가장 빠릅니다." 한 줄.
//   구글을 누르면 OAuth로 보내지 않고, 사용자 탭 안에서 동기로 외부 브라우저 열기를 시도한다
//   (카카오톡은 iOS와 Android 모두 kakaotalk://web/openExternal, D-08 안건 10). 1.5초 뒤에도 화면이 보이면 실패로 보고
//   수동 안내(메뉴 위치 그림 + 단계 3줄 + 링크 복사 + 카카오 로그인)를 보인다. 자동 열기 수단이 없는 앱은 바로 안내.
// - 4상태: 이동 중(누른 버튼 busy + 2px 진행 선), 오류와 취소(콜백이 붙인 ?error=), 오프라인(버튼 aria-disabled),
//   빈 상태는 해당 없음. 로딩 스켈레톤은 필요 없다(서버가 바로 그린다).
// - 제공자 화면에서 뒤로 오면(bfcache) 이동 중 표시를 지운다.
import { ArrowLeft, CornerDownLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing } from "@/components/ui/interaction";
import {
  authCopy,
  type AuthLoginContext,
  type AuthLoginError,
} from "@/copy/auth";
import {
  externalOpenUrl,
  googleBlocked,
  inAppGuide,
  type InApp,
  type MobileOs,
} from "@/lib/inapp";
import { useOnlineStatus } from "@/lib/network";
import { cn } from "@/lib/utils";
import {
  AuthFrame,
  AuthNote,
  BottomZone,
  InAppSteps,
  MenuDiagram,
  ProviderMark,
} from "./auth-parts";
import { BrandLoginButton } from "./brand-button";
import { copyText } from "./copy-link";
import type { LoginView } from "./login-params";
import {
  isLoginProvider,
  LOGIN_PROVIDERS,
  type LoginProvider,
} from "./providers";
import { useFocusOnChange } from "./use-focus-on-change";

const copy = authCopy;
const SIGN_IN_ACTION = "/auth/sign-in";
/** 외부 열기를 시도한 뒤에도 화면이 보이면 수동 안내로 바꾸는 시간 (research-notes T0.17) */
const EXTERNAL_FALLBACK_MS = 1500;

const iconButton = cn(
  "inline-flex size-11 items-center justify-center rounded-full text-foreground hover:bg-muted",
  focusRing,
);

export type LoginScreenProps = {
  /** 검사를 마친 내부 경로 */
  next: string;
  context: AuthLoginContext;
  error: AuthLoginError | null;
  /** 서버가 UA로 판정한 인앱 브라우저 (개발 환경은 쿼리로 흉내 가능) */
  inApp: InApp | null;
  os: MobileOs | null;
  view: LoginView;
};

type CopyState = "idle" | "done" | "failed";

export function LoginScreen({
  next,
  context,
  error,
  inApp,
  os,
  view: initialView,
}: LoginScreenProps) {
  const online = useOnlineStatus();
  const [pending, setPending] = useState<LoginProvider | null>(null);
  const blockedApp = googleBlocked(inApp) ? inApp : null;
  const [view, setView] = useState<LoginView>(
    initialView === "inapp" && blockedApp ? "inapp" : "login",
  );
  const [opening, setOpening] = useState(false);
  const [openFailed, setOpenFailed] = useState(false);
  const [copied, setCopied] = useState<CopyState>("idle");
  const timer = useRef<number | null>(null);
  const titleRef = useFocusOnChange<HTMLHeadingElement>(view);

  useEffect(() => {
    // 제공자 화면에서 브라우저 뒤로 가기로 돌아오면 페이지가 bfcache에서 그대로 살아난다.
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setPending(null);
        setOpening(false);
      }
    };
    window.addEventListener("pageshow", onShow);
    return () => {
      window.removeEventListener("pageshow", onShow);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  /** 외부 브라우저에서 열 주소: 같은 로그인 화면(next 유지). 열린 브라우저에서 구글을 다시 누른다 */
  function reopenUrl(): string {
    const u = new URL("/login", window.location.origin);
    u.searchParams.set("next", next);
    return u.toString();
  }

  /** 반드시 사용자 탭 이벤트 안에서 동기로 부른다(스킴 이동은 사용자 제스처가 있어야 한다) */
  function openExternal() {
    if (!blockedApp || !online || opening) return;
    const url = externalOpenUrl(blockedApp, os, reopenUrl());
    if (!url) {
      setView("inapp");
      return;
    }
    setOpenFailed(false);
    setOpening(true);
    window.location.href = url;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setOpening(false);
      setView("inapp");
      if (document.visibilityState === "visible") setOpenFailed(true);
    }, EXTERNAL_FALLBACK_MS);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const provider = submitter?.getAttribute("value");
    if (!online || pending || opening || !isLoginProvider(provider)) {
      e.preventDefault();
      return;
    }
    if (provider === "google" && blockedApp) {
      // AC-AUTH-2: 인앱에서 구글 OAuth 오류 화면 대신 외부 브라우저 열기와 안내
      e.preventDefault();
      openExternal();
      return;
    }
    setPending(provider);
  }

  async function onCopy() {
    const ok = await copyText(reopenUrl());
    setCopied(ok ? "done" : "failed");
  }

  if (view === "inapp" && blockedApp) {
    const guide = inAppGuide(blockedApp, os);
    const appName = copy.inapp.appNames[blockedApp];
    return (
      <AuthFrame
        mainKey="inapp"
        animate
        asideHidden={false}
        aside={
          <MenuDiagram guide={guide} size="lg" className="w-full max-w-88" />
        }
        headerStart={
          <button
            type="button"
            onClick={() => setView("login")}
            aria-label={copy.inapp.back}
            className={iconButton}
          >
            <ArrowLeft aria-hidden className="size-5" strokeWidth={1.5} />
          </button>
        }
      >
        <div className="flex flex-col gap-7 pt-4 pb-8 desktop:pt-0">
          <div className="flex flex-col gap-3">
            <p className="type-caption text-muted-foreground">
              {appName}
              <span
                aria-hidden
                className="mx-2 inline-block h-3 w-px bg-border align-middle"
              />
              {copy.inapp.eyebrow}
            </p>
            <h1
              ref={titleRef}
              tabIndex={-1}
              className="type-title text-balance break-keep outline-none"
            >
              {copy.inapp.title}
            </h1>
            <p className="type-body-sm break-keep text-muted-foreground">
              {copy.inapp.body(appName)}
            </p>
          </div>

          {!online ? (
            <AuthNote
              kind="offline"
              title={copy.states.offline.title}
              body={copy.inapp.offlineBody}
            />
          ) : opening ? (
            <AuthNote
              kind="progress"
              title={copy.inapp.opening}
              body={copy.inapp.openingBody}
            />
          ) : openFailed ? (
            <AuthNote
              kind="error"
              title={copy.inapp.openFailed}
              body={copy.inapp.openFailedBody}
            />
          ) : null}

          <div className="flex flex-col gap-6">
            <MenuDiagram guide={guide} size="sm" className="desktop:hidden" />
            <InAppSteps guide={guide} />
          </div>
        </div>

        <BottomZone>
          <CopyStatus
            state={copied}
            url={copied === "failed" ? reopenUrl() : null}
          />
          {/* 다시 열기와 링크 복사는 한 줄에 둔다(엄지 자리에 단계 안내와 카카오 로그인이 함께 보이게) */}
          <div className="flex gap-2">
            {guide.canAutoOpen ? (
              <button
                type="button"
                onClick={openExternal}
                aria-disabled={!online || opening || undefined}
                aria-busy={opening || undefined}
                className={cn(buttonClass("primary"), "min-w-0 flex-[3] px-3")}
              >
                {copy.inapp.openExternal}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void onCopy()}
              className={cn(buttonClass("secondary"), "min-w-0 flex-[2] px-3")}
            >
              {copy.inapp.copyLink}
            </button>
          </div>
          <div className="flex items-center gap-3 py-1" aria-hidden>
            <span className="h-px flex-1 bg-border" />
            <span className="type-caption text-muted-foreground">
              {copy.inapp.orKakao}
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <form action={SIGN_IN_ACTION} method="post" onSubmit={onSubmit}>
            <input type="hidden" name="next" value={next} />
            <BrandLoginButton
              type="submit"
              provider="kakao"
              blocked={!online || (pending !== null && pending !== "kakao")}
              busy={pending === "kakao"}
            />
          </form>
        </BottomZone>
      </AuthFrame>
    );
  }

  const reason = copy.login.contexts[context];
  const googleNoteId = "login-google-inapp";

  return (
    <AuthFrame
      mainKey="login"
      animate={initialView === "inapp"}
      aside={
        <div className="flex flex-col gap-10">
          <p className="type-display text-balance break-keep">
            {copy.login.benefitsLabel}
          </p>
          <Benefits size="lg" />
        </div>
      }
      headerStart={
        <Link
          href="/today"
          aria-label={copy.login.backLabel}
          className={iconButton}
        >
          <ArrowLeft aria-hidden className="size-5" strokeWidth={1.5} />
        </Link>
      }
    >
      <div className="flex flex-col gap-8 pt-4 pb-10 desktop:pt-0 desktop:pb-0">
        {reason.eyebrow ? <p className="type-label">{reason.eyebrow}</p> : null}
        <div className="flex flex-col gap-4">
          <h1
            ref={titleRef}
            tabIndex={-1}
            className="type-title text-balance break-keep outline-none"
          >
            {reason.title}
          </h1>
          <p className="type-body break-keep text-muted-foreground">
            {reason.body}
          </p>
        </div>
        <div className="desktop:hidden">
          <Benefits size="sm" />
        </div>
      </div>

      <form
        action={SIGN_IN_ACTION}
        method="post"
        onSubmit={onSubmit}
        className="sticky bottom-0 -mx-(--lm-layout-gutter) mt-auto flex flex-col gap-3 bg-background px-(--lm-layout-gutter) pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] desktop:static desktop:mx-0 desktop:mt-0 desktop:px-0 desktop:pt-8"
      >
        <input type="hidden" name="next" value={next} />
        <Status
          online={online}
          pending={pending}
          opening={opening}
          error={error}
        />
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
                  !online || opening || (pending !== null && pending !== id)
                }
                busy={pending === id || (id === "google" && opening)}
                describedBy={
                  blockedApp && id === "google" ? googleNoteId : undefined
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
        <p className="flex items-center justify-center gap-2 pt-1 type-caption text-muted-foreground">
          <CornerDownLeft aria-hidden className="size-3.5" strokeWidth={1.5} />
          {copy.login.returnNote}
        </p>
      </form>
    </AuthFrame>
  );
}

function Benefits({ size }: { size: "sm" | "lg" }) {
  return (
    <dl
      className={cn(
        "flex flex-col divide-y divide-border border-y border-border",
        size === "lg" && "max-w-[24rem]",
      )}
    >
      {copy.login.benefits.map((b) => (
        <div
          key={b.title}
          className={cn(
            "flex items-baseline",
            size === "lg" ? "gap-6 py-4" : "gap-5 py-3",
          )}
        >
          <dt
            className={cn(
              "shrink-0",
              size === "lg"
                ? "w-14 type-label"
                : "w-12 type-caption text-foreground",
            )}
          >
            {b.title}
          </dt>
          <dd
            className={cn(
              "text-muted-foreground",
              size === "lg" ? "type-body-sm" : "type-caption",
            )}
          >
            {b.body}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** 버튼 위 상태 한 줄. 우선순위: 오프라인 > 이동 중 > 외부 브라우저 여는 중 > 오류/취소 */
function Status({
  online,
  pending,
  opening,
  error,
}: {
  online: boolean;
  pending: LoginProvider | null;
  opening: boolean;
  error: AuthLoginError | null;
}) {
  if (!online) return <AuthNote kind="offline" {...copy.states.offline} />;
  if (pending) {
    return (
      <AuthNote
        kind="progress"
        title={copy.states.redirecting.title(copy.providerNames[pending])}
        body={copy.states.redirecting.body}
      />
    );
  }
  if (opening) {
    return (
      <AuthNote
        kind="progress"
        title={copy.inapp.opening}
        body={copy.inapp.openingBody}
      />
    );
  }
  if (error === "failed")
    return <AuthNote kind="error" {...copy.states.error} />;
  if (error === "cancelled")
    return <AuthNote kind="info" {...copy.states.cancelled} />;
  return null;
}

/** 링크 복사 결과. 실패하면 주소를 선택 가능한 글자로 보여 준다(길게 눌러 복사) */
function CopyStatus({ state, url }: { state: CopyState; url: string | null }) {
  if (state === "idle") return null;
  if (state === "done") {
    return (
      <p role="status" className="type-caption break-keep text-foreground">
        {copy.inapp.copied}
      </p>
    );
  }
  return (
    <div role="alert" className="flex flex-col gap-2">
      <p className="type-caption break-keep text-muted-foreground">
        {copy.inapp.copyFailed}
      </p>
      {url ? (
        <input
          readOnly
          value={url}
          aria-label={copy.inapp.linkLabel}
          onFocus={(e) => e.currentTarget.select()}
          className={cn(
            "h-11 w-full rounded-md border border-border bg-card px-3 type-caption text-foreground",
            focusRing,
          )}
        />
      ) : null}
    </div>
  );
}
