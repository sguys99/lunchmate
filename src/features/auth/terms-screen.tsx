"use client";
// 첫 로그인 약관 동의 전용 화면 /welcome/terms (T4.11, PRD AUTH-02, AUTH-06, D-08 B + 안건 6~9, 12, DESIGN.md 5장).
// - 항목은 필수 3개뿐(만 14세 이상, 이용약관, 개인정보 수집 이용). 카드 면 없이 헤어라인 목록, 맨 위 "모두 동의합니다".
// - 필수가 남아 있으면 동의 버튼은 꺼진 모양 + aria-disabled(초점은 받음), 바로 위 한 줄이 남은 개수를 실시간으로 말한다.
// - 버튼 문구는 하려던 일을 잇는다(termsAction): "동의하고 투표 참여하기", 맥락이 없으면 "동의하고 시작하기".
// - 제출은 서버 액션(agreeToTerms). 실패해도 고른 항목은 그대로 두고 다시 누르기를 안내한다.
// - "나중에 하기"는 로그아웃하고 둘러보기(/today)로 돌아간다(안건 9). 다음 로그인 때 다시 묻는다.
// - 4상태: 로딩은 페이지 Suspense 스켈레톤(TermsSkeleton), 저장 중은 버튼 aria-busy + 2px 진행 선, 오류는 버튼 위 안내,
//   오프라인은 버튼을 막고 안내. 빈 상태는 해당 없음.
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { Checkbox } from "@/components/ui/checkbox";
import { focusRing } from "@/components/ui/interaction";
import { authCopy } from "@/copy/auth";
import {
  agreeToTerms,
  type TermsActionState,
} from "@/app/welcome/terms/actions";
import { useOnlineStatus } from "@/lib/network";
import { cn } from "@/lib/utils";
import { AuthFrame, AuthNote, BottomZone, ProviderMark } from "./auth-parts";
import type { LoginProvider } from "./providers";
import {
  allState,
  EMPTY_CONSENT,
  missingRequired,
  setItem,
  TERM_ITEMS,
  toggleAll,
  type Consent,
  type TermsAction,
} from "./terms";

const copy = authCopy.terms;
const SIGN_OUT_ACTION = "/auth/sign-out";
const INITIAL: TermsActionState = { error: null };
const LATER_FORM = "terms-later";

export type TermsScreenProps = {
  /** 검사를 마친 내부 경로 */
  next: string;
  action: TermsAction;
  /** 로그인한 제공자. 모르면 null */
  provider: LoginProvider | null;
};

