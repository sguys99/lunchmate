// 나 탭 첫 화면 /me (T6.13, HIS-01~03, D-12 A 기록 일지 + C 이번 달 숫자). 화면은 features/me/history/me-records.tsx.
// - 로그인 필요 경로(proxy). 서버에서는 본인 값(이름, 기본 사무실 핀, 예산)만 읽고, 기록과 후기는 브라우저가 TanStack Query로 받는다
//   (더 보기, 답하기, 해제가 같은 캐시를 쓰고 쓰기 뒤 무효화된다). 카카오 장소 값은 서버를 거치지 않는다(CLAUDE.md 7장).
// - flags.auth가 꺼진 환경(프로덕션)은 로그인 안내 + 흐린 예시 + 화면 설정(이 기기 저장)을 펼친 화면(D-12 안건 12).
// - 설정은 /me/settings(머리줄 톱니, 기록 탭 맨 아래 줄), 화면 설정은 /me/display(D-12 안건 1, 5).
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageColumn } from "@/components/app-shell";
import { historyCopy } from "@/copy/history";
import { meCopy } from "@/copy/me";
import { MeAuthOff } from "@/features/me/history/auth-off";
import { HistorySkeleton } from "@/features/me/history/history-panel";
import { MeRecords } from "@/features/me/history/me-records";
import { parseMeTab } from "@/features/me/history/model";
import {
  loadOfficePins,
  loadPreferences,
  loadProfile,
  requireMeSession,
} from "@/features/me/load";
import { resolveDefaultOffice } from "@/features/me/offices";
import { PREF_DEFAULTS } from "@/features/onboarding/constants";
import { isEnabled } from "@/lib/flags";

export const metadata: Metadata = { title: meCopy.metaTitle };

type SearchParams = Record<string, string | string[] | undefined>;

async function Records({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireMeSession("/me");
  const [params, profile, offices, prefs] = await Promise.all([
    searchParams,
    loadProfile(session),
    loadOfficePins(session),
    loadPreferences(session),
  ]);
  const office = offices ? resolveDefaultOffice(offices) : null;
  // 이름, 사무실, 예산을 읽지 못해도 기록은 보인다(이름 해석이 세션 메모리만 쓰고, 상세 예산은 기본값)
  return (
    <MeRecords
      nickname={profile?.nickname ?? null}
      office={
        office
          ? {
              name: office.name,
              position: { lat: office.lat, lng: office.lng },
            }
          : null
      }
      budget={{
        lunch: prefs?.lunch ?? PREF_DEFAULTS.lunch,
        dinner: prefs?.dinner ?? PREF_DEFAULTS.dinner,
      }}
      nowIso={new Date().toISOString()}
      initialTab={parseMeTab(params.tab)}
    />
  );
}

function RecordsFallback() {
  return (
    <>
      <header className="flex flex-col gap-2">
        <span aria-hidden className="h-4" />
        <h1 className="type-title break-keep text-foreground">
          {historyCopy.title}
        </h1>
      </header>
      <div className="mt-6 h-12 border-b border-border" />
      <div className="pt-6">
        <HistorySkeleton />
      </div>
    </>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (!isEnabled("auth")) return <MeAuthOff />;
  return (
    <PageColumn>
      <Suspense fallback={<RecordsFallback />}>
        <Records searchParams={searchParams} />
      </Suspense>
    </PageColumn>
  );
}
