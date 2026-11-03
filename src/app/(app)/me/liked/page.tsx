// 좋아하는 음식 /me/liked (T9.17, SET-06, D-39). 화면은 features/me/liked-form.tsx.
// 로그인 필요(proxy), flags.auth가 꺼지면 "곧 열립니다" 안내(coming-soon.tsx).
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageColumn, PageHeader } from "@/components/app-shell";
import { ErrorState } from "@/components/states";
import { meCopy } from "@/copy/me";
import { LikedForm } from "@/features/me/liked-form";
import { loadPreferences, requireMeSession } from "@/features/me/load";
import { SettingsLead, SettingsSkeleton } from "@/features/me/parts";
import { isLikedCategory } from "@/features/onboarding/constants";
import { isEnabled } from "@/lib/flags";
import { saveLikedAction } from "../actions";
import { ComingSoon } from "../../coming-soon";

const copy = meCopy.liked;
export const metadata: Metadata = { title: copy.metaTitle };

async function Route() {
  const session = await requireMeSession("/me/liked");
  const prefs = await loadPreferences(session);
  if (!prefs) {
    return (
      <ErrorState
        className="mt-10"
        title={meCopy.states.loadError.title}
        body={meCopy.states.loadError.body}
        action={{ href: "/me/liked" }}
      />
    );
  }
  return (
    <LikedForm
      initial={prefs.liked.filter(isLikedCategory)}
      submit={saveLikedAction}
    />
  );
}

export default function Page() {
  if (!isEnabled("auth")) return <ComingSoon kind="me" />;
  return (
    <PageColumn>
      <PageHeader title={copy.title} backHref="/me/settings" />
      <SettingsLead>{copy.body}</SettingsLead>
      <Suspense
        fallback={<SettingsSkeleton label={meCopy.loading} sections={1} />}
      >
        <Route />
      </Suspense>
    </PageColumn>
  );
}
