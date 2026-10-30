"use client";
// 온보딩 화면 (T4.16~T4.21, D-07 B 지도 위 시트 + C "여기까지 하고 시작", DESIGN.md 5장 "온보딩").
// - 모바일: 지도가 위쪽 배경에 남고, 아래 시트(최대 72dvh)가 28 겹쳐 올라온다. 하단 줄은 시트 아래 고정.
//   검색창은 엄지가 닿는 시트 안에 둔다(지도 위에 띄우지 않음, D-07 후속 메모). 핀 안내도 지도 위 말풍선 대신 시트에 둔다.
// - 데스크톱(1024 이상): 왼쪽 460 패널 + 오른쪽 지도. 홈 D1의 좌 리스트 + 우 지도 자리와 같다.
// - 완료하면 저장 뒤 곧바로 첫 추천(next, 기본 /today)으로 간다(ONB-05, T4.21). 완료 화면은 따로 두지 않는다.
// - 모션은 CSS(onboarding.css)뿐이다. Motion(LazyMotion)을 쓰지 않는다.
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing } from "@/components/ui/interaction";
import { Skeleton } from "@/components/ui/skeleton";
import { onboardingCopy } from "@/copy/onboarding";
import { track } from "@/lib/analytics/track";
import { commonCopy } from "@/copy/common";
import { cn } from "@/lib/utils";
import type { AvoidChoice, Prefs } from "./constants";
import { locateOnce, readGeoPermission } from "./geolocation";
import { OnboardingMap } from "./onboarding-map";
import type {
  FinishOnboardingRequest,
  FinishOnboardingResponse,
} from "./request";
import {
  AvoidFields,
  BudgetFields,
  LocateButton,
  LocationNotes,
  LocationSearch,
  NearbyLine,
  OfflineNote,
  SaveErrorNote,
} from "./steps";
import { useNearbyRestaurants } from "./use-kakao-queries";
import {
  useOnboarding,
  type Onboarding,
  type OnboardingDeps,
} from "./use-onboarding";

const copy = onboardingCopy;

