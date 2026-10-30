"use client";
// 온보딩 시안 A "한 장씩 넘기기" (T4.1).
// 의도: 한 화면에 결정 하나. 위 3칸 진행 막대, 아래 고정 주 버튼 하나로 엄지만으로 끝낸다.
// - 1단계: 검색창 + 큰 지도(누른 자리에 핀). 현위치는 지도 모서리 버튼(중심만 이동). 저장 고지는 지도 바로 아래.
// - 2단계: 숫자 28px 세 개(점심, 저녁, 도보)와 슬라이더. 기본값이면 "기본값" 표시, 도보는 반경과 근처 식당 수로 설명.
// - 3단계: 음식 종류, 알레르기 칩 + 직접 입력.
// - 단계 전환: 앞으로는 오른쪽 16px, 뒤로는 왼쪽 16px에서 slow 300 페이드인(CSS, 한 번에 하나).
// - 데스크톱: 왼쪽 단계 목록(세로) + 오른쪽 같은 한 장. 주 버튼은 내용 아래에 붙는다.
import { Check, ChevronLeft } from "lucide-react";
import { useId } from "react";
import { focusRing, hitArea44 } from "@/components/ui/interaction";
import { onboardingLabCopy } from "@/copy/design-lab-onboarding";
import { cn } from "@/lib/utils";
import { DoneView } from "../shared/done-view";
import {
  AvoidFields,
  BudgetFields,
  LocateButton,
  LocationSearch,
} from "../shared/fields";
import {
  Announcer,
  PrimaryAction,
  SkipButton,
  StepTitle,
} from "../shared/frame";
import { MockMap } from "../shared/mock-map";
import {
  NeedPinNote,
  OfflineNote,
  PermDeniedNote,
  PinPolicyNote,
  SaveErrorNote,
} from "../shared/notes";
import type { OnboardingParams } from "../shared/params";
import { useOnboarding, type Onboarding } from "../shared/use-onboarding";

const copy = onboardingLabCopy;

export function OnboardingA({ params }: { params: OnboardingParams }) {
  const ob = useOnboarding(params, "tap");
  const needId = useId();
  const keysId = useId();
  const current = ob.step === "done" ? 4 : ob.step;

  return (
    <div className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col desktop:grid desktop:max-w-[64rem] desktop:grid-cols-[13rem_minmax(0,30rem)] desktop:justify-center desktop:gap-20 desktop:px-10 desktop:pt-10 desktop:pb-10">
      <Announcer text={ob.announce} />
      <StepRail ob={ob} current={current} />

      <div className="flex min-w-0 flex-1 flex-col">
        <ProgressHeader ob={ob} current={current} />

        <main
          aria-label={copy.screenLabel}
          className="flex flex-1 flex-col px-(--lm-layout-gutter) desktop:px-0"
        >
          <div
            key={String(ob.step)}
            data-dir={ob.visited > 0 ? ob.dir : undefined}
            className="ob-step flex flex-1 flex-col pt-6 pb-6 desktop:pt-6"
          >
            {ob.step === "done" ? (
              <DoneView onRestart={ob.restart} animate={ob.visited > 0} />
            ) : null}

            {ob.step === 1 ? (
              <>
                <StepTitle
                  title={copy.location.title}
                  body={copy.location.body}
                  focusKey={ob.step}
                  visited={ob.visited}
                />
                <LocationSearch ob={ob} className="z-10 mt-7" />
                {ob.permNotice ? <PermDeniedNote className="mt-4" /> : null}
                <p id={keysId} className="sr-only">
                  {copy.location.mapKeysHint}
                </p>
                <MockMap
                  mode="tap"
                  center={ob.office.center}
                  pin={ob.office.pin}
                  glide={ob.glide}
                  onPan={ob.pan}
                  onPlace={ob.place}
                  describedBy={keysId}
                  status={
                    ob.loading ? "loading" : ob.offline ? "offline" : "ready"
                  }
                  hint={
                    ob.office.pin
                      ? copy.location.pinPlaced
                      : copy.location.pinHintTap
                  }
                  corner={<LocateButton ob={ob} />}
                  className="mt-3 min-h-72 flex-1 desktop:min-h-[21rem] desktop:flex-none"
                />
                <PinPolicyNote className="mt-4" />
              </>
            ) : null}

            {ob.step === 2 ? (
              <>
                <StepTitle
                  title={copy.budget.title}
                  body={copy.budget.body}
                  focusKey={ob.step}
                  visited={ob.visited}
                />
                <BudgetFields ob={ob} className="mt-8" />
              </>
            ) : null}

            {ob.step === 3 ? (
              <>
                <StepTitle
                  title={copy.avoid.title}
                  body={copy.avoid.body}
                  focusKey={ob.step}
                  visited={ob.visited}
                />
                <AvoidFields ob={ob} className="mt-8" headingLevel="h2" />
              </>
            ) : null}
          </div>
        </main>

        {ob.step !== "done" ? (
          <footer className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-border bg-background px-(--lm-layout-gutter) pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] desktop:static desktop:border-t-0 desktop:px-0 desktop:pt-2">
            <FooterNotes ob={ob} needId={needId} />
            <PrimaryAction ob={ob} describedBy={needId} />
          </footer>
        ) : null}
      </div>
    </div>
  );
}

