// 나 탭 설정 /me/settings (T4.27에서 /me 첫 화면이던 것을 T6.13에서 옮김, D-12 안건 1, 5, PRD SET-01~05, AUTH-05).
// 설정(사무실, 예산과 거리, 못 먹는 음식, 요즘 이게 땡겨요, 화면), 계정, 약관과 정책 세 묶음. 들어오는 곳은 /me 머리줄 톱니와 기록 탭 맨 아래 "설정" 줄.
// - 로그인 필요 경로(proxy). flags.auth가 꺼진 환경(프로덕션)에서는 "곧 열립니다" 안내(coming-soon.tsx). 세션과 설정은 요청 시점 값이라 Suspense 안에서 읽는다.
// - 화면 설정(테마, 모션, 진동)은 "화면" 줄 → /me/display. 줄 값은 이 기기 저장소 값이라 클라이언트 조각(DisplaySummary)이 그린다.
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageColumn, PageHeader } from "@/components/app-shell";
import { ErrorState } from "@/components/states";
import { historyCopy } from "@/copy/history";
import { meCopy } from "@/copy/me";
import { cravingStatus, knownCravings } from "@/features/me/craving";
import { DisplaySummary } from "@/features/me/display-summary";
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
import { ComingSoon } from "../../coming-soon";

export const metadata: Metadata = { title: historyCopy.settings.metaTitle };

const rows = meCopy.rows;
const summary = meCopy.summary;

async function Settings() {
  const session = await requireMeSession("/me/settings");
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
        action={{ href: "/me/settings" }}
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
        <SettingsLinkRow
          href="/me/display"
          label={historyCopy.settings.display}
          value={<DisplaySummary />}
        />
      </SettingsSection>

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
  // 로그인이 꺼진 환경(프로덕션)에서는 404 대신 "곧 열립니다" 안내(5단계 마무리). 화면 설정은 /me가 펼쳐 둔다
  if (!isEnabled("auth")) return <ComingSoon kind="me" />;
  return (
    <PageColumn>
      <PageHeader title={historyCopy.settings.title} backHref="/me" />
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