export function OnboardingScreen({
  next,
  initialPrefs,
  initialAvoid,
  submit,
}: {
  next: string;
  initialPrefs: Prefs;
  initialAvoid: AvoidChoice;
  /** 서버 액션(app/welcome/onboarding/actions.ts) */
  submit: (req: FinishOnboardingRequest) => Promise<FinishOnboardingResponse>;
}) {
  const router = useRouter();
  const deps = useMemo<OnboardingDeps>(
    () => ({
      submit,
      locate: () => locateOnce(),
      readPermission: readGeoPermission,
      navigate: (location) => router.replace(location),
      stepCompleted: (step, skipped) =>
        track({
          name: "onboarding_step_completed",
          properties: { step, skipped },
        }),
    }),
    [submit, router],
  );
  const ob = useOnboarding({ next, initialPrefs, initialAvoid, deps });
  const nearby = useNearbyRestaurants(ob.office.pin, ob.step >= 2 && ob.online);
  const needId = useId();
  const locating = ob.step === 1;

  return (
    <div className="@container/screen flex min-h-dvh flex-1 flex-col bg-background font-sans text-foreground">
      <div className="relative flex h-dvh min-h-[36rem] flex-col overflow-hidden desktop:grid desktop:grid-cols-[minmax(0,28.75rem)_minmax(0,1fr)]">
        {/* 지도: 모바일 위쪽, 데스크톱 오른쪽 */}
        <div className="relative min-h-44 flex-1 desktop:order-2 desktop:min-h-0 desktop:border-l desktop:border-border">
          <OnboardingMap
            pin={ob.office.pin}
            interactive={locating && !ob.finishing}
            radiusM={locating ? null : ob.radiusM}
            dots={locating ? [] : (nearby.data?.places ?? [])}
            onPinGesture={ob.placePin}
            registerMover={ob.registerMover}
            corner={
              locating && !ob.locateHidden ? (
                <LocateButton ob={ob} />
              ) : undefined
            }
            className="absolute inset-0"
          />
        </div>

        {/* 시트 */}
        <main
          aria-label={copy.screenLabel}
          className={cn(
            "relative z-20 -mt-7 flex flex-col rounded-t-sheet bg-popover text-popover-foreground shadow-sheet",
            // 3단계는 칩과 직접 입력이 길어 시트를 늘리고 지도는 위에 띠(최소 176)로 남긴다
            ob.step === 3 ? "max-h-[calc(100dvh-11rem)]" : "max-h-[72dvh]",
            "desktop:order-1 desktop:mt-0 desktop:max-h-none desktop:rounded-none desktop:bg-background desktop:shadow-none",
          )}
        >
          <span
            aria-hidden
            className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-border desktop:hidden"
          />
          <p aria-live="polite" className="sr-only">
            {ob.announce}
          </p>
          <SheetHeader ob={ob} />

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-(--lm-layout-gutter) desktop:px-10">
            <div
              key={ob.step}
              className={cn(
                "flex flex-col pt-2 pb-6",
                ob.visited > 0 && "ob-rise",
              )}
            >
              {ob.step === 1 ? (
                <>
                  <StepTitle
                    title={copy.location.title}
                    body={copy.location.body}
                    visited={ob.visited}
                  />
                  <div className="mt-5">
                    <LocationSearch ob={ob} />
                  </div>
                  <div className="mt-5">
                    <LocationNotes ob={ob} />
                  </div>
                </>
              ) : null}

              {ob.step === 2 ? (
                <>
                  <StepTitle
                    title={copy.budget.title}
                    body={copy.budget.body}
                    visited={ob.visited}
                  />
                  <div className="mt-6">
                    <BudgetFields
                      ob={ob}
                      nearby={<NearbyLine ob={ob} nearby={nearby} />}
                    />
                  </div>
                </>
              ) : null}

              {ob.step === 3 ? (
                <>
                  <StepTitle
                    title={copy.avoid.title}
                    body={copy.avoid.body}
                    visited={ob.visited}
                  />
                  <div className="mt-6">
                    <AvoidFields ob={ob} />
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <footer className="flex shrink-0 flex-col gap-3 border-t border-border px-(--lm-layout-gutter) pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] desktop:px-10 desktop:pb-8">
            {!ob.online ? (
              <OfflineNote />
            ) : ob.saveError ? (
              <SaveErrorNote />
            ) : ob.step === 1 && !ob.canSave ? (
              <p
                id={needId}
                className="text-center type-caption text-muted-foreground"
              >
                {copy.location.needPin}
              </p>
            ) : null}
            <PrimaryAction ob={ob} describedBy={needId} />
            {ob.step === 2 ? (
              <button
                type="button"
                onClick={ob.finishNow}
                aria-disabled={ob.finishing || !ob.online || undefined}
                className={cn(
                  "mx-auto -mt-1 inline-flex h-11 items-center px-2 type-label text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50",
                  focusRing,
                )}
              >
                {copy.actions.finishNow}
              </button>
            ) : null}
          </footer>
        </main>
      </div>
    </div>
  );
}

/** 단계 제목(title 세리프) + 설명. 단계가 바뀌면 제목으로 포커스를 옮긴다(첫 화면 제외) */
function StepTitle({
  title,
  body,
  visited,
}: {
  title: string;
  body: string;
  visited: number;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (visited > 0) ref.current?.focus({ preventScroll: true });
  }, [visited]);
  return (
    <div className="flex flex-col gap-2">
      <h1
        ref={ref}
        tabIndex={-1}
        className="type-title text-balance break-keep outline-none"
      >
        {title}
      </h1>
      <p className="type-body-sm break-keep text-muted-foreground">{body}</p>
    </div>
  );
}

/** 단계별 주 버튼 하나(화면의 유일한 primary 면). 막힌 이유는 aria-describedby로 잇는다 */
function PrimaryAction({
  ob,
  describedBy,
}: {
  ob: Onboarding;
  describedBy: string;
}) {
  const step = ob.step;
  const blocked =
    ob.finishing || (step === 1 && !ob.canSave) || (step === 3 && !ob.online);
  const label = ob.finishing
    ? copy.finishing
    : step === 1
      ? copy.actions.save
      : step === 2
        ? copy.actions.next
        : copy.actions.done;
  return (
    <button
      type="button"
      aria-disabled={blocked || undefined}
      aria-describedby={step === 1 && !ob.canSave ? describedBy : undefined}
      aria-busy={ob.finishing || undefined}
      onClick={() => {
        if (blocked) return;
        if (step === 1) ob.saveOffice();
        else ob.primary();
      }}
      className={cn(buttonClass("primary"), "relative w-full overflow-hidden")}
    >
      {ob.finishing ? (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-0.5 bg-primary-foreground/60 motion-safe:animate-pulse"
        />
      ) : null}
      {label}
    </button>
  );
}

/** 시트 머리: 뒤로 + 단계 이름 세 개(지금만 foreground + 밑줄) + 건너뛰기 */
function SheetHeader({ ob }: { ob: Onboarding }) {
  const canSkip = (ob.step === 2 || ob.step === 3) && !ob.finishing;
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 px-(--lm-layout-gutter) desktop:h-20 desktop:items-end desktop:px-10 desktop:pb-2">
      <div className="flex min-w-0 items-center gap-1">
        {ob.step > 1 ? (
          <button
            type="button"
            onClick={ob.back}
            aria-label={commonCopy.actions.back}
            className={cn(
              "-ml-3 flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground",
              focusRing,
            )}
          >
            <ChevronLeft aria-hidden className="size-5" strokeWidth={1.75} />
          </button>
        ) : null}
        <nav aria-label={copy.screenLabel}>
          <ol className="flex items-center gap-4">
            {copy.progress.steps.map((name, idx) => {
              const n = (idx + 1) as 1 | 2 | 3;
              const active = n === ob.step;
              const reachable = n === 1 || ob.canSave;
              return (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => ob.goTo(n)}
                    disabled={!reachable || active || ob.finishing}
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
      </div>
      {canSkip ? (
        <button
          type="button"
          onClick={ob.skip}
          aria-disabled={(ob.step === 3 && !ob.online) || undefined}
          className={cn(
            "-mr-1 inline-flex h-11 shrink-0 items-center px-1 type-label text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50",
            focusRing,
          )}
        >
          {copy.actions.skip}
        </button>
      ) : null}
    </header>
  );
}

/** 라우트 Suspense 대체: 지도 자리와 시트 내용 스켈레톤 */
export function OnboardingSkeleton() {
  return (
    <div className="@container/screen flex min-h-dvh flex-1 flex-col bg-background text-foreground">
      <div
        aria-busy="true"
        className="relative flex h-dvh min-h-[36rem] flex-col overflow-hidden desktop:grid desktop:grid-cols-[minmax(0,28.75rem)_minmax(0,1fr)]"
      >
        <span role="status" className="sr-only">
          {copy.states.loading}
        </span>
        <div className="min-h-44 flex-1 bg-muted desktop:order-2" />
        <div className="relative z-20 -mt-7 flex max-h-[72dvh] flex-col gap-5 rounded-t-sheet bg-popover px-(--lm-layout-gutter) pt-14 pb-8 desktop:order-1 desktop:mt-0 desktop:max-h-none desktop:rounded-none desktop:bg-background desktop:px-10 desktop:pt-24">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-12 w-full rounded-input" />
        </div>
      </div>
    </div>
  );
}
