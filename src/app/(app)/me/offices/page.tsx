// 사무실 /me/offices (T4.23, SET-01). 화면은 features/me/office-list.tsx, 추가는 /me/offices/new(지도).
// 로그인 필요(proxy), flags.auth가 꺼지면 404. 기본 사무실 결정은 features/me/offices.ts 주석.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageColumn, PageHeader } from "@/components/app-shell";
import { ErrorState } from "@/components/states";
import { meCopy } from "@/copy/me";
import { loadOffices, requireMeSession } from "@/features/me/load";
import { OfficeList } from "@/features/me/office-list";
import { SettingsLead, SettingsSkeleton } from "@/features/me/parts";
import { isEnabled } from "@/lib/flags";
import {
  deleteOfficeAction,
  renameOfficeAction,
  setDefaultOfficeAction,
} from "../actions";

const copy = meCopy.offices;
export const metadata: Metadata = { title: copy.metaTitle };

async function Route() {
  const session = await requireMeSession("/me/offices");
  const offices = await loadOffices(session);
  if (!offices) {
    return (
      <ErrorState
        className="mt-10"
        title={meCopy.states.loadError.title}
        body={meCopy.states.loadError.body}
        action={{ href: "/me/offices" }}
      />
    );
  }
  return (
    <OfficeList
      offices={offices}
      actions={{
        rename: renameOfficeAction,
        makeDefault: setDefaultOfficeAction,
        remove: deleteOfficeAction,
      }}
    />
  );
}

export default function Page() {
  if (!isEnabled("auth")) notFound();
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
