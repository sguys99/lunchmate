"use client";
// 로그인 시안 A "이어지는 시트" (T4.2). 둘러보던 화면 위에 바텀시트 하나가 뜨고, 로그인 유도 → (제공자 다녀옴) →
// 약관 동의 → 온보딩까지 같은 시트 안에서 내용만 바뀐다. 인앱 구글 안내와 약관 전문도 같은 시트의 다음 장이다.
// - 맥락을 잃지 않는다: 뒤의 화면(딤 32%)이 그대로 보이고, 시트 위 눈썹 글자가 누른 행동을 되짚는다.
// - 시트 하나 = 장면 하나: 단계가 바뀌면 새 내용이 slow 300 enter로 8px 떠오른다(auth.css la-step). 뒤로는 왼쪽 위.
// - 포인트 컬러 면 버튼은 약관의 "동의하고 시작하기"와 Android 인앱의 "외부 브라우저로 열기" 하나씩(단계마다 1개).
//   로그인 단계는 브랜드 버튼뿐이다(브랜드 예외, DESIGN.md 5장).
// - 필수 미동의: 버튼은 비활성 모양(muted)이고 바로 위 한 줄이 "필수 항목 N개에 동의해 주세요"를 실시간으로 말한다.
// - 데스크톱(1024 이상): 같은 시트가 화면 가운데 카드(최대 26rem, 라운드 28)로 뜬다.
import { ArrowLeft, CornerDownLeft, X } from "lucide-react";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerPopup,
  DrawerPortal,
  DrawerHandle,
  DrawerTitle,
  DrawerViewport,
} from "@/components/ui/drawer";
import { focusRing } from "@/components/ui/interaction";
import { authLabCopy, type AuthTrigger } from "@/copy/design-lab-auth";
import { BrandLoginButton } from "@/features/design-lab/landing/shared/brand-button";
import { cn } from "@/lib/utils";
import type { AuthParams } from "../shared/params";
import {
  AuthBrandButtons,
  AuthNote,
  AuthShell,
  ContextScene,
  InAppSteps,
  MenuDiagram,
  PromptStatus,
  ProviderMark,
  RequiredTag,
  ReviewNotice,
  SignedInLine,
  TermsDocumentBody,
  TermsStatus,
  ViewDocButton,
} from "../shared/parts";
import { allState, TERM_ITEMS } from "../shared/terms";
import {
  useAuthFlow,
  useFocusOnChange,
  type AuthFlow,
} from "../shared/use-auth-flow";

const copy = authLabCopy;
const ID = "auth-a";

const iconButton = cn(
  "inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
  focusRing,
);

export function AuthA({ params }: { params: AuthParams }) {
  const flow = useAuthFlow(params);
  const [open, setOpen] = useState(true);
  const [trigger, setTrigger] = useState<AuthTrigger>(params.trigger);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  // 단계(와 약관 전문)가 바뀌면 시트 제목으로 포커스
  const page = flow.doc ? `doc-${flow.doc}` : flow.step;
  const titleRef = useFocusOnChange<HTMLHeadingElement>(page);

  function onTrigger(t: AuthTrigger) {
    setTrigger(t);
    flow.backToPrompt();
    flow.setDoc(null);
    setOpen(true);
  }

  return (
    <AuthShell shellRef={setContainer} className="h-dvh overflow-hidden">
      <main className="mx-auto w-full max-w-(--lm-layout-max-width) px-(--lm-layout-gutter) pt-5 pb-10 desktop:pt-10">
        <ContextScene
          idPrefix={ID}
          onTrigger={onTrigger}
          active={open ? trigger : null}
          inert={open}
        />
      </main>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerPortal container={container}>
          <DrawerBackdrop className="z-20" />
          <DrawerViewport className="z-30 desktop:items-center">
            <DrawerPopup
              className={cn(
                "max-h-[calc(100%-3rem)] duration-(--lm-duration-slow) ease-enter data-ending-style:duration-(--lm-duration-fast) data-ending-style:ease-exit",
                "desktop:max-h-[calc(100%-6rem)] desktop:max-w-[26rem] desktop:rounded-sheet desktop:border desktop:border-border desktop:shadow-none",
              )}
            >
              <DrawerHandle className="mt-3 mb-0 h-1 w-9 desktop:hidden" />
              <SheetTopBar
                flow={flow}
                onBack={
                  flow.doc
                    ? () => flow.setDoc(null)
                    : flow.step === "inapp"
                      ? flow.backToPrompt
                      : null
                }
              />
              <div key={page} className={cn("flex min-h-0 flex-1 flex-col", page !== params.view && "la-step")}>
                {flow.doc ? (
                  <DocPage flow={flow} titleRef={titleRef} />
                ) : flow.step === "prompt" ? (
                  <PromptPage flow={flow} trigger={trigger} titleRef={titleRef} />
                ) : flow.step === "terms" ? (
                  <TermsPage flow={flow} titleRef={titleRef} />
                ) : (
                  <InAppPage flow={flow} titleRef={titleRef} />
                )}
              </div>
            </DrawerPopup>
          </DrawerViewport>
        </DrawerPortal>
      </Drawer>
    </AuthShell>
  );
}

