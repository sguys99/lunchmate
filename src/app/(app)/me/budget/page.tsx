// 예산과 거리 /me/budget (T4.24, SET-02). 화면은 features/me/budget-form.tsx(온보딩 2단계 슬라이더 재사용).
// 로그인 필요(proxy), flags.auth가 꺼지면 "곧 열립니다" 안내(coming-soon.tsx). 설정은 요청 시점 값이라 Suspense 안에서 읽는다.
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageColumn, PageHeader } from "@/components/app-shell";
import { ErrorState } from "@/components/states";
import { meCopy } from "@/copy/me";
import { BudgetForm } from "@/features/me/budget-form";
import { loadPreferences, requireMeSession } from "@/features/me/load";
import { SettingsLead, SettingsSkeleton } from "@/features/me/parts";
import { isEnabled } from "@/lib/flags";
import { savePrefsAction } from "../actions";
import { ComingSoon } from "../../coming-soon";

const copy = meCopy.budget;
export const metadata: Metadata = { title: copy.metaTitle };

async function Route() {
  const session = await requireMeSession("/me/budget");
  const prefs = await loadPreferences(session);
  if (!prefs) {
    return (
      <ErrorState
        className="mt-10"
        title={meCopy.states.loadError.title}
        body={meCopy.states.loadError.body}
        action={{ href: "/me/budget" }}
      />
    );
  }
  return (
    <BudgetForm
      initial={{ lunch: prefs.lunch, dinner: prefs.dinner, walk: prefs.walk }}
      submit={savePrefsAction}
    />
  );
}

export default function Page() {
  // 로그인이 꺼진 환경(프로덕션)에서는 404 대신 "곧 열립니다" 안내(5단계 마무리)
  if (!isEnabled("auth")) return <ComingSoon kind="me" />;
  return (
    <PageColumn>
      <PageHeader title={copy.title} backHref="/me" />
      <SettingsLead>{copy.body}</SettingsLead>
      <Suspense
        fallback={<SettingsSkeleton label={meCopy.loading} sections={1} />}
      >
        <Route />
      </Suspense>
    </PageColumn>
  );
}
