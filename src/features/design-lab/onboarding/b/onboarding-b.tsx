"use client";
// 온보딩 시안 B "지도 위 시트" (T4.1).
// 의도: 위치가 모든 추천의 기준이라는 것을 끝까지 보여 준다. 지도는 처음부터 끝까지 배경에 남고, 아래 시트만 단계마다 바뀐다.
// - 1단계: 지도를 끌어 가운데 고정 핀을 회사 입구에 맞춘다(지도 앱의 익숙한 방식). 끄는 동안 핀이 6px 들렸다가 내려앉는다.
//          검색과 현위치는 지도만 옮기고 핀을 비운다. 사용자가 한 번 움직여 맞춰야 저장된다(AC-ONB-3).
// - 2단계: 걷는 거리 슬라이더를 움직이면 핀 둘레 원이 커지고 원 안 식당 점이 올리브로 바뀐다. 원이 화면을 넘으면 지도가 물러난다.
// - 3단계: 시트가 길어져(최대 화면 72%) 칩을 보여 주고 지도는 위에 띠로 남는다.
// - 진행 표시: 시트 머리의 단계 이름 세 개(지금 단계만 글자 foreground + 1px 밑줄, 홈 끼니 토글과 같은 말투).
// - 단계 전환: 시트 내용이 8px 아래에서 slow 300으로 떠오른다(CSS). 지도 원과 축척은 base 260.
// - 데스크톱: 왼쪽 460 패널(시트 내용) + 오른쪽 지도(앱 데스크톱 2단과 같은 자리).
import { useId } from "react";
import { focusRing } from "@/components/ui/interaction";
import { onboardingLabCopy } from "@/copy/design-lab-onboarding";
import { cn } from "@/lib/utils";
import { DoneView } from "../shared/done-view";
import {
  AvoidFields,
  BudgetFields,
  LocateButton,
  LocationSearch,
  NearbyLine,
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

export function OnboardingB({ params }: { params: OnboardingParams }) {
  const ob = useOnboarding(params, "center");
  const needId = useId();
  const keysId = useId();
  const locating = ob.step === 1;
  const done = ob.step === "done";

  return (
    <div className="relative flex h-dvh min-h-[40rem] flex-col overflow-hidden desktop:grid desktop:grid-cols-[minmax(0,28.75rem)_minmax(0,1fr)]">
      {/* 지도: 모바일 위쪽 전체, 데스크톱 오른쪽 */}
      <section
        aria-label={copy.location.mapLabel}
        className="relative min-h-44 flex-1 desktop:order-2 desktop:min-h-0 desktop:border-l desktop:border-border"
      >
        <p id={keysId} className="sr-only">
          {copy.location.mapKeysHint}
        </p>
        <MockMap
          mode="center"
          center={ob.office.center}
          pin={ob.office.pin}
          glide={ob.glide || !locating}
          onPan={ob.pan}
          onPlace={ob.place}
          interactive={locating && !ob.offline && !ob.loading}
          describedBy={keysId}
          radiusPx={locating ? null : ob.radiusPx}
          showDots={!locating && ob.params.state !== "empty"}
          zoom={locating ? 1 : "fit"}
          status={
            ob.loading && locating
              ? "loading"
              : ob.offline && locating
                ? "offline"
                : "ready"
          }
          hint={
            locating
              ? ob.office.pin
                ? copy.location.pinPlacedCenter
                : copy.location.pinHintCenter
              : undefined
          }
          corner={locating ? <LocateButton ob={ob} /> : undefined}
          className="absolute inset-0 rounded-none border-0"
          hintClassName="top-[4.5rem] desktop:top-6 desktop:left-6"
          cornerClassName="bottom-11 desktop:right-6 desktop:bottom-6"
        />
        {/* 모바일 검색은 지도 위에 띄운다(지도 앱의 익숙한 자리). 데스크톱은 패널 안 */}
        {locating ? (
          <div className="absolute inset-x-3 top-3 z-10 desktop:hidden">
            <LocationSearch ob={ob} />
          </div>
        ) : null}
      </section>

      {/* 시트(main 랜드마크) */}
      <main
        aria-label={copy.screenLabel}
        className={cn(
          "relative z-20 -mt-7 flex flex-col rounded-t-sheet bg-popover text-popover-foreground shadow-sheet",
          done ? "max-h-[88dvh]" : "max-h-[72dvh]",
          "desktop:order-1 desktop:mt-0 desktop:max-h-none desktop:rounded-none desktop:bg-background desktop:shadow-none",
        )}
      >
        <span
          aria-hidden
          className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-border desktop:hidden"
        />
        <Announcer text={ob.announce} />
        <SheetHeader ob={ob} />

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-(--lm-layout-gutter) desktop:px-10">
          <div
            key={String(ob.step)}
            className={cn(
              "flex flex-col pt-2 pb-5",
              ob.visited > 0 && "ob-rise",
            )}
          >
            {done ? (
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
                <LocationSearch ob={ob} className="mt-6 hidden desktop:block" />
                {ob.permNotice ? <PermDeniedNote className="mt-5" /> : null}
                <PinPolicyNote className="mt-5" />
              </>
            ) : null}

            {ob.step === 2 ? (
              <>
                <StepTitle
                  title={copy.budget.titleShort}
                  body={copy.budget.body}
                  focusKey={ob.step}
                  visited={ob.visited}
                />
                <BudgetFields ob={ob} variant="compact" className="mt-6" />
                <NearbyLine ob={ob} className="mt-4" />
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
                <AvoidFields ob={ob} className="mt-6" headingLevel="h2" />
              </>
            ) : null}
          </div>
        </div>

        {!done ? (
          <footer className="flex shrink-0 flex-col gap-3 border-t border-border px-(--lm-layout-gutter) pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] desktop:px-10 desktop:pb-8">
            {ob.offline ? (
              <OfflineNote />
            ) : ob.saveError ? (
              <SaveErrorNote />
            ) : ob.step === 1 && !ob.office.pin ? (
              <NeedPinNote id={needId} className="text-center" />
            ) : null}
            <PrimaryAction ob={ob} describedBy={needId} />
          </footer>
        ) : null}
      </main>
    </div>
  );
}

/** 시트 머리: 단계 이름 세 개(지금만 foreground + 밑줄) + 건너뛰기 */
function SheetHeader({ ob }: { ob: Onboarding }) {
  const current = ob.step === "done" ? 4 : ob.step;
  const canSkip = ob.step === 2 || ob.step === 3;
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 px-(--lm-layout-gutter) desktop:h-20 desktop:items-end desktop:px-10 desktop:pb-2">
      <nav aria-label={copy.screenLabel}>
        <ol className="flex items-center gap-4">
          {copy.progress.steps.map((name, idx) => {
            const n = idx + 1;
            const active = n === current;
            const reachable = n === 1 || ob.office.pin !== null;
            return (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => ob.goTo(n as 1 | 2 | 3)}
                  disabled={!reachable || active}
                  aria-current={active ? "step" : undefined}
                  aria-label={`${copy.progress.label(n)}, ${name}`}
                  className={cn(
                    "relative inline-flex h-11 items-center type-caption whitespace-nowrap disabled:cursor-default",
                    active
                      ? "text-foreground underline decoration-1 underline-offset-[6px]"
                      : "text-muted-foreground enabled:hover:text-foreground",
                    focusRing,
                  )}
                >
                  {name}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      {canSkip ? <SkipButton ob={ob} className="-mr-1" /> : null}
    </header>
  );
}
