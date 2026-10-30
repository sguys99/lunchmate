"use client";
// 로그인 시안 B "전용 화면" (T4.2). 로그인은 /login 같은 한 장의 조용한 화면이다. 둘러보던 화면을 덮지 않고 그 자리를 떠난다.
// - 이어짐은 맨 위 "맥락 줄"이 맡는다: 누른 행동과 대상(정담국밥으로 투표 만들기)을 일러스트와 함께 보여 주고 뒤로 가면 그대로 돌아간다.
// - 위에는 세리프 제목과 이유, 엄지 자리(하단 1/3)에는 브랜드 버튼. 약관과 인앱 안내도 같은 틀의 다음 화면이다.
// - 약관은 헤어라인으로만 나눈 목록(카드 면 없음). 주 버튼은 늘 눌리고, 필수가 비어 있으면 누를 때 빠진 줄을 짚어 준다
//   (빠진 줄의 "필수"가 destructive 글자로 바뀌고 첫 빠진 체크박스로 포커스, 버튼 위 한 줄로 개수 안내).
// - 데스크톱(1024 이상): 왼쪽 카드 면 칸(세리프 문장, 로그인하면 되는 일 3가지 또는 그림) + 오른쪽 행동 칸 2단.
import { ArrowLeft, ChevronRight, CornerDownLeft } from "lucide-react";
import { useState, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { Checkbox } from "@/components/ui/checkbox";
import { focusRing } from "@/components/ui/interaction";
import { authLabCopy, type AuthTermId } from "@/copy/design-lab-auth";
import { MOCK_HOME_TODAY } from "@/features/design-lab/mock";
import { BrandLoginButton } from "@/features/design-lab/landing/shared/brand-button";
import { CategoryIllustration } from "@/features/place/illustrations";
import { cn } from "@/lib/utils";
import type { AuthParams } from "../shared/params";
import {
  AuthBrandButtons,
  AuthNote,
  AuthShell,
  InAppSteps,
  MenuDiagram,
  PromptStatus,
  ProviderMark,
  RequiredTag,
  ReviewNotice,
  SignedInLine,
  TermsDocumentBody,
  TermsStatus,
  Wordmark,
} from "../shared/parts";
import { allState, TERM_ITEMS } from "../shared/terms";
import {
  useAuthFlow,
  useFocusOnChange,
  type AuthFlow,
} from "../shared/use-auth-flow";

const copy = authLabCopy;
const ID = "auth-b";
const place = MOCK_HOME_TODAY[0]!;

const iconButton = cn(
  "inline-flex size-11 items-center justify-center rounded-full text-foreground hover:bg-muted",
  focusRing,
);

export function AuthB({ params }: { params: AuthParams }) {
  const flow = useAuthFlow(params);
  const page = flow.doc ? `doc-${flow.doc}` : flow.step;
  const titleRef = useFocusOnChange<HTMLHeadingElement>(page);
  const animate = page !== params.view;

  const back = flow.doc
    ? () => flow.setDoc(null)
    : flow.step === "inapp"
      ? flow.backToPrompt
      : null;

  return (
    <AuthShell>
      <div className="flex min-h-dvh flex-1 flex-col desktop:grid desktop:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* 왼쪽 칸(데스크톱만): 카드 면 위 세리프 문장 */}
        <Aside flow={flow} />

        <div className="flex min-h-dvh flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between px-3 desktop:px-10">
            <button
              type="button"
              onClick={back ?? undefined}
              aria-label={
                flow.doc
                  ? copy.documents.back
                  : back
                    ? copy.prompt.back
                    : copy.prompt.keepBrowsing
              }
              className={iconButton}
            >
              <ArrowLeft aria-hidden className="size-5" strokeWidth={1.5} />
            </button>
            <Wordmark className="desktop:hidden" />
            <span aria-hidden className="size-11" />
          </header>

          <main
            key={page}
            className={cn(
              "mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) desktop:max-w-[26rem] desktop:justify-center desktop:px-0",
              animate && "la-step",
            )}
          >
            {flow.doc ? (
              <DocPage flow={flow} titleRef={titleRef} />
            ) : flow.step === "prompt" ? (
              <PromptPage flow={flow} titleRef={titleRef} />
            ) : flow.step === "terms" ? (
              <TermsPage flow={flow} titleRef={titleRef} />
            ) : (
              <InAppPage flow={flow} titleRef={titleRef} />
            )}
          </main>
        </div>
      </div>
    </AuthShell>
  );
}

/* ---------- 데스크톱 왼쪽 칸 ---------- */

function Aside({ flow }: { flow: AuthFlow }) {
  let body: ReactNode;
  if (flow.step === "inapp" && flow.guide) {
    body = (
      <MenuDiagram
        guide={flow.guide}
        size="lg"
        className="w-full max-w-[22rem]"
      />
    );
  } else if (flow.step === "terms") {
    body = (
      <div className="flex flex-col gap-6">
        <p className="type-display text-balance break-keep">
          {copy.terms.titleShort}
        </p>
        <ReviewNotice className="max-w-[22rem] type-body-sm" />
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col gap-10">
        <p className="type-display text-balance break-keep">
          {copy.prompt.benefitsLabel}
        </p>
        <dl className="flex max-w-[24rem] flex-col divide-y divide-border border-y border-border">
          {copy.prompt.benefits.map((b) => (
            <div key={b.title} className="flex items-baseline gap-6 py-4">
              <dt className="w-14 shrink-0 type-label">{b.title}</dt>
              <dd className="type-body-sm text-muted-foreground">{b.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }
  return (
    <aside
      aria-hidden={flow.step === "inapp" ? undefined : true}
      className="hidden desktop:flex desktop:flex-col desktop:justify-between desktop:border-r desktop:border-border desktop:bg-card desktop:px-16 desktop:py-12"
    >
      <Wordmark />
      {body}
      <span />
    </aside>
  );
}

type PageProps = {
  flow: AuthFlow;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
};

/** 화면 아래(엄지 자리)에 붙는 행동 묶음. 모바일은 sticky, 데스크톱은 흐름 그대로 */
function BottomZone({
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

/* ---------- 1. 로그인 유도 ---------- */

function PromptPage({ flow, titleRef }: PageProps) {
  const reason = copy.prompt.reasons[flow.params.trigger];
  return (
    <>
      <div className="flex flex-col gap-8 pt-4 pb-10 desktop:pt-0 desktop:pb-0">
        {/* 맥락 줄: 무엇을 하려다 왔는지 */}
        <p className="flex items-center gap-3">
          <CategoryIllustration slug={place.category} size={40} />
          <span className="flex flex-col">
            <span className="type-caption text-muted-foreground">
              {place.name}
            </span>
            <span className="type-label">{reason.eyebrow}</span>
          </span>
        </p>
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
        {/* 모바일: 제목과 버튼 사이 여백에 로그인하면 되는 일 세 가지(데스크톱은 왼쪽 칸) */}
        <dl className="flex flex-col divide-y divide-border border-y border-border desktop:hidden">
          {copy.prompt.benefits.map((b) => (
            <div key={b.title} className="flex items-baseline gap-5 py-3">
              <dt className="w-12 shrink-0 type-caption text-foreground">
                {b.title}
              </dt>
              <dd className="type-caption text-muted-foreground">{b.body}</dd>
            </div>
          ))}
        </dl>
      </div>

      <BottomZone>
        <PromptStatus flow={flow} className="pb-1" />
        {flow.env.inApp ? (
          <p className="flex items-center gap-2 type-caption text-foreground">
            <ProviderMark provider="kakao" />
            {copy.prompt.inappHint(flow.appName)}
          </p>
        ) : null}
        <AuthBrandButtons flow={flow} idPrefix={ID} />
        <p className="flex items-center justify-center gap-2 pt-1 type-caption text-muted-foreground">
          <CornerDownLeft aria-hidden className="size-3.5" strokeWidth={1.5} />
          {copy.prompt.returnNote}
        </p>
      </BottomZone>
    </>
  );
}

/* ---------- 2. 약관 동의 ---------- */

function TermsPage({ flow, titleRef }: PageProps) {
  const all = allState(flow.consent);
  const missing = flow.missing.length;
  const [shown, setShown] = useState(false);

  function onSubmit() {
    const r = flow.submit();
    setShown(true);
    if (r.firstMissing) {
      document
        .querySelector<HTMLElement>(
          `#${ID}-term-${r.firstMissing} [role=checkbox]`,
        )
        ?.focus();
    }
  }

  return (
    <>
      <div className="flex flex-col gap-7 pt-4 pb-8 desktop:pt-0">
        <div className="flex flex-col gap-3">
          <SignedInLine flow={flow} />
          <h1
            ref={titleRef}
            tabIndex={-1}
            className="type-title text-balance break-keep outline-none"
          >
            {copy.terms.title}
          </h1>
          <p className="type-body-sm text-muted-foreground">
            {copy.terms.body}
          </p>
        </div>

        {flow.termsLoading ? (
          <div
            role="status"
            aria-busy
            aria-label={copy.terms.loading}
            className="flex flex-col divide-y divide-border border-y border-border"
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex h-14 items-center gap-4">
                <span className="size-[1.375rem] rounded-[0.4375rem] bg-skeleton" />
                <span
                  className={cn(
                    "h-3 rounded-full bg-skeleton",
                    i % 2 ? "w-40" : "w-28",
                  )}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            <label className="flex min-h-16 cursor-pointer items-center gap-4 border-b border-foreground/80 pb-2">
              <Checkbox
                size="lg"
                checked={all === "all"}
                indeterminate={all === "some"}
                onCheckedChange={() => flow.toggleAllItems()}
                disabled={flow.env.offline}
              />
              <span className="type-body font-medium">{copy.terms.all}</span>
            </label>
            <ul className="flex flex-col divide-y divide-border border-b border-border">
              {TERM_ITEMS.map((t) => {
                const flagged =
                  flow.attempted && t.required && !flow.consent[t.id];
                const note = copy.terms.itemNotes[t.id];
                return (
                  <li
                    key={t.id}
                    id={`${ID}-term-${t.id}`}
                    className="flex items-center gap-2"
                  >
                    <label className="flex min-h-14 flex-1 cursor-pointer items-center gap-4 py-2.5">
                      <Checkbox
                        checked={flow.consent[t.id]}
                        onCheckedChange={(v) => flow.setTerm(t.id, v)}
                        disabled={flow.env.offline}
                        aria-invalid={flagged || undefined}
                      />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="flex flex-wrap items-baseline gap-x-2 type-body-sm break-keep">
                          {copy.terms.items[t.id]}
                          <RequiredTag
                            required={t.required}
                            emphasize={flagged}
                          />
                        </span>
                        {note ? (
                          <span className="type-caption break-keep text-muted-foreground">
                            {note}
                          </span>
                        ) : null}
                      </span>
                    </label>
                    {t.hasDocument ? (
                      <DocChevron id={t.id} onOpen={flow.setDoc} />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <ReviewNotice className="desktop:hidden" />
      </div>

      <BottomZone className="border-t border-border desktop:border-t-0">
        <TermsStatus flow={flow} />
        {shown && missing > 0 && !flow.env.offline ? (
          <p role="alert" className="type-caption text-destructive">
            {copy.terms.missing(missing)}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onSubmit}
          aria-disabled={flow.env.offline || flow.termsLoading || undefined}
          aria-busy={flow.submitting || undefined}
          className={cn(buttonClass("primary"), "w-full")}
        >
          {copy.terms.submit}
        </button>
      </BottomZone>
    </>
  );
}

function DocChevron({
  id,
  onOpen,
}: {
  id: AuthTermId;
  onOpen: (id: AuthTermId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(id)}
      aria-label={copy.terms.viewLabel(copy.terms.items[id])}
      className={cn(
        "-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
        focusRing,
      )}
    >
      <ChevronRight aria-hidden className="size-5" strokeWidth={1.5} />
    </button>
  );
}

/* ---------- 2-1. 약관 전문 ---------- */

function DocPage({ flow, titleRef }: PageProps) {
  if (!flow.doc || flow.doc === "age") return null;
  const id = flow.doc;
  const checked = flow.consent[id];
  return (
    <>
      <div className="flex flex-col gap-6 pt-4 pb-8 desktop:pt-0">
        <h1 ref={titleRef} tabIndex={-1} className="type-title outline-none">
          {copy.documents[id].title}
        </h1>
        <TermsDocumentBody id={id} />
      </div>
      <BottomZone className="border-t border-border desktop:border-t-0">
        <button
          type="button"
          onClick={() => {
            if (!checked) flow.setTerm(id, true);
            flow.setDoc(null);
          }}
          className={cn(buttonClass("secondary"), "w-full")}
        >
          {checked ? copy.documents.back : copy.terms.items[id]}
        </button>
      </BottomZone>
    </>
  );
}

/* ---------- 3. 인앱 브라우저 안내 ---------- */

function InAppPage({ flow, titleRef }: PageProps) {
  const guide = flow.guide;
  if (!guide) return null;
  const android = guide.canAutoOpen;
  const showManual = !android || flow.openFailed;
  return (
    <>
      <div className="flex flex-col gap-7 pt-4 pb-8 desktop:pt-0">
        <div className="flex flex-col gap-3">
          <p className="type-caption text-muted-foreground">{flow.appName}</p>
          <h1
            ref={titleRef}
            tabIndex={-1}
            className="type-title text-balance break-keep outline-none"
          >
            {copy.inapp.titleShort}
          </h1>
          <p className="type-body-sm break-keep text-muted-foreground">
            {copy.inapp.body(flow.appName)}
          </p>
        </div>

        {flow.env.offline ? (
          <AuthNote
            kind="offline"
            title={copy.prompt.offline}
            body={copy.inapp.offlineBody}
          />
        ) : flow.opening ? (
          <AuthNote
            kind="progress"
            title={copy.inapp.opening}
            body={copy.inapp.openingBody}
          />
        ) : flow.openFailed ? (
          <AuthNote
            kind="error"
            title={copy.inapp.openFailed}
            body={copy.inapp.openFailedBody}
          />
        ) : null}

        {showManual ? (
          <div className="flex flex-col gap-6">
            <MenuDiagram guide={guide} size="sm" className="desktop:hidden" />
            <InAppSteps guide={guide} />
          </div>
        ) : null}
      </div>

      <BottomZone>
        {android && !flow.openFailed ? (
          <button
            type="button"
            onClick={flow.openExternal}
            aria-disabled={flow.env.offline || flow.opening || undefined}
            className={cn(buttonClass("primary"), "w-full")}
          >
            {copy.inapp.openExternal}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void flow.copyLink()}
            className={cn(buttonClass("secondary"), "w-full")}
          >
            {copy.inapp.copyLink}
          </button>
        )}
        <div className="flex items-center gap-3 py-1" aria-hidden>
          <span className="h-px flex-1 bg-border" />
          <span className="type-caption text-muted-foreground">
            {copy.inapp.orKakao}
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <BrandLoginButton
          provider="kakao"
          blocked={flow.env.offline || flow.pending !== null}
          busy={flow.pending === "kakao"}
          onPress={() => flow.pick("kakao")}
        />
      </BottomZone>
    </>
  );
}
