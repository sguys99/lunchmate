// 요즘 이게 땡겨요 /me/craving (T4.26, SET-05). 화면은 features/me/craving-form.tsx.
// 로그인 필요(proxy), flags.auth가 꺼지면 "곧 열립니다" 안내(coming-soon.tsx). 만료 시각은 DB 트리거가 정하고 남은 날은 KST로 센다(craving.ts).
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageColumn, PageHeader } from "@/components/app-shell";
import { ErrorState } from "@/components/states";
import { meCopy } from "@/copy/me";
import { knownCravings } from "@/features/me/craving";
import { CravingForm } from "@/features/me/craving-form";
import { loadPreferences, requireMeSession } from "@/features/me/load";
import { SettingsLead, SettingsSkeleton } from "@/features/me/parts";
import { isEnabled } from "@/lib/flags";
import { saveCravingsAction } from "../actions";
import { ComingSoon } from "../../coming-soon";

const copy = meCopy.craving;
export const metadata: Metadata = { title: copy.metaTitle };

async function Route() {
  const session = await requireMeSession("/me/craving");
  const prefs = await loadPreferences(session);
  if (!prefs) {
    return (
      <ErrorState
        className="mt-10"
        title={meCopy.states.loadError.title}
        body={meCopy.states.loadError.body}
        action={{ href: "/me/craving" }}
      />
    );
  }
  return (
    <CravingForm
      initial={knownCravings(prefs.cravings)}
      initialUntil={prefs.cravingUntil}
      now={new Date().toISOString()}
      submit={saveCravingsAction}
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
