"use client";
// 로그인 시안 C "제자리 카드" (T4.2). 덮는 것(시트, 새 화면)이 없다. 누른 행동 바로 아래에 카드가 펼쳐지고,
// 로그인 → 약관 → 인앱 안내가 모두 그 카드 안에서 바뀐다. 오늘 화면(추천 카드)은 위에 그대로 남는다.
// - 펼침은 높이 전환 하나(base 260 standard, auth.css la-reveal). 카드가 열리면 화면이 카드까지 부드럽게 내려간다.
// - 약관은 "모두 동의" 한 줄 + 요약 한 줄이 기본이고, "항목 펼치기"로 네 항목과 전문을 제자리에서 연다.
//   주 버튼은 원래 하려던 일을 이어서 말한다("동의하고 투표 만들기"). 필수가 비면 비활성 모양 + 남은 개수 한 줄.
// - 인앱에서 구글을 누르면 구글 버튼 바로 아래에 안내가 펼쳐진다(카드 안의 카드가 아니라 헤어라인 한 줄 아래).
// - 데스크톱(1024 이상): 홈과 같은 좌 리스트(최대 460) + 우 지도 자리 2단. 카드는 리스트 칸 안에서 펼쳐진다.
import { ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { Checkbox } from "@/components/ui/checkbox";
import { focusRing } from "@/components/ui/interaction";
import {
  authLabCopy,
  type AuthTermId,
  type AuthTrigger,
} from "@/copy/design-lab-auth";
import { BrandLoginButton } from "@/features/design-lab/landing/shared/brand-button";
import { MOCK_HOME_TODAY } from "@/features/design-lab/mock";
import { MapPlaceholder } from "@/features/design-lab/system/desktop-split";
import { cn } from "@/lib/utils";
import type { AuthParams } from "../shared/params";
import {
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
} from "../shared/parts";
import { allState, TERM_ITEMS } from "../shared/terms";
import {
  useAuthFlow,
  useFocusOnChange,
  type AuthFlow,
} from "../shared/use-auth-flow";

const copy = authLabCopy;
const ID = "auth-c";

const textButton = cn(
  "inline-flex h-11 shrink-0 items-center gap-1 type-caption text-foreground underline decoration-muted-foreground underline-offset-3 hover:decoration-foreground",
  focusRing,
);

export function AuthC({ params }: { params: AuthParams }) {
  const flow = useAuthFlow(params);
  const [open, setOpen] = useState(true);
  const [trigger, setTrigger] = useState<AuthTrigger>(params.trigger);
  const cardRef = useRef<HTMLDivElement | null>(null);
  // 인앱 안내는 카드 안 구글 아래에 펼쳐지므로 카드 단계는 로그인(prompt)과 약관(terms) 둘이다
  const stage = flow.step === "terms" ? "terms" : "prompt";
  const titleRef = useFocusOnChange<HTMLHeadingElement>(`${stage}-${open}`);

  function onTrigger(t: AuthTrigger) {
    if (open && t === trigger && flow.step !== "terms") {
      setOpen(false);
      return;
    }
    setTrigger(t);
    if (flow.step === "inapp") flow.backToPrompt();
    setOpen(true);
  }

  // 열리거나 단계가 바뀌면 카드가 보이게 내린다(축소 모드는 즉시)
  // 첫 렌더(와 개발 모드 이중 실행)에서는 움직이지 않게 직전 값과 비교한다
  const prevKey = useRef(`${open}-${stage}`);
  useEffect(() => {
    const key = `${open}-${stage}`;
    if (prevKey.current === key) return;
    prevKey.current = key;
    if (!open) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    cardRef.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "nearest",
    });
  }, [open, stage]);

  const actionLabel = copy.context.actions[trigger];

  return (
    <AuthShell>
      <div className="flex flex-1 flex-col desktop:grid desktop:grid-cols-[minmax(0,28.75rem)_minmax(0,1fr)]">
        <main className="mx-auto w-full max-w-(--lm-layout-max-width) px-(--lm-layout-gutter) pt-5 pb-12 desktop:mx-0 desktop:max-w-none desktop:px-10 desktop:pt-8">
          <ContextScene
            idPrefix={ID}
            onTrigger={onTrigger}
            active={open ? trigger : null}
            slot={
              <div
                className="la-reveal -mt-1"
                data-open={open}
                // 닫힌 동안은 안의 버튼에 포커스가 가지 않게
                inert={!open || undefined}
              >
                <div>
                  <div
                    ref={cardRef}
                    className="relative mt-1 scroll-mb-6 rounded-card border border-border bg-card"
                  >
                    {/* 누른 행동을 가리키는 작은 꼬리(1px 선) */}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute -top-[0.4375rem] size-3 rotate-45 border-t border-l border-border bg-card",
                        trigger === "poll"
                          ? "left-12"
                          : trigger === "save"
                            ? "right-[4.25rem]"
                            : "right-4",
                      )}
                    />
                    <div key={stage} className={cn(stage !== params.view && stage === "terms" && "la-step")}>
                      {stage === "terms" ? (
                        <TermsCard
                          flow={flow}
                          titleRef={titleRef}
                          actionLabel={actionLabel}
                        />
                      ) : (
                        <PromptCard
                          flow={flow}
                          trigger={trigger}
                          titleRef={titleRef}
                          onClose={() => setOpen(false)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            }
          />
        </main>
        {/* 데스크톱 지도 자리(목업): 홈 D1과 같은 우 지도 칸, 오늘의 한 곳 핀 하나 */}
        <MapPlaceholder className="hidden desktop:block desktop:border-l desktop:border-border">
          <div aria-hidden className="absolute inset-0 overflow-hidden">
            <span className="absolute top-[30%] -left-1/4 h-px w-[150%] rotate-[-8deg] bg-border" />
            <span className="absolute top-[62%] -left-1/4 h-px w-[150%] rotate-[4deg] bg-border" />
            <span className="absolute top-0 left-[55%] h-full w-px rotate-[10deg] bg-border" />
            <span className="absolute top-0 left-[22%] h-full w-px rotate-[-3deg] bg-border" />
            <span className="absolute top-[38%] left-[42%] flex -translate-x-1/2 -translate-y-full flex-col items-center gap-1.5">
              <span className="rounded-chip border border-primary bg-card px-3 py-1 type-caption whitespace-nowrap">
                {MOCK_HOME_TODAY[0]!.name}
              </span>
              <span className="size-2 rounded-full bg-primary ring-4 ring-background" />
            </span>
          </div>
        </MapPlaceholder>
      </div>
    </AuthShell>
  );
}

