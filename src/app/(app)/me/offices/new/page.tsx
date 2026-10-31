// 사무실 추가 /me/offices/new (T4.23, SET-01). 화면은 features/me/office-new-screen.tsx(온보딩 1단계 지도와 같은 핀 규칙).
// 로그인 필요(proxy), flags.auth가 꺼지면 "곧 열립니다" 안내(coming-soon.tsx). 이미 5곳이면 목록으로 돌려보낸다.
// 지도 SDK는 이 화면에 들어올 때만 동적으로 불러온다(OnboardingMap).
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageColumn, PageHeader } from "@/components/app-shell";
import { ErrorState } from "@/components/states";
import { meCopy } from "@/copy/me";
import { loadOffices, requireMeSession } from "@/features/me/load";
import { OfficeNewScreen } from "@/features/me/office-new-screen";
import { canAddOffice } from "@/features/me/offices";
import { OnboardingSkeleton } from "@/features/onboarding/onboarding-screen";
import { isEnabled } from "@/lib/flags";
import { addOfficeAction } from "../../actions";
import "@/features/onboarding/onboarding.css";
import { ComingSoon } from "../../../coming-soon";

const copy = meCopy.officeNew;
const BACK = "/me/offices";
export const metadata: Metadata = { title: copy.metaTitle };

async function Route() {
  const session = await requireMeSession("/me/offices/new");
  const offices = await loadOffices(session);
  if (!offices) {
    return (
      <PageColumn>
        <PageHeader title={copy.title} backHref={BACK} />
        <ErrorState
          className="mt-10"
          title={meCopy.states.loadError.title}
          body={meCopy.states.loadError.body}
          action={{ href: "/me/offices/new" }}
        />
      </PageColumn>
    );
  }
  if (!canAddOffice(offices.length)) redirect(BACK);
  return (
    <OfficeNewScreen
      defaultName={copy.defaultName(offices.length + 1)}
      backHref={BACK}
      submit={addOfficeAction}
    />
  );
}

export default function Page() {
  // 로그인이 꺼진 환경(프로덕션)에서는 404 대신 "곧 열립니다" 안내(5단계 마무리)
  if (!isEnabled("auth")) return <ComingSoon kind="me" />;
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-40">
          <OnboardingSkeleton />
        </div>
      }
    >
      <Route />
    </Suspense>
  );
}
