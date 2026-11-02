"use client";
// 베타 환영 페이지 시안 공용 조각 (T9.3). 세 안이 같은 데이터(기기, 상태)와 같은 설치 안내를 쓰고, 배치만 다르다.
// - 카카오톡 인앱 안내는 로그인 화면의 MenuDiagram(auth-parts, auth.css la-ring)을 그대로 쓴다(AUTH-04, T4.10).
// - 실제 구현에서 기기 판정은 서버 UA(detectInApp, detectOs) + 브라우저 standalone 확인, 설치 버튼은 보관된
//   beforeinstallprompt(T8.2 install-script)를 쓴다. 시안은 ?device= 목업이다.
import { Check, Download, Share, WifiOff } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { focusRing } from "@/components/ui/interaction";
import { LoadingRegion, SkeletonLine } from "@/components/states";
import { betaLabCopy } from "@/copy/design-lab-beta";
import { MenuDiagram } from "@/features/auth/auth-parts";
import { copyText } from "@/features/auth/copy-link";
import { inAppGuide } from "@/lib/inapp";
import { cn } from "@/lib/utils";
import {
  BETA_LOGIN_HREF,
  installTarget,
  isKakao,
  type BetaDevice,
  type BetaParams,
  type InstallTarget,
} from "./params";

const copy = betaLabCopy;

/** 이 시안이 보여 주는 화면 상태 */
export type BetaView =
  | { kind: "loading" }
  | { kind: "pick" }
  | { kind: "guide"; device: BetaDevice; openFailed: boolean; offline: boolean };

export function useBetaLab(p: BetaParams) {
  // 빈 상태(기기 모름)에서 칩으로 고른 기기
  const [picked, setPicked] = useState<InstallTarget | null>(null);
  const [opening, setOpening] = useState(false);
  const [openFailed, setOpenFailed] = useState(p.state === "error");
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const offline = p.state === "offline";
  const device: BetaDevice | null =
    p.state === "empty" ? (picked ?? null) : p.state === "error" ? "kakao-ios" : p.device;

  const view: BetaView =
    p.state === "loading"
      ? { kind: "loading" }
      : device === null
        ? { kind: "pick" }
        : { kind: "guide", device, openFailed, offline };

  /** 실제는 externalOpenUrl(kakaotalk) 스킴 이동 + 1.5초 뒤에도 보이면 실패. 시안은 1.5초 "여는 중"만 */
  function openExternal() {
    if (offline || opening) return;
    setOpening(true);
    timer.current = window.setTimeout(() => {
      setOpening(false);
      setOpenFailed(true);
    }, 1500);
  }

  return { view, picked, setPicked, opening, openExternal, offline };
}
export type BetaLab = ReturnType<typeof useBetaLab>;

/* ---------- 버튼 ---------- */

/** 로그인 주 버튼(올리브). 오프라인이면 aria-disabled + 이동 막음 */
export function LoginButton({
  offline,
  label = copy.cta.login,
  variant = "primary",
  className,
}: {
  offline: boolean;
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  return (
    <Link
      href={BETA_LOGIN_HREF}
      prefetch={false}
      aria-disabled={offline || undefined}
      onClick={(e) => {
        // 시안: 실제 로그인으로 가지 않는다. 오프라인이면 아무 일도 하지 않는다
        e.preventDefault();
      }}
      className={cn(buttonClass(variant), "w-full", className)}
    >
      {label}
    </Link>
  );
}

export function ExternalButton({
  lab,
  variant,
  className,
}: {
  lab: BetaLab;
  variant: "primary" | "secondary";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={lab.openExternal}
      aria-disabled={lab.offline || lab.opening || undefined}
      className={cn(buttonClass(variant), "w-full", className)}
    >
      {lab.opening ? copy.steps.external.opening : copy.steps.external.action}
    </button>
  );
}

/* ---------- 설치 방법 ---------- */

/** 설치 방법 한 단락 + (안드로이드) 설치 버튼 */
export function InstallBody({
  target,
  className,
}: {
  target: InstallTarget;
  className?: string;
}) {
  const text =
    target === "ios"
      ? copy.steps.install.ios
      : target === "android"
        ? copy.steps.install.android
        : target === "desktop"
          ? copy.steps.install.desktop
          : copy.steps.install.app;
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <p className="type-body-sm break-keep text-muted-foreground">{text}</p>
      {target === "android" ? (
        <button
          type="button"
          className={cn(buttonClass("secondary", "sm"), "w-fit")}
        >
          <Download aria-hidden strokeWidth={1.75} />
          {copy.steps.install.androidAction}
        </button>
      ) : null}
    </div>
  );
}

