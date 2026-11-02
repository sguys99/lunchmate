// 투표 탭 /poll (T7.21, POLL-10). 진행 중과 지난 투표 목록은 브라우저가 TanStack Query로 받는다(만들기 뒤 무효화).
// 로그인 필요 경로(proxy, T4.8). 투표 진입점(flags.pollEntry, 프로덕션은 2026-11-02 T9.2 공개)이 꺼지면 "곧 열립니다" 안내로 돌아간다.
import type { Metadata } from "next";
import { PageColumn } from "@/components/app-shell";
import { pollCreateCopy } from "@/copy/poll-create";
import { PollTab } from "@/features/poll/tab/poll-tab";
import { isEnabled } from "@/lib/flags";
import { ComingSoon } from "../coming-soon";

export const metadata: Metadata = { title: pollCreateCopy.tab.title };

export default function Page() {
  if (!isEnabled("pollEntry")) return <ComingSoon kind="poll" />;
  return (
    <PageColumn>
      <PollTab />
    </PageColumn>
  );
}
