// 나 탭 첫 화면 /me (T4.27, PRD SET-01~05, AUTH-05). 설정, 화면, 계정, 약관과 정책 네 묶음.
// '나' 전용 시안은 6단계 "피드백, 나, 제보"에서 만든다. 지금은 기존 토큰과 컴포넌트만 쓴 뼈대다(parts.tsx).
// - 로그인 필요 경로(proxy). flags.auth가 꺼진 환경(프로덕션)에서는 404. 세션과 설정은 요청 시점 값이라 Suspense 안에서 읽는다.
// - 화면 설정은 이 기기 저장소 값이라 클라이언트 컴포넌트(DisplaySettings)가 그린다.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageColumn, PageHeader } from "@/components/app-shell";
import { ErrorState } from "@/components/states";
import { meCopy } from "@/copy/me";
import { cravingStatus, knownCravings } from "@/features/me/craving";
import { DisplaySettings } from "@/features/me/display-settings";
import {
  loadAvoid,
  loadOffices,
  loadPreferences,
  loadProfile,
  requireMeSession,
} from "@/features/me/load";
import { resolveDefaultOffice } from "@/features/me/offices";
import {
  SettingsLinkRow,
  SettingsSection,
  SettingsSkeleton,
} from "@/features/me/parts";
import { SignOutRow } from "@/features/me/sign-out-row";
import { categoryLabel } from "@/features/place/categories";
import { isEnabled } from "@/lib/flags";
import { formatShortWon } from "@/lib/format";

export const metadata: Metadata = { title: meCopy.metaTitle };

const rows = meCopy.rows;
const summary = meCopy.summary;

async function Settings() {
  const session = await requireMeSession("/me");
  const [profile, offices, prefs, avoid] = await Promise.all([
    loadProfile(session),
    loadOffices(session),
    loadPreferences(session),
    loadAvoid(session),
  ]);
  if (!profile || !offices || !prefs || !avoid) {
    return (
      <ErrorState
        className="mt-10"
        title={meCopy.states.loadError.title}
        body={meCopy.states.loadError.body}
        action={{ href: "/me" }}
      />
    );
  }

  const office = resolveDefaultOffice(offices);
  const cravings = knownCravings(prefs.cravings);
  const craving = cravingStatus(cravings, prefs.cravingUntil, new Date());
  const avoidCount =
    avoid.foods.length + avoid.allergies.length + avoid.custom.length;

  return (
    <div className="mt-8 flex flex-col gap-10">
      <SettingsSection title={meCopy.sections.settings}>
        <SettingsLinkRow
          href="/me/offices"
          label={rows.offices}
          value={
            office
              ? summary.offices(office.name, offices.length)
              : summary.officesNone
          }
        />
        <SettingsLinkRow
          href="/me/budget"
          label={rows.budget}
          value={summary.budget(
            formatShortWon(prefs.lunch),
            formatShortWon(prefs.dinner),
            prefs.walk,
          )}
        />
        <SettingsLinkRow
          href="/me/avoid"
          label={rows.avoid}
          value={avoidCount > 0 ? summary.avoid(avoidCount) : summary.avoidNone}
        />
        <SettingsLinkRow
          href="/me/craving"
          label={rows.craving}
          value={
            craving.kind === "active"
              ? cravings.map(categoryLabel).join(", ")
              : craving.kind === "expired"
                ? summary.cravingExpired
                : summary.cravingNone
          }
        />
      </SettingsSection>

      <DisplaySettings />

      <SettingsSection title={meCopy.sections.account}>
        <SettingsLinkRow
          href="/me/account"
          label={rows.name}
          value={profile.nickname ?? summary.nameNone}
        />
        <SettingsLinkRow href="/me/account" label={rows.account} />
        <SignOutRow />
      </SettingsSection>

      <SettingsSection title={meCopy.sections.legal}>
        <SettingsLinkRow href="/terms" label={rows.terms} external />
        <SettingsLinkRow href="/privacy" label={rows.privacy} external />
      </SettingsSection>
    </div>
  );
}

export default function Page() {
  if (!isEnabled("auth")) notFound();
  return (
    <PageColumn>
      <PageHeader title={meCopy.title} />
      <Suspense
        fallback={
          <SettingsSkeleton label={meCopy.loading} sections={2} rows={4} />
        }
      >
        <Settings />
      </Suspense>
    </PageColumn>
  );
}