/** iOS Safari 공유 버튼 위치 그림. MenuDiagram과 같은 문법(도형, 숨 쉬는 링 두 번) */
export function ShareDiagram({ className }: { className?: string }) {
  return (
    <figure
      role="img"
      aria-label={copy.cards.diagramShare}
      className={cn(
        "relative flex h-44 flex-col overflow-hidden rounded-[1.25rem] border border-border bg-card",
        className,
      )}
    >
      <div aria-hidden className="flex flex-1 flex-col gap-2 p-4">
        <span className="h-2.5 w-24 rounded-full bg-muted-foreground/20" />
        <span className="h-2.5 w-36 rounded-full bg-muted-foreground/20" />
      </div>
      <div
        aria-hidden
        className="absolute bottom-12 left-1/2 flex w-[11.5rem] -translate-x-1/2 flex-col rounded-lg border border-border bg-popover py-1.5"
      >
        <span className="mx-3 my-2 h-2 w-20 rounded-full bg-muted-foreground/20" />
        <span className="mx-1.5 flex items-center justify-between gap-2 rounded-md border border-primary px-2 py-1.5 type-caption text-foreground">
          <span className="truncate">{copy.cards.shareItem}</span>
          <span className="size-3.5 rounded-[0.25rem] border border-current" />
        </span>
      </div>
      <div
        aria-hidden
        className="flex h-11 shrink-0 items-center justify-around border-t border-border px-3"
      >
        <span className="h-2 w-4 rounded-full bg-muted-foreground/20" />
        <span className="h-2 w-4 rounded-full bg-muted-foreground/20" />
        <span className="relative flex size-8 items-center justify-center">
          <span className="la-ring absolute inset-0 rounded-full border-[1.5px] border-primary" />
          <Share className="size-4 text-foreground" strokeWidth={2} />
        </span>
        <span className="h-2 w-4 rounded-full bg-muted-foreground/20" />
        <span className="h-2 w-4 rounded-full bg-muted-foreground/20" />
      </div>
    </figure>
  );
}

/** 나 탭 "베타 의견 보내기" 줄 위치 그림 */
export function MeDiagram({ className }: { className?: string }) {
  return (
    <figure
      role="img"
      aria-label={copy.cards.diagramMe}
      className={cn(
        "relative flex h-44 flex-col overflow-hidden rounded-[1.25rem] border border-border bg-card",
        className,
      )}
    >
      <div aria-hidden className="flex flex-1 flex-col gap-3 p-4">
        <span className="h-3 w-8 rounded-full bg-muted-foreground/30" />
        <span className="relative flex h-9 items-center justify-between rounded-md border border-primary px-2.5 type-caption text-foreground">
          {copy.cards.meRow}
          <span className="la-ring absolute -inset-1 rounded-lg border-[1.5px] border-primary" />
        </span>
        <span className="h-2.5 w-36 rounded-full bg-muted-foreground/20" />
      </div>
      <div
        aria-hidden
        className="grid h-10 shrink-0 grid-cols-4 items-center border-t border-border"
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "mx-auto h-2 w-5 rounded-full",
              i === 3 ? "bg-primary" : "bg-muted-foreground/20",
            )}
          />
        ))}
      </div>
    </figure>
  );
}

/** 설치 그림: 카카오톡은 메뉴 그림, iOS는 공유 그림, 그 밖은 없음 */
export function InstallDiagram({
  device,
  className,
}: {
  device: BetaDevice;
  className?: string;
}) {
  if (isKakao(device)) {
    const guide = inAppGuide(
      "kakaotalk",
      device === "kakao-ios" ? "ios" : "android",
    );
    return <MenuDiagram guide={guide} size="sm" className={className} />;
  }
  if (device === "ios") return <ShareDiagram className={className} />;
  return null;
}

/* ---------- 기기 ---------- */

export function deviceLine(device: BetaDevice): string {
  if (device === "kakao-ios") return copy.detectedInApp(copy.devices.ios);
  if (device === "kakao-android") return copy.detectedInApp(copy.devices.android);
  if (device === "app") return copy.steps.install.app;
  return copy.detected(copy.devices[device]);
}

