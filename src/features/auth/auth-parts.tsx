// 로그인 전용 화면 공용 조각 (T4.10, T4.11, D-08 B "전용 화면", DESIGN.md 5장 "로그인과 약관").
// 시안 코드(features/design-lab/auth/shared/parts.tsx)에서 실제 화면에 필요한 것만 옮겼다.
// 훅이 없는 조각만 있어 서버와 클라이언트 어디서든 렌더할 수 있다(useFocusOnChange는 use-focus-on-change.ts).
import {
  AlertCircle,
  Ellipsis,
  EllipsisVertical,
  ExternalLink,
  Info,
  WifiOff,
} from "lucide-react";
import type { ReactNode } from "react";
import { authCopy } from "@/copy/auth";
import type { InAppGuide } from "@/lib/inapp";
import { cn } from "@/lib/utils";
import { GoogleSymbol, KakaoSymbol, NaverSymbol } from "./brand-symbols";
import type { LoginProvider } from "./providers";

const copy = authCopy;

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("type-label tracking-[-0.01em]", className)}>
      {copy.brand}
    </span>
  );
}

/**
 * 전용 화면 틀. 모바일은 한 칸(머리 64 + 본문), 데스크톱(1024 이상)은 왼쪽 카드 면 칸 + 오른쪽 행동 칸 2단.
 * header의 왼쪽 자리(뒤로 버튼 등)는 쓰는 쪽이 넘긴다.
 */
