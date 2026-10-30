"use client";
// 로그인 시안 공용 조각 (T4.2): 화면 틀, 브랜드 버튼 묶음, 상태 안내, 로그인한 계정 표시, 약관 전문,
// 인앱 메뉴 그림과 여는 방법, 둘러보기 맥락 화면. 배치와 순서는 시안마다 다르고 조각만 같이 쓴다.
// 브랜드 버튼은 랜딩 B(G3 D-06) BrandLoginButton을 그대로 쓴다(DESIGN.md 5장 "소셜 로그인 버튼").
import {
  AlertCircle,
  Bookmark,
  Ellipsis,
  EllipsisVertical,
  ExternalLink,
  Info,
  PenLine,
  UsersRound,
  WifiOff,
} from "lucide-react";
import type { ReactNode, Ref } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing } from "@/components/ui/interaction";
import { LazyToaster } from "@/components/ui/lazy-toaster";
import {
  authLabCopy,
  type AuthTermId,
  type AuthTrigger,
} from "@/copy/design-lab-auth";
import { MOCK_HOME_TODAY } from "@/features/design-lab/mock";
import {
  GoogleSymbol,
  KakaoSymbol,
  NaverSymbol,
} from "@/features/design-lab/landing/shared/brand-symbols";
import { DemoCard } from "@/features/design-lab/landing/shared/demo-card";
import { BrandLoginButton } from "@/features/design-lab/landing/shared/brand-button";
import { cn } from "@/lib/utils";
import type { InAppGuide } from "./inapp";
import type { AuthProvider } from "./params";
import type { AuthFlow } from "./use-auth-flow";

const copy = authLabCopy;

/** 화면 틀. @container/screen은 desktop: 변형(1024px)의 기준이다 */
export function AuthShell({
  children,
  className,
  shellRef,
}: {
  children: ReactNode;
  className?: string;
  shellRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={shellRef}
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

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("type-label tracking-[-0.01em]", className)}>
      {copy.brand}
    </span>
  );
}

/* ---------- 브랜드 버튼 묶음 ---------- */

const ORDER: readonly AuthProvider[] = ["kakao", "naver", "google"];

/**
 * 카카오, 네이버, 구글 순(인앱에서도 카카오가 맨 위, AUTH-04). 오프라인이면 모두 막고,
 * 이동 중이면 누른 버튼만 busy, 나머지는 막는다. 인앱의 구글은 막지 않는다: 누르면 외부 브라우저 안내로 간다(AC-AUTH-2).
 */