/** 기기 고르기 칩 3개 (빈 상태, A안 다른 기기 보기, C안 설치 묶음) */
export function DevicePicker({
  value,
  onChange,
  className,
}: {
  value: InstallTarget | null;
  onChange: (t: InstallTarget) => void;
  className?: string;
}) {
  return (
    <ChipGroup
      aria-label={copy.devicePickLabel}
      value={value && value !== "app" ? [value] : []}
      onValueChange={(v: unknown[]) => {
        const next = v[0];
        if (next === "ios" || next === "android" || next === "desktop") onChange(next);
      }}
      className={className}
    >
      {(["ios", "android", "desktop"] as const).map((d) => (
        <Chip key={d} value={d}>
          {copy.devices[d]}
        </Chip>
      ))}
    </ChipGroup>
  );
}

/* ---------- 상태 ---------- */

export function OfflineLine({ className }: { className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 border-y border-border py-3",
        className,
      )}
    >
      <WifiOff aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
      <p className="flex flex-col gap-0.5">
        <span className="type-label">{copy.states.offline.title}</span>
        <span className="type-body-sm break-keep text-muted-foreground">
          {copy.states.offline.body}
        </span>
      </p>
    </div>
  );
}

/** 외부 브라우저 열기 실패: 직접 여는 방법(메뉴 그림) + 링크 복사 */
export function OpenFailedBlock({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  const link = "https://lunchmate-kr.vercel.app/beta";
  return (
    <section
      role="alert"
      className={cn("flex flex-col gap-3 border-y border-border py-4", className)}
    >
      <p className="flex flex-col gap-1">
        <span className="type-label">{copy.states.error.title}</span>
        <span className="type-body-sm break-keep text-muted-foreground">
          {copy.states.error.body}
        </span>
      </p>
      <MenuDiagram guide={inAppGuide("kakaotalk", "ios")} size="sm" />
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1 truncate type-caption text-muted-foreground select-all">
          <span className="sr-only">{copy.states.error.linkLabel} </span>
          {link}
        </span>
        <button
          type="button"
          onClick={async () => setCopied(await copyText(link))}
          className={buttonClass("secondary", "sm")}
        >
          {copy.states.error.copyLink}
        </button>
      </div>
      {copied ? (
        <p role="status" className="type-caption break-keep text-muted-foreground">
          {copy.states.error.copied}
        </p>
      ) : null}
    </section>
  );
}

/** 기기 확인 전 스켈레톤: 제목 두 줄 + 단계 세 줄 */
export function BetaSkeleton({ className }: { className?: string }) {
  return (
    <LoadingRegion label={copy.loading} className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-2">
        <SkeletonLine type="caption" className="w-[30%]" />
        <SkeletonLine type="title" className="w-[85%]" />
        <SkeletonLine type="body" className="w-[95%]" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-4">
          <span aria-hidden className="size-7 shrink-0 rounded-full bg-skeleton" />
          <div className="flex flex-1 flex-col gap-1">
            <SkeletonLine type="label" className="w-[45%]" />
            <SkeletonLine type="body-sm" className="w-[90%]" />
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}

/** 단계 번호 동그라미: 지금 단계는 올리브 테두리, 마친 단계는 체크 */
export function StepMark({
  n,
  status,
}: {
  n: number;
  status: "done" | "current" | "next";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-full border type-caption tabular-nums transition-colors duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
        status === "current" && "border-primary text-primary",
        status === "next" && "border-border text-muted-foreground",
        status === "done" && "border-transparent bg-muted text-foreground",
      )}
    >
      {status === "done" ? <Check className="size-3.5" strokeWidth={2.25} /> : n}
    </span>
  );
}

/** 접는 묶음 (C안, A안 다른 기기). grid-rows 0fr↔1fr base 전환 */
export function Collapsible({
  open,
  id,
  children,
}: {
  open: boolean;
  id: string;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
      inert={!open || undefined}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

export const textLink = cn(
  "inline-flex min-h-11 items-center type-label text-foreground underline decoration-muted-foreground decoration-1 underline-offset-4 hover:decoration-foreground",
  focusRing,
);

export { copy as betaCopy, installTarget, isKakao };
