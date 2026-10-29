"use client";
// 세 안이 함께 쓰는 랜딩 조각 (T3.4): 화면 틀, 추천 체험 버튼, 오프라인 안내, 약관 문장.
// Button(Base UI) 대신 buttonClass를 써서 실제 랜딩으로 옮겼을 때 첫 로드에 Base UI가 들어오지 않게 한다.
import Link from "next/link";
import { ArrowRight, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing, hitArea44 } from "@/components/ui/interaction";
import { LazyToaster, toast } from "@/components/ui/lazy-toaster";
import { landingLabCopy } from "@/copy/design-lab-landing";
import { cn } from "@/lib/utils";
import type { LandingEnv } from "./use-landing-env";

const copy = landingLabCopy.common;

/** 화면 틀. @container/screen은 desktop: 변형(1024px)의 기준이다. */
export function LandingShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "@container/screen relative isolate flex min-h-dvh flex-1 flex-col bg-background font-sans text-foreground",
        className,
      )}
    >
      {children}
      <LazyToaster />
    </div>
  );
}

/** 작은 워드마크. 세리프는 22px 이상에만 쓰므로(DESIGN.md 9장) label 산세리프로 둔다. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("type-label tracking-[-0.01em]", className)}>
      {landingLabCopy.brand}
    </span>
  );
}

/** 추천 체험(포인트 컬러 버튼, 화면에 하나). 오프라인이면 막고 안내 문장과 잇는다. */
export function TryButton({
  env,
  label = copy.tryCta,
  variant = "primary",
  className,
}: {
  env: LandingEnv;
  label?: string;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-disabled={env.offline || undefined}
      aria-describedby={env.offline ? "landing-offline-note" : undefined}
      onClick={() => {
        if (!env.offline) void toast(copy.tryToast);
      }}
      className={cn(
        buttonClass(variant),
        "w-full",
        env.offline && "cursor-not-allowed",
        className,
      )}
    >
      {label}
      <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
    </button>
  );
}

/** 오프라인 안내. 빨간 면 없이 아이콘과 글자만(DESIGN.md 2장 의미 색). */
export function OfflineNote({
  className,
  primary = true,
}: {
  className?: string;
  /** 체험 버튼이 aria-describedby로 가리키는 안내면 true. 한 화면에 id는 하나 */
  primary?: boolean;
}) {
  return (
    <div
      id={primary ? "landing-offline-note" : undefined}
      role="status"
      className={cn("flex items-start gap-3", className)}
    >
      <WifiOff
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.5}
      />
      <div className="flex flex-col gap-0.5">
        <p className="type-label">{copy.offlineTitle}</p>
        <p className="type-caption break-keep text-muted-foreground">
          {copy.offlineBody}
        </p>
      </div>
    </div>
  );
}

/** 로그인 버튼 위 구분 줄: 가는 선 사이 caption 한 줄 */
export function LoginDivider({
  className,
  id,
}: {
  className?: string;
  /** 바로가기 링크의 도착점(B 모바일 머리 링크) */
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        "flex items-center gap-3 type-caption text-muted-foreground",
        className,
      )}
    >
      <span aria-hidden className="h-px flex-1 bg-border" />
      <span>{copy.loginDivider}</span>
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

/** 약관 문장. 실제 경로(/terms, /privacy)는 4단계에서 만든다. 지금은 자리만. */
export function TermsNote({ className }: { className?: string }) {
  const t = copy.terms;
  return (
    <p
      className={cn("type-caption break-keep text-muted-foreground", className)}
    >
      {t.before}
      <Link href="#terms" className={termsLink}>
        {t.termsLink}
      </Link>
      {t.middle}
      <Link href="#privacy" className={termsLink}>
        {t.privacyLink}
      </Link>
      {t.after}
    </p>
  );
}