/** 시트 맨 위 줄: 왼쪽 뒤로(있을 때), 오른쪽 닫기 */
function SheetTopBar({
  flow,
  onBack,
}: {
  flow: AuthFlow;
  onBack: (() => void) | null;
}) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between px-3 desktop:mt-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label={flow.doc ? copy.documents.back : copy.prompt.back}
          className={iconButton}
        >
          <ArrowLeft aria-hidden className="size-5" strokeWidth={1.5} />
        </button>
      ) : (
        <span aria-hidden className="size-11" />
      )}
      <DrawerClose aria-label={copy.prompt.close} className={iconButton}>
        <X aria-hidden className="size-5" strokeWidth={1.5} />
      </DrawerClose>
    </div>
  );
}

type PageProps = {
  flow: AuthFlow;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
};

/* ---------- 1. 로그인 유도 ---------- */

function PromptPage({
  flow,
  trigger,
  titleRef,
}: PageProps & { trigger: AuthTrigger }) {
  const reason = copy.prompt.reasons[trigger];
  const inApp = flow.env.inApp !== null;
  return (
    <DrawerContent className="px-7 @max-[23.75rem]/screen:px-5">
      <div className="flex flex-col gap-7 pt-1">
        <div className="flex flex-col gap-3">
          <p className="type-caption text-muted-foreground">{reason.eyebrow}</p>
          <DrawerTitle
            ref={titleRef}
            tabIndex={-1}
            className="text-balance outline-none"
          >
            {reason.title}
          </DrawerTitle>
          <DrawerDescription className="break-keep">
            {reason.body}
          </DrawerDescription>
        </div>

        <div className="flex flex-col gap-4">
          {inApp ? (
            <p className="flex items-center gap-2 type-caption text-foreground">
              <ProviderMark provider="kakao" />
              {copy.prompt.inappHint(flow.appName)}
            </p>
          ) : null}
          <PromptStatus flow={flow} />
          <AuthBrandButtons flow={flow} idPrefix={ID} />
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
          <p className="flex items-center gap-2 type-caption break-keep text-muted-foreground">
            <CornerDownLeft aria-hidden className="size-3.5 shrink-0" strokeWidth={1.5} />
            {copy.prompt.returnNoteShort}
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
  );
}

/* ---------- 2. 약관 동의 ---------- */

