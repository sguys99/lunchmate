// 오늘(홈) /today (T5.15~T5.25, G3 D1, DESIGN.md 5장 "오늘(홈) 화면").
// - 로그인 사용자와 비로그인 둘러보기 모두 들어온다(proxy). 저장 값과 이어받기 쿼리는 요청 시점 값이라 Suspense 안에서 읽는다.
// - 기다리는 동안은 화면과 같은 자리의 스켈레톤(머리 + 카드 + 행동 줄). 카드 데이터(카카오)는 브라우저가 받는다.
// - 데스크톱 우측 지도는 (app)/@map/today 슬롯이 그린다.
import type { Metadata } from "next";
import { Suspense } from "react";
import { homeCopy } from "@/copy/home";
import { loadToday } from "@/features/rec/load-today";
import { TodayScreen } from "@/features/rec/today-screen";
import { TodaySkeleton } from "@/features/rec/today-skeleton";
import { isEnabled } from "@/lib/flags";
import { KakaoSdkPreload } from "@/lib/kakao/sdk-preload";

export const metadata: Metadata = { title: homeCopy.today.metaTitle };

type SearchParams = Record<string, string | string[] | undefined>;

async function Today({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const data = await loadToday(await searchParams);
  return (
    <>
      {/* 카카오 SDK를 첫 로드 JS와 나란히 받는다(AC-REC-4). 정적 껍데기가 아니라 여기(요청 시점 부분)에 두어
          하단 탭과 링크의 /today 미리 받기(정적 껍데기만)가 다른 화면에서 SDK를 받게 하지 않는다 */}
      <KakaoSdkPreload />
      <TodayScreen
        data={data}
        showEntries={isEnabled("pollEntry")}
        placeMemo={isEnabled("userPlaceMemo")}
      />
    </>
  );
}

export default function Page(props: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<TodaySkeleton />}>
      <Today searchParams={props.searchParams} />
    </Suspense>
  );
}
