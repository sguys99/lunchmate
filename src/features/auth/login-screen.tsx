"use client";
// 로그인 전용 화면 /login (T4.6~T4.9, DESIGN.md 5장 "로그인과 약관", D-08 시안 B "전용 화면").
// 시안 코드(features/design-lab/auth/b)에서 로그인 단계만 옮겼다. 약관(T4.11)과 인앱 안내(T4.10)는 이 틀에 다음 화면으로 붙는다.
//
// - 브랜드 버튼 3개는 /auth/sign-in으로 POST하는 폼의 제출 버튼이다. supabase-js를 브라우저에 싣지 않는다.
//   JS가 없어도 폼 제출로 로그인이 된다(이 컴포넌트는 이동 중 표시와 오프라인 막기만 더한다).
// - 4상태: 이동 중(누른 버튼 busy + 2px 진행 선, 스피너 없음), 오류와 취소(콜백이 붙인 ?error=), 오프라인(버튼 aria-disabled),
//   빈 상태는 해당 없음(정적 화면). 로딩 스켈레톤은 필요 없다(서버가 바로 그린다).
// - 제공자 화면에서 뒤로 오면(bfcache) 이동 중 표시를 지운다.
import {
  ArrowLeft,
  CornerDownLeft,
  AlertCircle,
  Info,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { focusRing } from "@/components/ui/interaction";
import {
  authCopy,
  type AuthLoginContext,
  type AuthLoginError,
} from "@/copy/auth";
import { useOnlineStatus } from "@/lib/network";
import { cn } from "@/lib/utils";
import { BrandLoginButton } from "./brand-button";
import {
  isLoginProvider,
  LOGIN_PROVIDERS,
  type LoginProvider,
} from "./providers";

const copy = authCopy;
const SIGN_IN_ACTION = "/auth/sign-in";

export type LoginScreenProps = {
  /** 검사를 마친 내부 경로 */
  next: string;
  context: AuthLoginContext;
  error: AuthLoginError | null;
};

export function LoginScreen({ next, context, error }: LoginScreenProps) {
  const online = useOnlineStatus();
  const [pending, setPending] = useState<LoginProvider | null>(null);

  useEffect(() => {
    // 제공자 화면에서 브라우저 뒤로 가기로 돌아오면 페이지가 bfcache에서 그대로 살아난다.
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setPending(null);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const provider = submitter?.getAttribute("value");
    if (!online || pending || !isLoginProvider(provider)) {
      e.preventDefault();
      return;
    }
    setPending(provider);
  }

  const reason = copy.login.contexts[context];

  return (
    <div className="@container/screen relative isolate flex min-h-dvh flex-1 flex-col bg-background font-sans text-foreground">
      <div className="flex min-h-dvh flex-1 flex-col desktop:grid desktop:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <aside
          aria-hidden
          className="hidden desktop:flex desktop:flex-col desktop:justify-between desktop:border-r desktop:border-border desktop:bg-card desktop:px-16 desktop:py-12"
        >
          <Wordmark />
          <div className="flex flex-col gap-10">
            <p className="type-display text-balance break-keep">
              {copy.login.benefitsLabel}
            </p>
            <Benefits size="lg" />
          </div>
          <span />
        </aside>

        <div className="flex min-h-dvh flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between px-3 desktop:px-10">
            <Link
              href="/today"
              aria-label={copy.login.backLabel}
              className={cn(
                "inline-flex size-11 items-center justify-center rounded-full text-foreground hover:bg-muted",
                focusRing,
              )}
            >
              <ArrowLeft aria-hidden className="size-5" strokeWidth={1.5} />
            </Link>
            <Wordmark className="desktop:hidden" />
            <span aria-hidden className="size-11" />
          </header>

          <main className="la-step mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) desktop:max-w-[22rem] desktop:justify-center desktop:px-0">
            <div className="flex flex-col gap-8 pt-4 pb-10 desktop:pt-0 desktop:pb-0">
              {reason.eyebrow ? (
                <p className="type-label">{reason.eyebrow}</p>
              ) : null}
              <div className="flex flex-col gap-4">
                <h1 className="type-title text-balance break-keep">
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
              <Status online={online} pending={pending} error={error} />
              <ul
                aria-label={copy.login.groupLabel}
                className="flex flex-col gap-2.5"
              >
                {LOGIN_PROVIDERS.map((id) => (
                  <li key={id}>
                    <BrandLoginButton
                      type="submit"
                      provider={id}
                      blocked={!online || (pending !== null && pending !== id)}
                      busy={pending === id}
                    />
                  </li>
                ))}
              </ul>
              <p className="flex items-center justify-center gap-2 pt-1 type-caption text-muted-foreground">
                <CornerDownLeft
                  aria-hidden
                  className="size-3.5"
                  strokeWidth={1.5}
                />
                {copy.login.returnNote}
              </p>
            </form>
          </main>
        </div>
      </div>
    </div>
  );
}

function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("type-label tracking-[-0.01em]", className)}>
      {copy.brand}
    </span>
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

/** 버튼 위 상태 한 줄. 빨간 면 없이 아이콘과 글자만(DESIGN.md 2장). 우선순위: 오프라인 > 이동 중 > 오류/취소 */
function Status({
  online,
  pending,
  error,
}: {
  online: boolean;
  pending: LoginProvider | null;
  error: AuthLoginError | null;
}) {
  if (!online) {
    return <Note kind="offline" {...copy.states.offline} />;
  }
  if (pending) {
    return (
      <Note
        kind="progress"
        title={copy.states.redirecting.title(copy.providerNames[pending])}
        body={copy.states.redirecting.body}
      />
    );
  }
  if (error === "failed") return <Note kind="error" {...copy.states.error} />;
  if (error === "cancelled")
    return <Note kind="info" {...copy.states.cancelled} />;
  return null;
}

function Note({
  kind,
  title,
  body,
}: {
  kind: "progress" | "error" | "offline" | "info";
  title: string;
  body: string;
}) {
  const Icon =
    kind === "error"
      ? AlertCircle
      : kind === "offline"
        ? WifiOff
        : kind === "info"
          ? Info
          : null;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className="flex flex-col gap-2 pb-1"
    >
      <div className="flex items-start gap-3">
        {Icon ? (
          <Icon
            aria-hidden
            className={cn(
              "mt-0.5 size-4 shrink-0",
              kind === "error" ? "text-destructive" : "text-muted-foreground",
            )}
            strokeWidth={1.5}
          />
        ) : null}
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="type-label break-keep">{title}</p>
          <p className="type-caption break-keep text-muted-foreground">
            {body}
          </p>
        </div>
      </div>
      {kind === "progress" ? <div aria-hidden className="la-progress" /> : null}
    </div>
  );
}
