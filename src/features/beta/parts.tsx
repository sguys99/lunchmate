"use client";
// /beta 환영 페이지 조각 (T9.3, D-23). 시안 A(features/design-lab/beta/shared.tsx)에서 실제 화면에 필요한 것만 옮겼다.
// - 카카오톡 등 인앱 메뉴 그림은 로그인 화면의 MenuDiagram(auth-parts, auth.css la-ring)을 그대로 쓴다(AUTH-04, T4.10).
// - 그림은 앱 캡처 대신 도형으로 그려 다크 모드를 따른다. 장식이 아니라 이름(aria-label)을 붙인다.
import { Check, Share, WifiOff } from "lucide-react";
import { useState, type ReactNode } from "react";
import { LoadingRegion, SkeletonLine } from "@/components/states";
import { buttonClass } from "@/components/ui/button-classes";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { focusRing } from "@/components/ui/interaction";
import { betaCopy as copy } from "@/copy/beta";
import { MenuDiagram, Wordmark } from "@/features/auth/auth-parts";
import { copyText } from "@/features/auth/copy-link";
import type { InAppGuide } from "@/lib/inapp";
import { cn } from "@/lib/utils";
import type { BetaPlatform } from "./env";

export const textLink = cn(
  "inline-flex min-h-11 items-center type-label text-foreground underline decoration-muted-foreground decoration-1 underline-offset-4 hover:decoration-foreground",
  focusRing,
);

/**
 * 화면 틀. 모바일은 한 칸(머리 64 + 본문 + 아래 고정 버튼 줄), 데스크톱(1024 이상)은 왼쪽 단계 칸 + 오른쪽 카드 면 칸
 * "휴대폰에서도 열어 두세요"(D-23: 데스크톱은 A 2단).
 */
export function BetaFrame({ children }: { children: ReactNode }) {
  return (
    <div className="@container/screen flex min-h-dvh flex-1 flex-col bg-background text-foreground">
      <div className="flex min-h-dvh flex-1 flex-col desktop:grid desktop:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-h-dvh flex-col">
          <header className="flex h-16 shrink-0 items-center px-(--lm-layout-gutter) desktop:px-16">
            <Wordmark />
          </header>
          <main className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-4 desktop:max-w-[28rem] desktop:px-0 desktop:pt-12">
            {children}
          </main>
        </div>
        <aside
          aria-labelledby="beta-aside-title"
          className="hidden desktop:flex desktop:flex-col desktop:justify-center desktop:gap-6 desktop:border-l desktop:border-border desktop:bg-card desktop:px-16"
        >
          <div className="flex max-w-[22rem] flex-col gap-2">
            <h2 id="beta-aside-title" className="type-heading break-keep">
              {copy.desktopAside.title}
            </h2>
            <p className="type-body-sm break-keep text-muted-foreground">
              {copy.desktopAside.body}
            </p>
          </div>
          <MeDiagram className="max-w-[22rem]" />
          <p className="max-w-[22rem] type-caption break-keep text-muted-foreground">
            {copy.feedback.short}
          </p>
        </aside>
      </div>
    </div>
  );
}

/** 화면 아래 1/3 고정 버튼 줄(모바일). 데스크톱은 본문 흐름 안 */
export function BottomZone({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-(--lm-layout-gutter) mt-auto flex flex-col gap-1 bg-background px-(--lm-layout-gutter) pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] desktop:static desktop:mx-0 desktop:mt-0 desktop:px-0 desktop:pt-8">
      {children}
    </div>
  );
}

/** iOS Safari 공유 버튼 위치 그림. MenuDiagram과 같은 문법(도형, 숨 쉬는 링 두 번) */
export function ShareDiagram({ className }: { className?: string }) {
  return (
    <figure
      role="img"
      aria-label={copy.diagrams.share}
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
          <span className="truncate">{copy.diagrams.shareItem}</span>
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
      aria-label={copy.diagrams.me}
      className={cn(
        "relative flex h-44 flex-col overflow-hidden rounded-[1.25rem] border border-border bg-background",
        className,
      )}
    >
      <div aria-hidden className="flex flex-1 flex-col gap-3 p-4">
        <span className="h-3 w-8 rounded-full bg-muted-foreground/30" />
        <span className="relative flex h-9 items-center justify-between rounded-md border border-primary px-2.5 type-caption text-foreground">
          {copy.diagrams.meRow}
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

/** 기기 고르기 칩 3개 (빈 상태, 다른 기기 보기) */
export function DevicePicker({
  value,
  onChange,
  className,
}: {
  value: BetaPlatform | null;
  onChange: (t: BetaPlatform) => void;
  className?: string;
}) {
  return (
    <ChipGroup
      aria-label={copy.devicePickLabel}
      value={value ? [value] : []}
      onValueChange={(v: unknown[]) => {
        const next = v[0];
        if (next === "ios" || next === "android" || next === "desktop")
          onChange(next);
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

export function OfflineLine() {
  return (
    <div role="status" className="flex items-start gap-3 border-y border-border py-3">
      <WifiOff
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.75}
      />
      <p className="flex flex-col gap-0.5">
        <span className="type-label">{copy.states.offline.title}</span>
        <span className="type-body-sm break-keep text-muted-foreground">
          {copy.states.offline.body}
        </span>
      </p>
    </div>
  );
}

type CopyState = "idle" | "done" | "failed";

/** 외부 브라우저 열기 실패(오류 상태): 직접 여는 방법(메뉴 그림) + 링크 복사 */
export function OpenFailedBlock({
  guide,
  link,
}: {
  guide: InAppGuide;
  link: string;
}) {
  const [copied, setCopied] = useState<CopyState>("idle");
  return (
    <section role="alert" className="flex flex-col gap-3">
      <p className="flex flex-col gap-1">
        <span className="type-label">{copy.states.error.title}</span>
        <span className="type-body-sm break-keep text-muted-foreground">
          {copy.states.error.body}
        </span>
      </p>
      <MenuDiagram guide={guide} size="sm" />
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1 truncate type-caption text-muted-foreground select-all">
          <span className="sr-only">{copy.states.error.linkLabel} </span>
          {link}
        </span>
        <button
          type="button"
          onClick={async () => setCopied((await copyText(link)) ? "done" : "failed")}
          className={buttonClass("secondary", "sm")}
        >
          {copy.states.error.copyLink}
        </button>
      </div>
      {copied !== "idle" ? (
        <p role="status" className="type-caption break-keep text-muted-foreground">
          {copied === "done"
            ? copy.states.error.copied
            : copy.states.error.copyFailed}
        </p>
      ) : null}
    </section>
  );
}

/** 기기 확인 전 스켈레톤(로딩 상태): 제목 두 줄 + 단계 세 줄 */
export function BetaSkeleton() {
  return (
    <LoadingRegion label={copy.loading} className="flex flex-col gap-6">
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

export type StepStatus = "done" | "current" | "next";

/** 단계 번호 동그라미: 지금 단계는 올리브 테두리, 마친 단계는 체크 */
export function StepMark({ n, status }: { n: number; status: StepStatus }) {
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

/** 접는 묶음 (다른 기기 보기). grid-rows 0fr↔1fr base 전환, 닫히면 inert */
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