export function AuthFrame({
  aside,
  asideHidden = true,
  headerStart,
  children,
  mainKey,
  animate = false,
}: {
  aside: ReactNode;
  /** 왼쪽 칸이 장식이면 true(스크린 리더에서 숨김) */
  asideHidden?: boolean;
  headerStart?: ReactNode;
  children: ReactNode;
  /** 바뀌면 본문을 다시 그리며 떠오르는 전환(la-step)을 한 번 */
  mainKey?: string;
  animate?: boolean;
}) {
  return (
    <div className="@container/screen relative isolate flex min-h-dvh flex-1 flex-col bg-background font-sans text-foreground">
      <div className="flex min-h-dvh flex-1 flex-col desktop:grid desktop:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <aside
          aria-hidden={asideHidden || undefined}
          className="hidden desktop:flex desktop:flex-col desktop:justify-between desktop:border-r desktop:border-border desktop:bg-card desktop:px-16 desktop:py-12"
        >
          <Wordmark />
          {aside}
          <span />
        </aside>

        <div className="flex min-h-dvh flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between px-3 desktop:px-10">
            {headerStart ?? <span aria-hidden className="size-11" />}
            <Wordmark className="desktop:hidden" />
            <span aria-hidden className="size-11" />
          </header>
          <main
            key={mainKey}
            className={cn(
              "mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) desktop:max-w-[22rem] desktop:justify-center desktop:px-0",
              animate && "la-step",
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

/** 화면 아래(엄지 자리)에 붙는 행동 묶음. 모바일은 sticky, 데스크톱은 흐름 그대로 */
export function BottomZone({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 -mx-(--lm-layout-gutter) mt-auto flex flex-col gap-3 bg-background px-(--lm-layout-gutter) pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] desktop:static desktop:mx-0 desktop:mt-0 desktop:px-0 desktop:pt-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

export type NoteKind = "progress" | "error" | "offline" | "info";

/** 상태 한 줄. 빨간 면 없이 아이콘과 글자만(DESIGN.md 2장). 오류는 아이콘만 destructive, 진행은 2px 선 */
export function AuthNote({
  kind,
  title,
  body,
  className,
}: {
  kind: NoteKind;
  title: string;
  body?: string;
  className?: string;
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
      className={cn("flex flex-col gap-2 pb-1", className)}
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
          {body ? (
            <p className="type-caption break-keep text-muted-foreground">
              {body}
            </p>
          ) : null}
        </div>
      </div>
      {kind === "progress" ? <div aria-hidden className="la-progress" /> : null}
    </div>
  );
}

/** 각 사 심볼을 20px 브랜드 면 위에 둔다(네이버 흰 N이 샌드 위에서 사라지지 않게) */
export function ProviderMark({
  provider,
  className,
}: {
  provider: LoginProvider;
  className?: string;
}) {
  if (provider === "google") {
    return (
      <GoogleSymbol className={cn("size-5 [&_svg]:size-3.5", className)} />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-[0.375rem]",
        provider === "kakao" ? "bg-brand-kakao" : "bg-brand-naver",
        className,
      )}
    >
      {provider === "kakao" ? (
        <KakaoSymbol className="size-3" />
      ) : (
        <NaverSymbol className="size-2.5" />
      )}
    </span>
  );
}

/**
 * 인앱 브라우저의 메뉴 버튼 위치 그림(PRD AUTH-04 "안내 이미지"). 앱 캡처 대신 도형으로 그려 다크 모드를 따른다.
 * 메뉴 버튼 둘레 링이 두 번 숨 쉬고 멈춘다(la-ring). 장식이 아니라 이름을 붙인다.
 */
export function MenuDiagram({
  guide,
  size = "md",
  className,
}: {
  guide: InAppGuide;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const top = guide.menu === "top-right";
  const MenuIcon = guide.menuIcon === "vertical" ? EllipsisVertical : Ellipsis;
  const where = copy.inapp.where[guide.menu];
  const item = copy.inapp.menuItems[guide.menuItem];
  const bar = (
    <div
      className={cn(
        "flex h-11 shrink-0 items-center gap-2 px-3",
        top ? "border-b border-border" : "border-t border-border",
      )}
    >
      <span
        aria-hidden
        className="h-2 w-6 rounded-full bg-muted-foreground/20"
      />
      <span
        aria-hidden
        className="h-5 flex-1 rounded-full bg-muted-foreground/20"
      />
      <span className="relative flex size-8 items-center justify-center">
        <span
          aria-hidden
          className="la-ring absolute inset-0 rounded-full border-[1.5px] border-primary"
        />
        <MenuIcon
          aria-hidden
          className="size-4 text-foreground"
          strokeWidth={2}
        />
      </span>
    </div>
  );
  return (
    <figure
      role="img"
      aria-label={copy.inapp.diagramLabel(where, item)}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[1.25rem] border border-border bg-card",
        size === "sm" ? "h-44" : size === "lg" ? "h-72" : "h-56",
        className,
      )}
    >
      {top ? bar : null}
      <div aria-hidden className="flex flex-1 flex-col gap-2 p-4">
        <span className="h-2.5 w-24 rounded-full bg-muted-foreground/20" />
        <span className="h-2.5 w-36 rounded-full bg-muted-foreground/20" />
        <span className="h-2.5 w-28 rounded-full bg-muted-foreground/20" />
      </div>
      {top ? null : bar}
      <div
        aria-hidden
        className={cn(
          "absolute right-3 flex w-[11.5rem] flex-col rounded-lg border border-border bg-popover py-1.5",
          top ? "top-12" : "bottom-12",
        )}
      >
        <span className="mx-3 my-2 h-2 w-20 rounded-full bg-muted-foreground/20" />
        <span className="mx-1.5 flex items-center gap-2 rounded-md border border-primary px-2 py-1.5 type-caption text-foreground">
          <ExternalLink className="size-3.5 shrink-0" strokeWidth={1.75} />
          <span className="truncate">{item}</span>
        </span>
        <span className="mx-3 my-2 h-2 w-16 rounded-full bg-muted-foreground/20" />
      </div>
    </figure>
  );
}

/** 번호 매긴 여는 방법 3단계 */
export function InAppSteps({
  guide,
  className,
}: {
  guide: InAppGuide;
  className?: string;
}) {
  const steps = [
    copy.inapp.stepMenu(copy.inapp.where[guide.menu]),
    copy.inapp.stepPick(copy.inapp.menuItems[guide.menuItem]),
    copy.inapp.stepGoogle,
  ];
  return (
    <ol
      aria-label={copy.inapp.stepsLabel}
      className={cn("flex flex-col gap-3", className)}
    >
      {steps.map((s, i) => (
        <li key={s} className="flex items-baseline gap-3">
          <span
            aria-hidden
            className="inline-flex size-6 shrink-0 translate-y-[-0.05rem] items-center justify-center rounded-full border border-border type-caption tabular-nums"
          >
            {i + 1}
          </span>
          <span className="sr-only">{`${i + 1}. `}</span>
          <span className="type-body-sm break-keep">{s}</span>
        </li>
      ))}
    </ol>
  );
}