function FooterNotes({ ob, needId }: { ob: Onboarding; needId: string }) {
  if (ob.offline) return <OfflineNote />;
  if (ob.saveError) return <SaveErrorNote />;
  if (ob.step === 1 && !ob.office.pin)
    return <NeedPinNote id={needId} className="text-center" />;
  return null;
}

/** 모바일 머리: 이전 | 3칸 진행 막대 + 1/3 | 건너뛰기 */
function ProgressHeader({ ob, current }: { ob: Onboarding; current: number }) {
  const canBack = ob.step === 2 || ob.step === 3;
  const canSkip = ob.step === 2 || ob.step === 3;
  return (
    <header className="flex h-14 items-center gap-3 px-(--lm-layout-gutter) pt-2 desktop:px-0 desktop:pt-0">
      <button
        type="button"
        onClick={ob.back}
        aria-label={copy.actions.back}
        disabled={!canBack}
        className={cn(
          "-ml-2.5 flex size-10 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted disabled:invisible",
          focusRing,
          hitArea44,
        )}
      >
        <ChevronLeft aria-hidden className="size-5" strokeWidth={1.5} />
      </button>
      <div
        role="progressbar"
        aria-label={copy.screenLabel}
        aria-valuemin={1}
        aria-valuemax={3}
        aria-valuenow={Math.min(current, 3)}
        aria-valuetext={copy.progress.label(Math.min(current, 3))}
        className="flex flex-1 items-center gap-1.5"
      >
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            aria-hidden
            className={cn(
              "h-[3px] flex-1 rounded-full transition-colors duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
              i <= current ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </div>
      <span
        aria-hidden
        className="w-8 shrink-0 text-right type-caption text-muted-foreground tabular-nums"
      >
        {copy.progress.count(Math.min(current, 3))}
      </span>
      <div className="flex w-16 shrink-0 justify-end">
        {canSkip ? <SkipButton ob={ob} /> : null}
      </div>
    </header>
  );
}

/** 데스크톱 왼쪽 단계 목록: 번호(끝나면 체크) + 이름. 지금 단계만 foreground와 왼쪽 2px 막대 */
function StepRail({ ob, current }: { ob: Onboarding; current: number }) {
  return (
    <nav
      aria-label={copy.screenLabel}
      className="hidden desktop:flex desktop:flex-col desktop:gap-1 desktop:pt-[5.25rem]"
    >
      <ol className="flex flex-col gap-1">
        {copy.progress.steps.map((name, idx) => {
          const n = idx + 1;
          const done = n < current;
          const active = n === current;
          const reachable = n === 1 || ob.office.pin !== null;
          return (
            <li key={name}>
              <button
                type="button"
                onClick={() => ob.goTo(n as 1 | 2 | 3)}
                disabled={!reachable || active}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "relative flex h-12 w-full items-center gap-3 rounded-md pl-4 text-left type-label disabled:cursor-default",
                  active
                    ? "text-foreground before:absolute before:top-3 before:bottom-3 before:left-0 before:w-0.5 before:rounded-full before:bg-primary"
                    : "text-muted-foreground enabled:hover:text-foreground",
                  focusRing,
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border type-caption tabular-nums",
                    active ? "border-foreground" : "border-border",
                  )}
                >
                  {done ? (
                    <Check className="size-3.5 text-primary" strokeWidth={2} />
                  ) : (
                    n
                  )}
                </span>
                {name}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
