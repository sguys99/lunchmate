"use client";
// 온보딩 시안 C "답이 쌓이는 한 장" (T4.1).
// 의도: 세 질문과 기본값을 처음부터 한 장에 다 보여 준다. 지금 질문만 펼쳐지고, 답한 질문은 한 줄 요약으로 접혀 위에 쌓인다.
//       위치만 정하면 "여기까지 하고 시작"으로 나머지를 보이는 기본값 그대로 두고 바로 끝낼 수 있다(10초 원칙에 가장 가까움).
// - 진행 표시: 번호 원 세 개(끝난 질문은 체크)와 접힌 요약 줄 자체. 남은 질문도 기본값 요약을 미리 보여 준다.
// - 1단계: 검색 + 지도(누른 자리에 핀, A와 같은 방식). 2단계: 슬라이더 세 개(시트형 머리). 3단계: 칩과 직접 입력.
// - 전환: 접힘과 펼침이 같은 순간에 grid 행 높이로(base 260, standard). 한 번에 움직이는 것은 이 접힘 하나.
// - 데스크톱: 가운데 한 장(최대 640), 주 버튼은 내용 아래.
import { Check } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { focusRing } from "@/components/ui/interaction";
import { onboardingLabCopy } from "@/copy/design-lab-onboarding";
import { formatShortWon } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DoneView } from "../shared/done-view";
import {
  AvoidFields,
  BudgetFields,
  LocateButton,
  LocationSearch,
  NearbyLine,
} from "../shared/fields";
import { Announcer, PrimaryAction, SkipButton } from "../shared/frame";
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

export function OnboardingC({ params }: { params: OnboardingParams }) {
  const ob = useOnboarding(params, "tap");
  const needId = useId();
  const keysId = useId();
  const done = ob.step === "done";

  return (
    <div className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col desktop:max-w-[40rem] desktop:pt-10">
      <Announcer text={ob.announce} />
      <main
        aria-label={copy.screenLabel}
        className="flex flex-1 flex-col px-(--lm-layout-gutter) pt-8 pb-6 desktop:px-0"
      >
        {done ? (
          <DoneView onRestart={ob.restart} animate={ob.visited > 0} />
        ) : (
          <>
            <header className="flex flex-col gap-2">
              <h1 className="type-title text-balance break-keep">
                {copy.c.title}
              </h1>
              <p className="type-body-sm break-keep text-muted-foreground">
                {copy.c.body}
              </p>
            </header>

            <ol aria-label={copy.c.stepsLabel} className="mt-6 flex flex-col">
              <StepRow
                ob={ob}
                n={1}
                summary={
                  ob.office.pin
                    ? copy.summary.officePlaced
                    : copy.summary.officeEmpty
                }
              >
                <LocationSearch ob={ob} className="z-10" />
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
                  className="mt-3 h-52 desktop:h-80"
                />
                <PinPolicyNote className="mt-4" />
              </StepRow>

              <StepRow
                ob={ob}
                n={2}
                summary={copy.summary.budget(
                  formatShortWon(ob.lunch),
                  formatShortWon(ob.dinner),
                  ob.walk,
                )}
              >
                <BudgetFields ob={ob} variant="compact" />
                <NearbyLine ob={ob} className="mt-4" />
              </StepRow>

              <StepRow ob={ob} n={3} summary={avoidSummary(ob)} last>
                <AvoidFields ob={ob} headingLevel="h3" />
              </StepRow>
            </ol>
          </>
        )}
      </main>

      {!done ? (
        <footer className="sticky bottom-0 z-10 flex flex-col gap-2 border-t border-border bg-background px-(--lm-layout-gutter) pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] desktop:px-0">
          {ob.offline ? (
            <OfflineNote className="pb-1" />
          ) : ob.saveError ? (
            <SaveErrorNote className="pb-1" />
          ) : ob.step === 1 && !ob.office.pin ? (
            <NeedPinNote id={needId} className="text-center" />
          ) : null}
          <PrimaryAction ob={ob} describedBy={needId} />
          {ob.step === 2 || ob.step === 3 ? (
            <SkipButton
              ob={{ ...ob, skip: ob.finishWithDefaults }}
              className="self-center"
            >
              {copy.c.finishNow}
            </SkipButton>
          ) : null}
        </footer>
      ) : null}
    </div>
  );
}

function avoidSummary(ob: Onboarding): string {
  const [first] = ob.avoidAll;
  if (!first) return copy.summary.avoidNone;
  if (ob.avoidAll.length === 1) return first;
  return copy.summary.avoidMany(first, ob.avoidAll.length - 1);
}

/**
 * 질문 한 줄. 머리(번호 원 + 이름 + 요약 + 고치기)는 늘 보이고, 내용은 지금 질문일 때만 펼친다.
 * 접힌 내용은 inert로 포커스와 읽기에서 뺀다(접히는 동안에도 화면에는 남아 높이 전환이 보인다).
 */
function StepRow({
  ob,
  n,
  summary,
  last = false,
  children,
}: {
  ob: Onboarding;
  n: 1 | 2 | 3;
  summary: string;
  last?: boolean;
  children: ReactNode;
}) {
  const current = ob.step === "done" ? 4 : ob.step;
  const open = current === n;
  const finished = n < current;
  const upcoming = n > current;
  const name = copy.progress.steps[n - 1] ?? "";
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reachable = n === 1 || ob.office.pin !== null;

  useEffect(() => {
    if (open && ob.visited > 0)
      headingRef.current?.focus({ preventScroll: true });
  }, [open, ob.visited]);

  return (
    <li
      aria-current={open ? "step" : undefined}
      className={cn("flex flex-col", !last && "border-b border-border")}
    >
      <div className="flex items-start gap-4 py-4">
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border type-caption tabular-nums transition-colors duration-(--lm-duration-base) motion-reduce:transition-none",
            open
              ? "border-foreground text-foreground"
              : "border-border text-muted-foreground",
          )}
        >
          {finished ? (
            <Check className="size-3.5 text-primary" strokeWidth={2} />
          ) : (
            n
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className={cn(
              "type-heading break-keep outline-none",
              !open && "text-muted-foreground",
            )}
          >
            <span className="sr-only">{copy.progress.label(n)}, </span>
            {name}
          </h2>
          {!open ? (
            <p className="type-body-sm break-keep text-foreground tabular-nums">
              {summary}
              {upcoming && n !== 1 ? (
                <span className="ml-2 type-caption text-muted-foreground">
                  {copy.budget.defaultMark}
                </span>
              ) : null}
            </p>
          ) : (
            <p className="type-body-sm break-keep text-muted-foreground">
              {n === 1
                ? copy.location.body
                : n === 2
                  ? copy.budget.body
                  : copy.avoid.body}
            </p>
          )}
        </div>
        {!open && reachable && ob.step !== "done" ? (
          <button
            type="button"
            onClick={() => ob.goTo(n)}
            aria-label={copy.summary.editLabel(name)}
            className={cn(
              "-mr-1 inline-flex h-11 shrink-0 items-center px-1 type-label underline decoration-border underline-offset-4 hover:decoration-foreground",
              focusRing,
            )}
          >
            {copy.actions.edit}
          </button>
        ) : null}
      </div>
      <div className="ob-fold" data-open={open}>
        <div inert={!open}>
          <div className="pb-6 desktop:pl-11">{children}</div>
        </div>
      </div>
    </li>
  );
}
