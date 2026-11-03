"use client";
// 취향 설정 시안 공용 조각 (T9.17). 세 안이 같은 온보딩 시트 틀과 같은 홈 목업을 쓰고
// "취향을 어떻게 묻는가"(A 넷째 단계 격자 / B 한 화면 취향표 / C 둘 중 고르기)와 "홈에서 어떻게 다시 부르는가"만 다르다.
//
// - 온보딩 틀은 실제 onboarding-screen.tsx의 뼈대를 옮겼다(위 지도 자리, 아래 시트, 머리 단계 이름과 건너뛰기, 하단 주 버튼 하나).
//   지도는 시안이라 조용한 길 선만 그린다. 데스크톱은 왼쪽 460 패널 + 오른쪽 지도.
// - 홈 목업은 실제 오늘 화면의 큰 카드 + 대안 두 줄. 띠 자리(top, bottom)를 열어 둔다.
// - 모션은 CSS뿐이다(onboarding.css의 ob-rise와 같은 성격). Motion을 쓰지 않는다.
import { ChevronDown, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { CardSkeleton, ListSkeleton } from "@/components/states";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing } from "@/components/ui/interaction";
import { Skeleton } from "@/components/ui/skeleton";
import { tasteLabCopy } from "@/copy/design-lab-taste";
import {
  CategoryCaption,
  NumberGrid,
} from "@/features/design-lab/home/shared/card-bits";
import { MOCK_HOME_TODAY, type DesignState } from "@/features/design-lab/mock";
import { MapLines, StateBlock } from "@/features/design-lab/system/b/parts";
import { CategoryIllustration } from "@/features/place/illustrations";
import { OfflineNote, SaveErrorNote } from "@/features/onboarding/steps";
import { cn } from "@/lib/utils";

export const copy = tasteLabCopy;

/** 취향을 묻는 카테고리. 술집은 점심 추천에서 빠지고(T9.16) 취향보다 자리의 문제라 묻지 않는다 */
export const TASTE_CATEGORIES = [
  "hansik",
  "gukbap",
  "gogi",
  "jungsik",
  "ilsik",
  "yangsik",
  "bunsik",
  "asian",
  "fastfood",
  "salad",
  "cafe",
] as const;
export type TasteCategory = (typeof TASTE_CATEGORIES)[number];

/* ---------- 온보딩 틀 ---------- */

const underlineAction =
  "inline-flex h-11 shrink-0 items-center px-1 type-label text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground active:text-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50";

/**
 * 실제 온보딩 시트 모양. steps는 단계 이름, current는 지금 단계(1부터).
 * footer에는 주 버튼 하나와 보조 줄을 넣는다(포인트 색 면은 화면에 하나).
 */
export function OnboardingFrame({
  steps,
  current,
  state,
  title,
  body,
  children,
  primary,
  secondary,
  canSkip = true,
}: {
  steps: readonly string[];
  current: number;
  state: DesignState;
  title: string;
  body: string;
  children: ReactNode;
  primary: { label: string; onClick?: () => void };
  secondary?: ReactNode;
  canSkip?: boolean;
}) {
  const offline = state === "offline";
  const loading = state === "loading";
  return (
    <div className="@container/screen flex min-h-dvh flex-1 flex-col bg-background font-sans text-foreground">
      <div className="relative flex h-dvh min-h-[36rem] flex-col overflow-hidden desktop:grid desktop:grid-cols-[minmax(0,28.75rem)_minmax(0,1fr)]">
        <div
          role="img"
          aria-label={copy.step.mapLabel}
          className="relative min-h-36 flex-1 bg-muted desktop:order-2 desktop:min-h-0 desktop:border-l desktop:border-border"
        >
          <MapLines />
          <span
            aria-hidden
            className="absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary"
          />
        </div>

        <main
          aria-label={copy.step.screenLabel}
          aria-busy={loading || undefined}
          className="relative z-20 -mt-7 flex max-h-[calc(100dvh-9rem)] flex-col rounded-t-sheet bg-popover text-popover-foreground shadow-sheet desktop:order-1 desktop:mt-0 desktop:max-h-none desktop:rounded-none desktop:bg-background desktop:shadow-none"
        >
          <span
            aria-hidden
            className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-border desktop:hidden"
          />
          <header className="flex h-12 shrink-0 items-center justify-between gap-2 px-(--lm-layout-gutter) desktop:h-20 desktop:items-end desktop:px-10 desktop:pb-2">
            <div className="flex min-w-0 items-center gap-1">
              <button
                type="button"
                aria-label={copy.step.back}
                className={cn(
                  "-ml-3 flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground",
                  focusRing,
                )}
              >
                <ChevronLeft
                  aria-hidden
                  className="size-5"
                  strokeWidth={1.75}
                />
              </button>
              <ol className="flex min-w-0 items-center gap-3 overflow-hidden">
                {steps.map((name, i) => (
                  <li
                    key={name}
                    aria-current={i + 1 === current ? "step" : undefined}
                    className={cn(
                      "inline-flex h-11 items-center type-caption whitespace-nowrap",
                      i + 1 === current
                        ? "text-foreground underline decoration-1 underline-offset-[6px]"
                        : "text-muted-foreground",
                      // 좁은 화면에서 넷째 단계가 넘치면 지난 단계 이름을 줄인다
                      i + 1 < current - 1 && "max-[400px]:hidden",
                    )}
                  >
                    {name}
                  </li>
                ))}
              </ol>
            </div>
            {canSkip ? (
              <button
                type="button"
                aria-disabled={offline || undefined}
                className={cn("-mr-1", underlineAction, focusRing)}
              >
                {copy.step.skip}
              </button>
            ) : null}
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-(--lm-layout-gutter) desktop:px-10">
            {loading ? (
              <div className="flex flex-col gap-4 pt-2 pb-6">
                <span role="status" className="sr-only">
                  {copy.step.loading}
                </span>
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {Array.from({ length: 6 }, (_, i) => (
                    <Skeleton key={i} className="h-24 rounded-card" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="ob-rise flex flex-col pt-2 pb-6">
                <StepTitle title={title} body={body} />
                {children}
              </div>
            )}
          </div>

          <footer className="flex shrink-0 flex-col gap-3 border-t border-border px-(--lm-layout-gutter) pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] desktop:px-10 desktop:pb-8">
            {offline ? (
              <OfflineNote />
            ) : state === "error" ? (
              <SaveErrorNote />
            ) : null}
            <button
              type="button"
              onClick={primary.onClick}
              aria-disabled={offline || loading || undefined}
              className={cn(buttonClass("primary"), "w-full")}
            >
              {primary.label}
            </button>
            {secondary}
          </footer>
        </main>
      </div>
    </div>
  );
}

function StepTitle({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="type-title text-balance break-keep">{title}</h1>
      <p className="type-body-sm break-keep text-muted-foreground">{body}</p>
    </div>
  );
}

/** 주 버튼 아래 밑줄 보조 버튼(여기까지 하고 시작과 같은 모양) */
export function QuietAction({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("mx-auto -mt-1 px-2", underlineAction, focusRing)}
    >
      {children}
    </button>
  );
}

/** 단계 본문 위 안내 한 줄(빈 상태: 근처 식당 종류를 모름) */
export function StepNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-5 flex flex-col gap-1 rounded-input border border-border px-4 py-3">
      <p className="type-label">{title}</p>
      <p className="type-caption text-muted-foreground">{body}</p>
    </div>
  );
}