export function TermsScreen({ next, action, provider }: TermsScreenProps) {
  const online = useOnlineStatus();
  const [consent, setConsent] = useState<Consent>(EMPTY_CONSENT);
  const [state, formAction, saving] = useActionState(agreeToTerms, INITIAL);
  const all = allState(consent);
  const missing = missingRequired(consent).length;
  const blocked = missing > 0 || !online || saving;

  return (
    <AuthFrame
      aside={
        <div className="flex flex-col gap-6">
          <p className="type-display text-balance break-keep">
            {copy.titleShort}
          </p>
          <p className="max-w-[22rem] type-body-sm break-keep text-muted-foreground">
            {copy.reviewNotice}
          </p>
        </div>
      }
    >
      <form
        action={formAction}
        onSubmit={(e) => {
          if (blocked) e.preventDefault();
        }}
        className="flex flex-1 flex-col"
      >
        <input type="hidden" name="next" value={next} />
        {TERM_ITEMS.map((t) =>
          consent[t.id] ? (
            <input key={t.id} type="hidden" name={t.id} value="on" />
          ) : null,
        )}

        <div className="flex flex-col gap-7 pt-4 pb-8 desktop:pt-0">
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 type-caption text-muted-foreground">
              {provider ? <ProviderMark provider={provider} /> : null}
              {provider
                ? copy.signedIn(authCopy.providerNames[provider])
                : copy.signedInUnknown}
            </p>
            <h1 className="type-title text-balance break-keep">{copy.title}</h1>
            <p className="type-body-sm break-keep text-muted-foreground">
              {copy.body}
            </p>
          </div>

          <div className="flex flex-col">
            <label className="flex min-h-16 cursor-pointer items-center gap-4 border-b border-foreground/80 pb-2">
              <Checkbox
                size="lg"
                checked={all === "all"}
                indeterminate={all === "some"}
                onCheckedChange={() => setConsent((c) => toggleAll(c))}
              />
              <span className="type-body font-medium break-keep">
                {copy.all}
              </span>
            </label>
            <ul className="flex flex-col divide-y divide-border border-b border-border">
              {TERM_ITEMS.map((t) => {
                const note = copy.itemNotes[t.id];
                const title = copy.items[t.id];
                return (
                  <li key={t.id} className="flex items-center gap-2">
                    <label className="flex min-h-14 flex-1 cursor-pointer items-center gap-4 py-2.5">
                      <Checkbox
                        checked={consent[t.id]}
                        onCheckedChange={(v) =>
                          setConsent((c) => setItem(c, t.id, v))
                        }
                      />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="flex flex-wrap items-baseline gap-x-2 type-body-sm break-keep">
                          {title}
                          <span className="type-caption whitespace-nowrap text-foreground">
                            {copy.required}
                          </span>
                        </span>
                        {note ? (
                          <span className="type-caption break-keep text-muted-foreground">
                            {note}
                          </span>
                        ) : null}
                      </span>
                    </label>
                    {t.href ? (
                      <Link
                        href={t.href}
                        target="_blank"
                        rel="noopener"
                        prefetch={false}
                        aria-label={copy.viewLabel(title)}
                        className={cn(
                          "inline-flex h-11 shrink-0 items-center gap-1 px-1 type-caption text-muted-foreground underline decoration-muted-foreground/60 underline-offset-3 hover:text-foreground",
                          focusRing,
                        )}
                      >
                        {copy.view}
                        <ExternalLink
                          aria-hidden
                          className="size-3.5"
                          strokeWidth={1.5}
                        />
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="type-caption break-keep text-muted-foreground desktop:hidden">
            {copy.reviewNotice}
          </p>
        </div>

        <BottomZone className="border-t border-border desktop:border-t-0">
          {!online ? (
            <AuthNote
              kind="offline"
              title={copy.offline}
              body={copy.offlineBody}
            />
          ) : saving ? (
            <AuthNote kind="progress" title={copy.saving} />
          ) : state.error ? (
            <AuthNote kind="error" title={copy.error} body={copy.errorBody} />
          ) : null}
          <p
            role="status"
            id="terms-missing"
            className={cn(
              "type-caption",
              missing ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {missing ? copy.missing(missing) : copy.ready}
          </p>
          <button
            type="submit"
            aria-disabled={blocked || undefined}
            aria-busy={saving || undefined}
            aria-describedby="terms-missing"
            className={cn(buttonClass("primary"), "w-full")}
          >
            {copy.submit[action]}
          </button>
          <div className="flex flex-col items-center gap-0.5">
            <button
              type="submit"
              form={LATER_FORM}
              aria-describedby="terms-later-note"
              className={cn(
                "inline-flex h-11 items-center px-2 type-label text-foreground underline decoration-muted-foreground underline-offset-3",
                focusRing,
              )}
            >
              {copy.later}
            </button>
            <p
              id="terms-later-note"
              className="text-center type-caption break-keep text-muted-foreground"
            >
              {copy.laterNote}
            </p>
          </div>
        </BottomZone>
      </form>

      {/* 나중에 하기 폼은 동의 폼 밖에 둔다(폼 중첩 금지). 버튼은 form 속성으로 이 폼을 제출한다 */}
      <form id={LATER_FORM} action={SIGN_OUT_ACTION} method="post" hidden>
        <input type="hidden" name="next" value="/today" />
      </form>
    </AuthFrame>
  );
}

/** 프로필을 읽는 동안(페이지 Suspense) 보이는 자리. 레이아웃이 그대로라 화면이 튀지 않는다 */
export function TermsSkeleton() {
  return (
    <AuthFrame aside={null}>
      <div
        role="status"
        aria-busy
        aria-label={copy.loading}
        className="flex flex-col gap-7 pt-4 pb-8 desktop:pt-0"
      >
        <div className="flex flex-col gap-3">
          <span className="h-3 w-40 rounded-full bg-skeleton" />
          <span className="h-8 w-60 rounded-full bg-skeleton" />
          <span className="h-3 w-52 rounded-full bg-skeleton" />
        </div>
        <div className="flex flex-col divide-y divide-border border-y border-border">
          {[0, 1, 2, 3].map((i) => (
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
      </div>
    </AuthFrame>
  );
}
