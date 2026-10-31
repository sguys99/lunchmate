// 화면 설정 /me/display (T6.13, D-12 안건 5, SET-04, D-04). 화면 모드, 모션 줄이기, 진동. 이 기기에만 저장한다.
// 설정(/me/settings)의 "화면" 줄에서 들어온다. 로그인이 꺼진 환경에서는 /me가 같은 설정을 펼쳐 두므로 여기는 "곧 열립니다" 안내.
import type { Metadata } from "next";
import { PageColumn, PageHeader } from "@/components/app-shell";
import { historyCopy } from "@/copy/history";
import { DisplaySettings } from "@/features/me/display-settings";
import { SettingsLead } from "@/features/me/parts";
import { isEnabled } from "@/lib/flags";
import { ComingSoon } from "../../coming-soon";

const copy = historyCopy.display;
export const metadata: Metadata = { title: copy.metaTitle };

export default function Page() {
  if (!isEnabled("auth")) return <ComingSoon kind="me" />;
  return (
    <PageColumn>
      <PageHeader title={copy.title} backHref="/me/settings" />
      <SettingsLead>{copy.body}</SettingsLead>
      <div className="mt-8">
        <DisplaySettings />
      </div>
    </PageColumn>
  );
}
