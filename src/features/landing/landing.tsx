// 랜딩(/) 화면 (T4.28, G3 선택안 B "바로 해 보는 데모", design-decisions D-06, 규칙 정본 DESIGN.md 5장 "랜딩").
// 서버 컴포넌트: 머리와 가치 제안은 서버 HTML로 그리고, 데모(다시 뽑기)와 행동 칸(오프라인, 인앱, 로그인 폼)만 클라이언트다.
// 첫 로드에 Motion, Base UI, sonner, supabase-js를 싣지 않는다(/ 첫 로드 JS 예산 200KB, CLAUDE.md 13장).
// design-lab 확인 화면(/design-lab/landing/b)도 이 컴포넌트를 preview 상태와 함께 그린다.
import { cn } from "@/lib/utils";
import { focusRing } from "@/components/ui/interaction";
import { landingCopy } from "@/copy/landing";
import type { InApp } from "@/lib/inapp";
import { LandingActions } from "./actions";
import { DemoSection } from "./demo-section";
import { LANDING_LOGIN_ANCHOR } from "./paths";
import "./landing.css";

const copy = landingCopy;

const headerLinkClass = cn(
  "inline-flex h-11 min-w-11 items-center justify-center type-label underline decoration-muted-foreground underline-offset-3 hover:decoration-foreground desktop:hidden",
  focusRing,
);

export type LandingPreview = {
  loading?: boolean;
  offline?: boolean;
  inApp?: InApp | null;
};

export function Landing({
  appEnabled,
  authEnabled,
  preview,
}: {
  appEnabled: boolean;
  authEnabled: boolean;
  /** design-lab 확인 화면에서만 넘긴다 */
  preview?: LandingPreview;
}) {
  return (
    <div className="@container/screen relative isolate flex min-h-dvh flex-1 flex-col bg-background font-sans text-foreground">
      <main
        aria-label={copy.homeLabel}
        className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-6 pb-10 desktop:max-w-[72rem] desktop:px-16 desktop:pt-10"
      >
        {/* 모바일은 데모가 첫 화면을 차지해 로그인 버튼이 둘째 화면으로 내려간다. 머리에 바로가기 링크를 둔다(데스크톱은 숨김, T3.5) */}
        <header className="-my-3 flex min-h-11 items-center justify-between">
          {/* 세리프는 22px 이상에만 쓰므로(DESIGN.md 9장) 워드마크는 label 산세리프 */}
          <span className="type-label tracking-[-0.01em]">{copy.brand}</span>
          {authEnabled ? (
            <a href={`#${LANDING_LOGIN_ANCHOR}`} className={headerLinkClass}>
              {copy.loginShortcut}
            </a>
          ) : null}
        </header>

        <div className="flex flex-1 flex-col gap-10 pt-10 desktop:grid desktop:grid-cols-[minmax(0,26rem)_minmax(0,30rem)] desktop:items-center desktop:justify-between desktop:gap-20 desktop:pt-0">
          {/* 왼쪽(모바일 위): 가치 제안과 행동 */}
          <div className="contents desktop:flex desktop:flex-col desktop:gap-10">
            <section className="order-1 flex flex-col gap-4">
              <p className="type-caption text-muted-foreground">
                {copy.hero.eyebrow}
              </p>
              <h1 className="type-title break-keep desktop:type-display">
                {copy.hero.headline}
              </h1>
              <p className="type-body-sm break-keep text-muted-foreground">
                {copy.hero.body}
              </p>
            </section>

            <LandingActions
              appEnabled={appEnabled}
              authEnabled={authEnabled}
              preview={preview}
              className="order-3"
            />
          </div>

          {/* 오른쪽(모바일 가운데): 데모 */}
          <DemoSection loading={preview?.loading} className="order-2" />
        </div>
      </main>
    </div>
  );
}