/** 스크린 리더 알림 한 줄 */
export function Announcer({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.textContent = text;
  }, [text]);
  return <p ref={ref} aria-live="polite" className="sr-only" />;
}

/* ---------- 홈 목업 ---------- */

const PAGE_PAD =
  "mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) desktop:max-w-(--lm-layout-desktop-list-max-width) desktop:px-10";

/**
 * 오늘 화면 뼈대. top은 제목과 큰 카드 사이, bottom은 대안 목록 아래 자리.
 * 띠는 ready와 empty에서만 그린다(오류, 오프라인, 로딩에서 설정을 권하지 않는다).
 */
export function HomeFrame({
  state,
  top,
  bottom,
}: {
  state: DesignState;
  top?: ReactNode;
  bottom?: ReactNode;
}) {
  const [hero, ...alts] = MOCK_HOME_TODAY;
  const showBand = state === "ready" || state === "empty";
  const s = copy.states;
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background text-foreground desktop:grid desktop:grid-cols-[minmax(0,32rem)_minmax(0,1fr)]">
      <div className={cn(PAGE_PAD, "pt-5 pb-10 desktop:pt-12")}>
        <div className="flex items-center justify-between">
          <span className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-4 type-label">
            <MapPin aria-hidden className="size-4" strokeWidth={1.5} />
            {copy.band.place}
            <ChevronDown aria-hidden className="size-4" strokeWidth={1.5} />
          </span>
          <span className="type-caption text-muted-foreground">
            {copy.band.eyebrow}
          </span>
        </div>
        <h1 className="mt-6 type-title text-foreground">{copy.band.title}</h1>
        {showBand && top ? <div className="mt-4">{top}</div> : null}
        {state === "loading" ? (
          <>
            <CardSkeleton className="mt-4" />
            <ListSkeleton className="mt-6" rows={2} />
          </>
        ) : state === "empty" ? (
          <div className="py-8">
            <StateBlock
              kind="empty"
              title={s.homeEmpty.title}
              body={s.homeEmpty.body}
              action={s.homeEmpty.action}
            />
          </div>
        ) : state === "error" || state === "offline" ? (
          <div className="py-10">
            <StateBlock
              kind={state}
              title={
                state === "error" ? s.homeError.title : s.homeOffline.title
              }
              body={state === "error" ? s.homeError.body : s.homeOffline.body}
              action={
                state === "error" ? s.homeError.action : s.homeOffline.action
              }
            />
          </div>
        ) : (
          <>
            <article className="mt-4 flex flex-col gap-5 rounded-card border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-2">
                  <p className="type-caption text-muted-foreground">
                    {copy.band.spot}{" "}
                    {hero ? <CategoryCaption place={hero} /> : null}
                  </p>
                  <h2 className="type-title break-keep">{hero?.name}</h2>
                </div>
                {hero ? (
                  <CategoryIllustration slug={hero.category} size={96} />
                ) : null}
              </div>
              <p className="type-body-sm text-muted-foreground">
                {copy.band.reason}
              </p>
              {hero ? <NumberGrid place={hero} /> : null}
            </article>
            <h2 className="mt-6 type-caption text-muted-foreground">
              {copy.band.others}
            </h2>
            <ul className="mt-2 flex flex-col divide-y divide-border overflow-hidden rounded-card border border-border bg-card">
              {alts.map((p) => (
                <li
                  key={p.id}
                  className="flex min-h-16 items-center gap-4 px-5"
                >
                  <CategoryIllustration slug={p.category} size={40} />
                  <span className="flex-1 type-label">{p.name}</span>
                  <span className="type-numeric-md">
                    {copy.band.walk(p.walkMinutes)}
                  </span>
                  <ChevronRight
                    aria-hidden
                    className="size-4 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
        {showBand && bottom ? <div className="mt-6">{bottom}</div> : null}
      </div>
      <div
        aria-hidden
        className="relative hidden bg-muted desktop:block desktop:border-l desktop:border-border"
      >
        <MapLines />
      </div>
    </div>
  );
}
