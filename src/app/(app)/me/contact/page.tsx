// 문의하기 /me/contact (T8.6, MOD-07). 설정(/me/settings)의 "문의와 정책" 묶음 첫 줄에서 들어온다.
// 정지 안내와 신고 한도 안내(src/copy/moderation.ts)가 가리키는 "나 탭의 문의하기"가 이 화면이다.
// - 주소는 서버에서 환경변수로 읽어 내려준다(src/lib/contact). 비어 있으면 준비 중 안내.
// - 로그인 필요 경로(/me 아래, proxy). flags.auth가 꺼진 환경(프로덕션)에서는 다른 나 탭 하위 화면처럼 "곧 열립니다".
//   비로그인 사용자는 개인정보 처리방침의 보호책임자 절에서 같은 주소를 본다.
import type { Metadata } from "next";
import { PageColumn, PageHeader } from "@/components/app-shell";
import { meCopy } from "@/copy/me";
import { ContactCard } from "@/features/me/contact-card";
import { SettingsLead } from "@/features/me/parts";
import { contactEmail, contactMailto } from "@/lib/contact";
import { isEnabled } from "@/lib/flags";
import { ComingSoon } from "../../coming-soon";

const copy = meCopy.contact;
export const metadata: Metadata = { title: copy.metaTitle };

export default function Page() {
  if (!isEnabled("auth")) return <ComingSoon kind="me" />;
  const email = contactEmail();
  return (
    <PageColumn>
      <PageHeader title={copy.title} backHref="/me/settings" />
      <SettingsLead>{copy.body}</SettingsLead>
      <ContactCard
        email={email}
        mailto={email ? contactMailto(email, copy.mailSubject) : null}
      />
    </PageColumn>
  );
}