function TermsPage({ flow, titleRef }: PageProps) {
  const all = allState(flow.consent);
  const missing = flow.missing.length;
  const blocked = missing > 0 || flow.env.offline || flow.termsLoading;
  return (
    <>
      <DrawerContent className="px-7 pb-6 @max-[23.75rem]/screen:px-5">
        <div className="flex flex-col gap-6 pt-1">
          <div className="flex flex-col gap-3">
            <SignedInLine flow={flow} />
            <DrawerTitle
              ref={titleRef}
              tabIndex={-1}
              className="text-balance outline-none"
            >
              {copy.terms.title}
            </DrawerTitle>
            <DrawerDescription>{copy.terms.body}</DrawerDescription>
          </div>

          {flow.termsLoading ? (
            <TermsSkeleton />
          ) : (
            <div className="rounded-card border border-border bg-card">
              <label className="flex min-h-16 cursor-pointer items-center gap-3.5 border-b border-border px-5 py-3">
                <Checkbox
                  size="lg"
                  checked={all === "all"}
                  indeterminate={all === "some"}
                  onCheckedChange={() => flow.toggleAllItems()}
                  disabled={flow.env.offline}
                />
                <span className="flex flex-col gap-0.5">
                  <span className="type-label">{copy.terms.all}</span>
                  <span className="type-caption text-muted-foreground">
                    {copy.terms.allNote}
                  </span>
                </span>
              </label>
              <ul className="flex flex-col py-1.5">
                {TERM_ITEMS.map((t) => (
                  <li key={t.id} className="flex items-center gap-1 pr-3 pl-5">
                    <label className="flex min-h-12 flex-1 cursor-pointer items-center gap-3.5 py-1">
                      <Checkbox
                        checked={flow.consent[t.id]}
                        onCheckedChange={(v) => flow.setTerm(t.id, v)}
                        disabled={flow.env.offline}
                      />
                      <span className="flex flex-wrap items-baseline gap-x-1.5 type-body-sm break-keep">
                        {copy.terms.items[t.id]}
                        <RequiredTag required={t.required} />
                      </span>
                    </label>
                    {t.hasDocument ? (
                      <ViewDocButton id={t.id} onOpen={flow.setDoc} />
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ReviewNotice />
        </div>
      </DrawerContent>

      {/* 시트 바닥 고정: 상태 한 줄 + 주 버튼 */}
      <div className="flex shrink-0 flex-col gap-3 border-t border-border px-7 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] @max-[23.75rem]/screen:px-5">
        <TermsStatus flow={flow} />
        {!flow.env.offline && !flow.submitError ? (
          <p
            role="status"
            className={cn(
              "type-caption",
              missing ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {missing ? copy.terms.missing(missing) : copy.terms.ready}
          </p>
        ) : null}
        <button
          type="button"
          aria-disabled={blocked || undefined}
          aria-busy={flow.submitting || undefined}
          onClick={() => {
            if (!blocked) flow.submit();
          }}
          className={cn(buttonClass("primary"), "w-full")}
        >
          {copy.terms.submit}
        </button>
      </div>
    </>
  );
}

function TermsSkeleton() {
  return (
    <div
      role="status"
      aria-busy
      aria-label={copy.terms.loading}
      className="flex flex-col gap-4 rounded-card border border-border bg-card p-5"
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3.5">
          <span className="size-[1.375rem] rounded-[0.4375rem] bg-skeleton" />
          <span
            className={cn(
              "h-3 rounded-full bg-skeleton",
              i === 0 ? "w-32" : i % 2 ? "w-40" : "w-28",
            )}
          />
        </div>
      ))}
    </div>
  );
}

/* ---------- 2-1. 약관 전문 ---------- */

function DocPage({ flow, titleRef }: PageProps) {
  if (!flow.doc || flow.doc === "age") return null;
  return (
    <DrawerContent className="px-7 @max-[23.75rem]/screen:px-5">
      <div className="flex flex-col gap-5 pt-1">
        <DrawerTitle
          ref={titleRef}
          tabIndex={-1}
          className="outline-none"
        >
          {copy.documents[flow.doc].title}
        </DrawerTitle>
        <TermsDocumentBody id={flow.doc} />
      </div>
    </DrawerContent>
  );
}

/* ---------- 3. 인앱 브라우저 안내 ---------- */

function InAppPage({ flow, titleRef }: PageProps) {
  const guide = flow.guide;
  if (!guide) return null;
  const android = guide.canAutoOpen;
  const showManual = !android || flow.openFailed;
  return (
    <DrawerContent className="px-7 @max-[23.75rem]/screen:px-5">
      <div className="flex flex-col gap-6 pt-1">
        <div className="flex flex-col gap-3">
          <p className="type-caption text-muted-foreground">{flow.appName}</p>
          <DrawerTitle
            ref={titleRef}
            tabIndex={-1}
            className="text-balance outline-none"
          >
            {copy.inapp.title}
          </DrawerTitle>
          <DrawerDescription className="break-keep">
            {copy.inapp.body(flow.appName)}
          </DrawerDescription>
        </div>

        {flow.env.offline ? (
          <AuthNote kind="offline" title={copy.prompt.offline} body={copy.inapp.offlineBody} />
        ) : flow.opening ? (
          <AuthNote kind="progress" title={copy.inapp.opening} body={copy.inapp.openingBody} />
        ) : flow.openFailed ? (
          <AuthNote kind="error" title={copy.inapp.openFailed} body={copy.inapp.openFailedBody} />
        ) : null}

        {android && !flow.openFailed ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={flow.openExternal}
              aria-disabled={flow.env.offline || flow.opening || undefined}
              className={cn(buttonClass("primary"), "w-full")}
            >
              {copy.inapp.openExternal}
            </button>
            <p className="type-caption text-muted-foreground">
              {copy.inapp.androidAuto}
            </p>
          </div>
        ) : null}

        {showManual ? (
          <div className="flex flex-col gap-5">
            <MenuDiagram guide={guide} />
            <InAppSteps guide={guide} />
            <button
              type="button"
              onClick={() => void flow.copyLink()}
              className={cn(buttonClass("secondary"), "w-full")}
            >
              {copy.inapp.copyLink}
            </button>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-border pt-5">
          <p className="type-caption text-muted-foreground">
            {copy.inapp.kakaoFaster}
          </p>
          <BrandLoginButton
            provider="kakao"
            blocked={flow.env.offline || flow.pending !== null}
            busy={flow.pending === "kakao"}
            onPress={() => flow.pick("kakao")}
          />
        </div>
      </div>
    </DrawerContent>
  );
}