type CardProps = {
  flow: AuthFlow;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
};

/* ---------- 1. 로그인 유도 (+ 인앱 구글 안내) ---------- */

function PromptCard({
  flow,
  trigger,
  titleRef,
  onClose,
}: CardProps & { trigger: AuthTrigger; onClose: () => void }) {
  const reason = copy.prompt.reasons[trigger];
  const inApp = flow.env.inApp !== null;
  const showGuide = flow.step === "inapp";
  return (
    <section aria-labelledby={`${ID}-title`} className="flex flex-col gap-5 p-5 @max-[23.75rem]/screen:p-4">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-1">
          <h2
            id={`${ID}-title`}
            ref={titleRef}
            tabIndex={-1}
            className="type-label break-keep outline-none"
          >
            {reason.title}
          </h2>
          <p className="type-body-sm break-keep text-muted-foreground">
            {reason.body}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={copy.prompt.close}
          className={cn(
            "-mt-2 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
            focusRing,
          )}
        >
          <X aria-hidden className="size-5" strokeWidth={1.5} />
        </button>
      </div>

      <PromptStatus flow={flow} />

      <ul aria-label={copy.prompt.groupLabel} className="flex flex-col gap-2.5">
        {(["kakao", "naver", "google"] as const).map((id) => (
          <li key={id} className="flex flex-col">
            <BrandLoginButton
              provider={id}
              blocked={
                flow.env.offline ||
                (flow.pending !== null && flow.pending !== id)
              }
              busy={flow.pending === id}
              onPress={() => {
                if (id === "google" && showGuide) flow.backToPrompt();
                else flow.pick(id);
              }}
              describedBy={inApp && id === "google" ? `${ID}-google-note` : undefined}
            />
            {id === "kakao" && inApp ? (
              <p className="flex items-center gap-2 pt-2 pb-1 type-caption text-foreground">
                <ProviderMark provider="kakao" className="size-4 rounded-[0.3rem] [&_svg]:size-2.5" />
                {copy.prompt.inappHint(flow.appName)}
              </p>
            ) : null}
            {id === "google" && inApp ? (
              <>
                <p id={`${ID}-google-note`} className="sr-only">
                  {copy.prompt.googleBlocked(flow.appName)}
                </p>
                <div className="la-reveal" data-open={showGuide} inert={!showGuide || undefined}>
                  <div>
                    <InAppGuide flow={flow} />
                  </div>
                </div>
              </>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="type-caption break-keep text-muted-foreground">
        {copy.prompt.returnNote}
      </p>
    </section>
  );
}

function InAppGuide({ flow }: { flow: AuthFlow }) {
  const guide = flow.guide;
  const [stepsOpen, setStepsOpen] = useState(false);
  if (!guide) return null;
  const android = guide.canAutoOpen;
  const manual = !android || flow.openFailed || stepsOpen;
  return (
    <div
      role="region"
      aria-label={copy.inapp.titleShort}
      className="mt-3 flex flex-col gap-4 border-t border-border pt-4"
    >
      <div className="flex flex-col gap-1">
        <p className="type-label break-keep">{copy.inapp.bodyShort(flow.appName)}</p>
        <p className="type-caption break-keep text-muted-foreground">
          {android && !flow.openFailed ? copy.inapp.androidAuto : copy.inapp.titleShort}
        </p>
      </div>

      {flow.env.offline ? (
        <AuthNote kind="offline" title={copy.prompt.offline} body={copy.inapp.offlineBody} />
      ) : flow.opening ? (
        <AuthNote kind="progress" title={copy.inapp.opening} body={copy.inapp.openingBody} />
      ) : flow.openFailed ? (
        <AuthNote kind="error" title={copy.inapp.openFailed} body={copy.inapp.openFailedBody} />
      ) : null}

      {manual ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 @min-[25rem]/screen:grid-cols-[minmax(0,9rem)_minmax(0,1fr)] @min-[25rem]/screen:items-center">
          <MenuDiagram guide={guide} size="sm" className="h-40" />
          <InAppSteps guide={guide} dense />
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {android && !flow.openFailed ? (
          <button
            type="button"
            onClick={flow.openExternal}
            aria-disabled={flow.env.offline || flow.opening || undefined}
            className={cn(buttonClass("primary"), "w-full")}
          >
            {copy.inapp.openExternal}
          </button>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void flow.copyLink()}
            className={cn(buttonClass("secondary", "sm"), "px-4")}
          >
            {copy.inapp.copyLink}
          </button>
          {android && !flow.openFailed ? (
            <button
              type="button"
              aria-expanded={stepsOpen}
              onClick={() => setStepsOpen((v) => !v)}
              className={textButton}
            >
              {stepsOpen ? copy.inapp.hideSteps : copy.inapp.toggleSteps}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ---------- 2. 약관 동의 (제자리, 한 줄 요약 펼침) ---------- */

function TermsCard({
  flow,
  titleRef,
  actionLabel,
}: CardProps & { actionLabel: string }) {
  const all = allState(flow.consent);
  const missing = flow.missing.length;
  const blocked = missing > 0 || flow.env.offline || flow.termsLoading;
  // 필수 하나라도 일부만 고른 상태면 처음부터 펼쳐 둔다
  const [expanded, setExpanded] = useState(false);
  const [openDoc, setOpenDoc] = useState<AuthTermId | null>(null);
  const listId = `${ID}-terms-list`;

  return (
    <section aria-labelledby={`${ID}-terms-title`} className="flex flex-col">
      <div className="flex flex-col gap-1.5 p-5 pb-4 @max-[23.75rem]/screen:p-4">
        <SignedInLine flow={flow} />
        <h2
          id={`${ID}-terms-title`}
          ref={titleRef}
          tabIndex={-1}
          className="pt-1 type-heading break-keep outline-none"
        >
          {copy.terms.titleShort}
        </h2>
      </div>

      {flow.termsLoading ? (
        <div role="status" aria-busy aria-label={copy.terms.loading} className="flex items-center gap-4 border-y border-border px-5 py-5">
          <span className="size-[1.625rem] rounded-[0.4375rem] bg-skeleton" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="h-3 w-32 rounded-full bg-skeleton" />
            <span className="h-2.5 w-48 rounded-full bg-skeleton" />
          </span>
        </div>
      ) : (
        <div className="border-y border-border">
          <div className="flex items-start gap-2 px-5 py-3 @max-[23.75rem]/screen:px-4">
            <label className="flex min-h-14 flex-1 cursor-pointer items-start gap-3.5 py-1">
              <Checkbox
                size="lg"
                checked={all === "all"}
                indeterminate={all === "some"}
                onCheckedChange={() => flow.toggleAllItems()}
                disabled={flow.env.offline}
                className="mt-0.5"
              />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="type-label">{copy.terms.all}</span>
                <span className="type-caption break-keep text-muted-foreground">
                  {copy.terms.allSummary}
                </span>
              </span>
            </label>
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={listId}
              aria-label={expanded ? copy.terms.detailsHide : copy.terms.details}
              onClick={() => setExpanded((v) => !v)}
              className={cn(
                "-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
                focusRing,
              )}
            >
              <ChevronDown
                aria-hidden
                className={cn(
                  "size-5 transition-transform duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
                  expanded && "rotate-180",
                )}
                strokeWidth={1.5}
              />
            </button>
          </div>

          <div id={listId} className="la-reveal" data-open={expanded} inert={!expanded || undefined}>
            <div>
              <ul className="flex flex-col border-t border-border bg-background/50 px-5 py-2 @max-[23.75rem]/screen:px-4">
                {TERM_ITEMS.map((t) => {
                  const docOpen = openDoc === t.id;
                  return (
                    <li key={t.id} className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <label className="flex min-h-12 flex-1 cursor-pointer items-center gap-3.5 py-1 pl-0.5">
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
                          <button
                            type="button"
                            aria-expanded={docOpen}
                            aria-label={copy.terms.viewLabel(copy.terms.items[t.id])}
                            onClick={() => setOpenDoc(docOpen ? null : t.id)}
                            className={cn(textButton, "px-1 text-muted-foreground")}
                          >
                            {copy.terms.view}
                          </button>
                        ) : null}
                      </div>
                      {t.id !== "age" ? (
                        <div className="la-reveal" data-open={docOpen} inert={!docOpen || undefined}>
                          <div>
                            <TermsDocumentBody
                              id={t.id}
                              className="mb-3 ml-9 max-h-48 gap-4 overflow-y-auto rounded-md border border-border bg-card p-4"
                            />
                          </div>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 p-5 pt-4 @max-[23.75rem]/screen:p-4">
        <ReviewNotice />
        <TermsStatus flow={flow} />
        {!flow.env.offline && !flow.submitError ? (
          <p role="status" className={cn("type-caption", missing ? "text-muted-foreground" : "text-foreground")}>
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
          {copy.terms.submitContinue(actionLabel)}
        </button>
      </div>
    </section>
  );
}