export function AuthBrandButtons({
  flow,
  idPrefix,
  inAppNote = "below",
  className,
}: {
  flow: AuthFlow;
  idPrefix: string;
  /** below: 구글 아래 한 줄 안내, none: 시안이 따로 그린다 */
  inAppNote?: "below" | "none";
  className?: string;
}) {
  const noteId = `${idPrefix}-google-inapp`;
  const inApp = flow.env.inApp !== null;
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <ul aria-label={copy.prompt.groupLabel} className="flex flex-col gap-2.5">
        {ORDER.map((id) => (
          <li key={id}>
            <BrandLoginButton
              provider={id}
              blocked={
                flow.env.offline ||
                (flow.pending !== null && flow.pending !== id)
              }
              busy={flow.pending === id}
              onPress={() => flow.pick(id)}
              describedBy={inApp && id === "google" ? noteId : undefined}
            />
          </li>
        ))}
      </ul>
      {inApp ? (
        <p
          id={noteId}
          className={cn(
            "type-caption break-keep text-muted-foreground",
            inAppNote === "none" && "sr-only",
          )}
        >
          {copy.prompt.googleBlocked(flow.appName)}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- 상태 안내 ---------- */

type NoteKind = "progress" | "cancelled" | "error" | "offline" | "info";

/** 빨간 면 없이 아이콘과 글자만(DESIGN.md 2장). 오류는 아이콘만 destructive */
export function AuthNote({
  kind,
  title,
  body,
  id,
  className,
}: {
  kind: NoteKind;
  title: string;
  body?: string;
  id?: string;
  className?: string;
}) {
  const Icon =
    kind === "error"
      ? AlertCircle
      : kind === "offline"
        ? WifiOff
        : kind === "progress"
          ? null
          : Info;
  return (
    <div
      id={id}
      role={kind === "error" ? "alert" : "status"}
      className={cn("flex flex-col gap-2", className)}
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

/** 로그인 유도 단계의 상태 한 줄(이동 중, 취소, 실패, 오프라인). 없으면 null */
export function PromptStatus({
  flow,
  className,
}: {
  flow: AuthFlow;
  className?: string;
}) {
  if (flow.env.offline) {
    return (
      <AuthNote
        kind="offline"
        title={copy.prompt.offline}
        body={copy.prompt.offlineBody}
        className={className}
      />
    );
  }
  if (flow.pending) {
    return (
      <AuthNote
        kind="progress"
        title={copy.prompt.redirecting(copy.providerNames[flow.pending])}
        body={copy.prompt.redirectingBody}
        className={className}
      />
    );
  }
  if (flow.notice === "error") {
    return (
      <AuthNote
        kind="error"
        title={copy.prompt.error}
        body={copy.prompt.errorBody}
        className={className}
      />
    );
  }
  if (flow.notice === "cancelled") {
    return (
      <AuthNote
        kind="cancelled"
        title={copy.prompt.cancelled}
        body={copy.prompt.cancelledBody}
        className={className}
      />
    );
  }
  return null;
}

/** 약관 단계의 상태 한 줄(저장 실패, 오프라인) */
export function TermsStatus({
  flow,
  className,
}: {
  flow: AuthFlow;
  className?: string;
}) {
  if (flow.env.offline) {
    return (
      <AuthNote
        kind="offline"
        title={copy.terms.offline}
        body={copy.terms.offlineBody}
        className={className}
      />
    );
  }
  if (flow.submitError) {
    return (
      <AuthNote
        kind="error"
        title={copy.terms.error}
        body={copy.terms.errorBody}
        className={className}
      />
    );
  }
  return null;
}

/* ---------- 로그인한 계정 표시 ---------- */

/** 각 사 심볼을 20px 브랜드 면 위에 둔다(네이버 흰 N이 샌드 위에서 사라지지 않게) */
export function ProviderMark({
  provider,
  className,
}: {
  provider: AuthProvider;
  className?: string;
}) {
  if (provider === "google") {
    return <GoogleSymbol className={cn("size-5 [&_svg]:size-3.5", className)} />;
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

export function SignedInLine({
  flow,
  className,
}: {
  flow: AuthFlow;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 type-caption text-muted-foreground",
        className,
      )}
    >
      <ProviderMark provider={flow.provider} />
      {copy.terms.signedIn(flow.providerName)}
    </p>
  );
}

/* ---------- 약관 ---------- */

export function RequiredTag({
  required,
  emphasize = false,
}: {
  required: boolean;
  /** 시작하기를 눌렀는데 비어 있는 필수 항목 */
  emphasize?: boolean;
}) {
  return (
    <span
      className={cn(
        "type-caption whitespace-nowrap",
        emphasize
          ? "text-destructive"
          : required
            ? "text-foreground"
            : "text-muted-foreground",
      )}
    >
      {required ? copy.terms.required : copy.terms.optional}
    </span>
  );
}

/** 문서 보기 밑줄 글자 버튼(터치 44) */
export function ViewDocButton({
  id,
  onOpen,
  className,
}: {
  id: AuthTermId;
  onOpen: (id: AuthTermId) => void;
  className?: string;
}) {
  const title = copy.terms.items[id];
  return (
    <button
      type="button"
      onClick={() => onOpen(id)}
      aria-label={copy.terms.viewLabel(title)}
      className={cn(
        "inline-flex h-11 shrink-0 items-center px-1 type-caption text-muted-foreground underline decoration-muted-foreground/60 underline-offset-3 hover:text-foreground",
        focusRing,
        className,
      )}
    >
      {copy.terms.view}
    </button>
  );
}

/** 약관 전문 본문(목업). 제목은 쓰는 쪽에서 */
export function TermsDocumentBody({
  id,
  className,
}: {
  id: Exclude<AuthTermId, "age">;
  className?: string;
}) {
  const doc = copy.documents[id];
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <p className="type-caption text-muted-foreground">{doc.updated}</p>
      {doc.sections.map((s) => (
        <section key={s.heading} className="flex flex-col gap-1.5">
          <h3 className="type-label">{s.heading}</h3>
          <p className="type-body-sm break-keep text-muted-foreground">
            {s.body}
          </p>
        </section>
      ))}
    </div>
  );
}

/** 비공개 후기 집계 고지 (PRD 11.2 "가입 화면에 한 줄로 고지") */
export function ReviewNotice({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "type-caption break-keep text-muted-foreground",
        className,
      )}
    >
      {copy.terms.reviewNotice}
    </p>
  );
}

/* ---------- 인앱 메뉴 그림과 여는 방법 ---------- */

/**
 * 인앱 브라우저의 메뉴 버튼 위치를 그린 안내 그림(PRD AUTH-04 "안내 이미지").
 * 앱 화면을 흉내 낸 틀 + 도구 막대(위 또는 아래) + 강조 링을 두른 메뉴 버튼 + 펼친 메뉴의 목표 항목.
 * 사진이나 앱 캡처를 쓰지 않는다(앱 업데이트에 덜 민감하고 다크 모드를 따른다). 장식 아님: 이름을 붙인다.
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
  const bar = (
    <div
      className={cn(
        "flex h-11 shrink-0 items-center gap-2 px-3",
        top ? "border-b border-border" : "border-t border-border",
      )}
    >
      <span aria-hidden className="h-2 w-6 rounded-full bg-muted-foreground/20" />
      <span aria-hidden className="h-5 flex-1 rounded-full bg-muted-foreground/20" />
      <span className="relative flex size-8 items-center justify-center">
        <span
          aria-hidden
          className="la-ring absolute inset-0 rounded-full border-[1.5px] border-primary"
        />
        <MenuIcon aria-hidden className="size-4 text-foreground" strokeWidth={2} />
      </span>
    </div>
  );
  const menu = (
    <div
      className={cn(
        "absolute right-3 flex w-[11.5rem] flex-col gap-0 rounded-lg border border-border bg-popover py-1.5",
        top ? "top-12" : "bottom-12",
      )}
    >
      <span aria-hidden className="mx-3 my-2 h-2 w-20 rounded-full bg-muted-foreground/20" />
      <span className="mx-1.5 flex items-center gap-2 rounded-md border border-primary px-2 py-1.5 type-caption text-foreground">
        <ExternalLink aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
        <span className="truncate">{guide.menuItem}</span>
      </span>
      <span aria-hidden className="mx-3 my-2 h-2 w-16 rounded-full bg-muted-foreground/20" />
    </div>
  );
  return (
    <figure
      role="img"
      aria-label={copy.inapp.diagramLabel(where, guide.menuItem)}
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
      {menu}
    </figure>
  );
}

/** 번호 매긴 여는 방법 3단계. 번호는 Pretendard 숫자(tabular) */
export function InAppSteps({
  guide,
  className,
  dense = false,
}: {
  guide: InAppGuide;
  className?: string;
  dense?: boolean;
}) {
  const steps = [
    copy.inapp.stepMenu(copy.inapp.where[guide.menu]),
    copy.inapp.stepPick(guide.menuItem),
    copy.inapp.stepGoogle,
  ];
  return (
    <ol
      aria-label={copy.inapp.stepsLabel}
      className={cn("flex flex-col", dense ? "gap-2" : "gap-3", className)}
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
          <span
            className={cn(
              "break-keep",
              dense ? "type-caption text-foreground" : "type-body-sm",
            )}
          >
            {s}
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ---------- 둘러보기 맥락 (AUTH-07을 부르는 화면, 목업) ---------- */

const TRIGGER_ICONS = {
  poll: UsersRound,
  save: Bookmark,
  review: PenLine,
} as const;

/**
 * 비로그인 둘러보기 중인 오늘 화면. "투표 만들기", 저장, 후기 남기기를 누르면 onTrigger.
 * 투표 만들기만 글자 버튼(테두리), 저장과 후기는 아이콘 버튼(이름 + "로그인 필요" 설명).
 * slot은 행동 줄 바로 아래에 붙는다(C 제자리 카드).
 */
export function ContextScene({
  onTrigger,
  active,
  slot,
  idPrefix,
  inert = false,
  className,
}: {
  onTrigger: (t: AuthTrigger) => void;
  active?: AuthTrigger | null;
  slot?: ReactNode;
  idPrefix: string;
  inert?: boolean;
  className?: string;
}) {
  const place = MOCK_HOME_TODAY[0]!;
  const needsId = `${idPrefix}-needs-login`;
  return (
    <section
      aria-label={copy.context.screenLabel}
      inert={inert || undefined}
      className={cn("flex flex-col gap-5", className)}
    >
      <span id={needsId} className="sr-only">
        {copy.context.needsLogin}
      </span>
      <header className="flex h-11 items-center justify-between">
        <Wordmark />
        <span className="inline-flex h-7 items-center rounded-badge border border-border px-2.5 type-caption text-muted-foreground">
          {copy.context.guestBadge}
        </span>
      </header>
      <div className="flex flex-col gap-1.5">
        <p className="type-caption text-muted-foreground">
          {copy.context.date}
        </p>
        <h1 className="type-title">{copy.context.title}</h1>
      </div>
      <div className="flex flex-col gap-2">
        <p className="type-caption text-muted-foreground">
          {copy.context.pickCaption}
        </p>
        <DemoCard place={place} />
      </div>
      <div
        role="group"
        aria-label={copy.context.actionsLabel}
        className="flex items-center gap-2"
      >
        <button
          type="button"
          aria-describedby={needsId}
          aria-expanded={active === "poll" ? true : undefined}
          onClick={() => onTrigger("poll")}
          className={cn(buttonClass("secondary"), "flex-1")}
        >
          <UsersRound aria-hidden className="size-4" strokeWidth={1.5} />
          {copy.context.actions.poll}
        </button>
        {(["save", "review"] as const).map((t) => {
          const Icon = TRIGGER_ICONS[t];
          return (
            <button
              key={t}
              type="button"
              aria-label={copy.context.actions[t]}
              aria-describedby={needsId}
              aria-expanded={active === t ? true : undefined}
              onClick={() => onTrigger(t)}
              className={cn(buttonClass("secondary", "icon"), "rounded-full")}
            >
              <Icon aria-hidden className="size-5" strokeWidth={1.5} />
            </button>
          );
        })}
      </div>
      {slot}
    </section>
  );
}
