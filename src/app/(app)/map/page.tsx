// 지도 탭 /map (T5.26~T5.32, D-09, DESIGN.md 5장 "지도", PRD MAP-01~06).
// - 로그인 사용자와 비로그인 둘러보기 모두 들어온다(proxy, T4.8). 저장 값은 요청 시점 값이라 Suspense 안에서 읽는다.
// - 지도 SDK와 카카오 결과는 브라우저가 받는다(지도 탭 진입 시 동적 import, 세션 메모리).
// - 데스크톱 우측 지도 칸은 (app)/@map/map 슬롯 자리이고, 지도 탭 화면이 그 자리로 지도를 포털한다.
// - 디자인 랩이 켜진 개발 환경에서는 ?map=lab으로 목업 지도를 쓴다(실제 지도 키가 없는 포트에서 화면 확인용).
import type { Metadata } from "next";
import { Suspense } from "react";
import { mapCopy } from "@/copy/map";
import { loadMap } from "@/features/map/load-map";
import { MapScreen } from "@/features/map/map-screen";
import { MapScreenSkeleton } from "@/features/map/map-skeleton";
import { isEnabled } from "@/lib/flags";

export const metadata: Metadata = { title: mapCopy.metaTitle };

type SearchParams = Record<string, string | string[] | undefined>;

async function MapTab({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const data = await loadMap(params);
  const lab = isEnabled("designLab") && params.map === "lab";
  return <MapScreen data={data} providerKind={lab ? "lab" : "naver"} />;
}

export default function Page(props: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<MapScreenSkeleton />}>
      <MapTab searchParams={props.searchParams} />
    </Suspense>
  );
}
