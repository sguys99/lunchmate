// 회식 모드 /poll/party (T7.25~T7.28, PARTY-01~05, D-16, DESIGN.md 5장 "회식 모드").
// - 로그인 필요(proxy, features/auth/routes.ts). 하단 탭 "투표" 활성.
// - 사무실 핀, 기피 음식, 다시 안 갈 곳, 방문 기록은 오늘(홈)과 같은 서버 읽기(loadToday)를 쓴다. 카카오 값은 브라우저가 받는다.
// - 플래그: 홈과 상세의 투표 진입점(flags.pollEntry)이 켜질 때(T7.35) 열린다. 그 전에는 디자인 랩이 켜진 환경(개발)에서만 보인다.
// - 데스크톱 우측 지도는 (app)/@map/poll/party 슬롯이 그린다.
// - "N곳으로 투표 만들기"가 여는 투표 만들기 시트 자리는 투표 묶음 레이아웃(poll/layout.tsx)이 한 번만 둔다.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageColumn } from "@/components/app-shell";
import { partyCopy } from "@/copy/party";
import { CandidateSkeletonList } from "@/features/party/parts";
import { PartyScreen } from "@/features/party/party-screen";
import { loadToday } from "@/features/rec/load-today";
import { isEnabled } from "@/lib/flags";

export const metadata: Metadata = { title: partyCopy.metaTitle };

async function Party() {
  const data = await loadToday({});
  return <PartyScreen data={data} />;
}

export default function Page() {
  if (!isEnabled("pollEntry") && !isEnabled("designLab")) notFound();
  return (
    <Suspense
      fallback={
        <PageColumn className="pt-3 desktop:pt-8">
          <p className="sr-only">{partyCopy.states.loading}</p>
          <CandidateSkeletonList />
        </PageColumn>
      }
    >
      <Party />
    </Suspense>
  );
}
