// 못 먹는 음식 /me/avoid (T4.24, SET-03). 화면은 features/me/avoid-form.tsx(온보딩 3단계 칩 재사용).
// 로그인 필요(proxy), flags.auth가 꺼지면 404. 본인 규칙만 읽는다(RLS, 남의 avoid_rules는 어떤 경로로도 읽지 않음).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageColumn, PageHeader } from "@/components/app-shell";
import { ErrorState } from "@/components/states";
import { meCopy } from "@/copy/me";
import { AvoidForm } from "@/features/me/avoid-form";
import { loadAvoid, requireMeSession } from "@/features/me/load";
import { SettingsLead, SettingsSkeleton } from "@/features/me/parts";
import { isEnabled } from "@/lib/flags";
import { saveAvoidAction } from "../actions";

const copy = meCopy.avoid;
export const metadata: Metadata = { title: copy.metaTitle };

async function Route() {
  const session = await requireMeSession("/me/avoid");
  const avoid = await loadAvoid(session);
  if (!avoid) {
    return (
      <ErrorState
        className="mt-10"
        title={meCopy.states.loadError.title}
        body={meCopy.states.loadError.body}
        action={{ href: "/me/avoid" }}
      />
    );
  }
  return <AvoidForm initial={avoid} submit={saveAvoidAction} />;
}

export default function Page() {
  if (!isEnabled("auth")) notFound();
  return (
    <PageColumn>
      <PageHeader title={copy.title} backHref="/me" />
      <SettingsLead>{copy.body}</SettingsLead>
      <Suspense
        fallback={<SettingsSkeleton label={meCopy.loading} sections={2} />}
      >
        <Route />
      </Suspense>
    </PageColumn>
  );
}
